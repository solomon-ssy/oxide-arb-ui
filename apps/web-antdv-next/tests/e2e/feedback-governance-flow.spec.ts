import type { APIRequestContext, Locator, Page } from 'playwright/test';

import type {
  FeedbackCycleDetailView,
  FeedbackCycleView,
  FeedbackStage,
  PromotionPermitView,
  QuantRecommendationView,
  QuantReportDetailView,
  QuantReportDiagnosticsView,
  ReportRunView,
} from '@vben/types';
import type {
  CurrentPolicyResourceView,
  ModelRouting,
} from '@vben/types/config-api';

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';

import {
  captureVisualMatrix,
  freezeEvidenceClock,
} from './deterministic-visual-matrix';
import {
  expect,
  expectAccessible,
  readApiData,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';
import {
  confirmGovernedAction,
  openReportGovernance,
} from './governed-action-driver';

const ACTIVATION_FIXTURE = 'feedback-closure';
const RECOVERY_FIXTURE = 'feedback-closure-recovery';
const closureScenario = process.env.PLAYWRIGHT_CLOSURE_SCENARIO ?? 'activation';

type ClosureVisualState =
  | 'activation-receipt'
  | 'candidate-ready'
  | 'global-report'
  | 'rejection-receipt'
  | 'route-lineage';

interface BrowserClosureRouteEvidence {
  execution_exclusion_reason: string;
  execution_learning_excluded_count: number;
  model_learning_eligible_count: number;
  model_version_id: string;
  policy_evaluation_eligible_count: number;
  recommendation_ids: string[];
  route: string;
}

interface BrowserClosureManifest {
  closure: {
    candidate_model_version_id: string;
    feedback_cycle_id: string;
  };
  report_id: string;
  resolution_plane: {
    facts: Array<{ market_id: string; resolution_fact_hash: string }>;
  };
  successor_feedback: {
    parent_cycle_id: string;
    route_cohorts: BrowserClosureRouteEvidence[];
    truth_cutoff: string;
  };
}

interface BrowserClosureFailureManifest {
  error: string;
  feedback_cycle_id: string;
}

interface BrowserReportReadyManifest {
  feedback_cycle_id: string;
  refreshed_at: string;
  snapshot_count: number;
}

interface CandidateClosureManifest {
  closure: { feedback_cycle_id: string };
}

const CLOSURE_STAGES: readonly FeedbackStage[] = [
  'trigger',
  'truth_freeze',
  'coverage',
  'attribution',
  'drift',
  'recipe_plan',
  'dataset_seal',
  'training',
  'calibration',
  'cpcv',
  'validation',
  'comparison',
  'shadow_bind',
  'shadow',
  'decision',
];

function assertCompleteFeedbackDag(detail: FeedbackCycleDetailView) {
  expect(detail.cycle.status).toBe('succeeded');
  expect(detail.cycle.decision).toBe('candidate_ready');
  expect(detail.timeline.length).toBeGreaterThan(0);

  for (const [index, event] of detail.timeline.entries()) {
    expect(event.event_sequence).toBe(index + 1);
    expect(['cancellation_requested', 'cancelled', 'failed']).not.toContain(
      event.event_kind,
    );
  }

  let previousTerminalSequence = 0;
  const jobIds = new Set<string>();
  for (const stage of CLOSURE_STAGES) {
    const events = detail.timeline.filter((event) => event.stage === stage);
    expect(
      events.length,
      `stage ${stage} has no durable events`,
    ).toBeGreaterThan(0);
    const terminalKind = stage === 'trigger' ? 'triggered' : 'succeeded';
    const terminal = events.filter(
      (event) => event.event_kind === terminalKind,
    );
    expect(
      terminal,
      `stage ${stage} must have one terminal event`,
    ).toHaveLength(1);
    const terminalEvent = terminal[0];
    if (!terminalEvent) {
      throw new Error(`stage ${stage} has no terminal event`);
    }
    expect(terminalEvent.event_sequence).toBeGreaterThan(
      previousTerminalSequence,
    );
    previousTerminalSequence = terminalEvent.event_sequence;

    if (stage === 'trigger') {
      expect(events).toHaveLength(1);
      expect(terminalEvent.research_job_id).toBeNull();
      expect(terminalEvent.evidence_uri).toBeNull();
      expect(terminalEvent.evidence_hash).toBeNull();
      continue;
    }

    expect(
      events.filter((event) => event.event_kind === 'job_linked'),
      `stage ${stage} must link exactly one research job`,
    ).toHaveLength(1);
    expect(
      events.some((event) => event.event_kind === 'started'),
      `stage ${stage} must record execution start`,
    ).toBe(true);
    expect(terminalEvent.research_job_id).not.toBeNull();
    expect(terminalEvent.evidence_uri).not.toBeNull();
    expect(terminalEvent.evidence_hash).not.toBeNull();
    const jobId = terminalEvent.research_job_id;
    if (!jobId) {
      throw new Error(`stage ${stage} terminal event has no research job`);
    }
    expect(jobIds.has(jobId), `research job ${jobId} was reused`).toBe(false);
    jobIds.add(jobId);
    expect(
      events.every((event) => event.research_job_id === jobId),
      `stage ${stage} has divergent job lineage`,
    ).toBe(true);
  }
  expect(jobIds.size).toBe(CLOSURE_STAGES.length - 1);
}

async function captureClosureMatrix(
  page: Page,
  state: ClosureVisualState,
  rootSelector: string,
) {
  const root = page.locator(rootSelector);
  await captureVisualMatrix(page, {
    mask: [
      page.locator('[data-screenshot-volatile="true"]'),
      root.locator('.ant-descriptions-item'),
      root.locator('.font-mono'),
      root.locator('dd'),
      root.locator('nav button > span:first-child'),
      root.locator('ol[aria-label] li p.text-xs'),
    ],
    rootSelector,
    state: `feedback-closure-${state}`,
  });
}

async function awaitReportRun(
  context: APIRequestContext,
  reportRunId: string,
): Promise<ReportRunView> {
  let latest: null | ReportRunView = null;
  await expect
    .poll(
      async () => {
        latest = await readApiData<ReportRunView>(
          context,
          `/api/quant/report-runs/${encodeURIComponent(reportRunId)}`,
        );
        if (['abandoned', 'failed', 'skipped'].includes(latest.status)) {
          throw new Error(
            `post-activation report failed closed: ${JSON.stringify(latest)}`,
          );
        }
        return latest.status;
      },
      { timeout: 480_000 },
    )
    .toBe('succeeded');
  if (!latest) {
    throw new Error('post-activation report polling produced no durable row');
  }
  return latest;
}

async function awaitPublishedReport(
  context: APIRequestContext,
  reportId: string,
): Promise<QuantReportDetailView> {
  let latest: null | QuantReportDetailView = null;
  await expect
    .poll(
      async () => {
        latest = await readApiData<QuantReportDetailView>(
          context,
          `/api/quant/reports/${encodeURIComponent(reportId)}`,
        );
        if (
          ['expired', 'obsolete', 'revoked', 'superseded'].includes(
            latest.status,
          )
        ) {
          throw new Error(
            `post-activation report terminated before publication: ${JSON.stringify(latest)}`,
          );
        }
        if (latest.fact_delivery.status === 'failed') {
          throw new Error(
            `post-activation report fact delivery failed: ${JSON.stringify(latest.fact_delivery)}`,
          );
        }
        return latest.status;
      },
      { timeout: 120_000 },
    )
    .toBe('published');
  if (!latest) {
    throw new Error(
      'post-activation report publication produced no durable row',
    );
  }
  return latest;
}

async function readJsonIfExists<T>(filePath: string): Promise<null | T> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function findClosureRun(cycleId: string): Promise<null | string> {
  const root = resolve(process.cwd(), '../target/production-stack');
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  const candidates: Array<{ modifiedAt: number; runDir: string }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const runDir = join(root, entry.name);
    const manifest = await readJsonIfExists<CandidateClosureManifest>(
      join(runDir, 'feedback-candidate-ready-manifest.json'),
    );
    if (manifest?.closure.feedback_cycle_id !== cycleId) {
      continue;
    }
    const metadata = await stat(runDir);
    candidates.push({
      modifiedAt: metadata.mtimeMs,
      runDir,
    });
  }
  candidates.sort((left, right) => right.modifiedAt - left.modifiedAt);
  return candidates[0]?.runDir ?? null;
}

async function awaitBrowserClosure(
  cycleId: string,
  reportId: string,
): Promise<BrowserClosureManifest> {
  let runDir: null | string = null;
  await expect
    .poll(
      async () => {
        runDir = await findClosureRun(cycleId);
        return runDir;
      },
      { timeout: 60_000 },
    )
    .not.toBeNull();
  if (!runDir) {
    throw new Error(`no fresh-stack artifact directory for cycle ${cycleId}`);
  }

  const closurePath = join(runDir, 'feedback-browser-closure-manifest.json');
  const failurePath = join(runDir, 'feedback-browser-closure-error.json');
  await expect
    .poll(
      async () => {
        const failure =
          await readJsonIfExists<BrowserClosureFailureManifest>(failurePath);
        if (failure) {
          throw new Error(
            `fresh-stack N-to-N+1 closure failed: ${failure.error}`,
          );
        }
        const closure =
          await readJsonIfExists<BrowserClosureManifest>(closurePath);
        return closure?.report_id;
      },
      { timeout: 480_000 },
    )
    .toBe(reportId);
  const manifest = await readJsonIfExists<BrowserClosureManifest>(closurePath);
  if (!manifest) {
    throw new Error('N-to-N+1 closure manifest disappeared after completion');
  }
  return manifest;
}

async function awaitBrowserReportReady(
  cycleId: string,
): Promise<BrowserReportReadyManifest> {
  let runDir: null | string = null;
  await expect
    .poll(
      async () => {
        runDir = await findClosureRun(cycleId);
        return runDir;
      },
      { timeout: 60_000 },
    )
    .not.toBeNull();
  if (!runDir) {
    throw new Error(`no fresh-stack artifact directory for cycle ${cycleId}`);
  }
  const readinessPath = join(runDir, 'feedback-browser-report-ready.json');
  let readiness: BrowserReportReadyManifest | null = null;
  await expect
    .poll(
      async () => {
        readiness =
          await readJsonIfExists<BrowserReportReadyManifest>(readinessPath);
        return readiness?.feedback_cycle_id;
      },
      { timeout: 60_000 },
    )
    .toBe(cycleId);
  if (!readiness) {
    throw new Error('browser report readiness manifest disappeared');
  }
  expect(readiness.snapshot_count).toBe(20);
  return readiness;
}

async function runDraftStep(
  page: Page,
  workspace: Locator,
  testId:
    | 'activate-config-draft'
    | 'approve-config-draft'
    | 'validate-config-draft',
  reason: string,
): Promise<void> {
  await workspace.getByTestId(testId).click();
  await confirmGovernedAction(page, reason);
}

async function watchFeedbackAlerts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const history: string[] = [];
    Object.defineProperty(window, '__qpFeedbackAlertHistory', {
      configurable: true,
      value: history,
    });
    const record = () => {
      for (const alert of document.querySelectorAll('[role="alert"]')) {
        const text = alert.textContent?.replaceAll(/\s+/g, ' ').trim();
        if (text && history.at(-1) !== text) {
          history.push(text);
        }
      }
    };
    const observe = () => {
      record();
      new MutationObserver(record).observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observe, { once: true });
    } else {
      observe();
    }
  });
}

function weatherRoute(current: CurrentPolicyResourceView) {
  const revision = current.revision;
  if (
    revision?.document.resource_kind !== 'model_routing' ||
    revision.resource_kind !== 'model_routing'
  ) {
    throw new Error('current model-routing revision is missing');
  }
  const routing: ModelRouting = revision.document.document;
  const route = routing.model?.buy_routes?.weather;
  if (!route) {
    throw new Error('current model-routing revision has no Weather route');
  }
  return route;
}

test('real CandidateReady permit activation receipt and exact rollback', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_PRODUCTION_FIXTURE !== ACTIVATION_FIXTURE ||
      closureScenario !== 'activation',
    'requires the production feedback-closure fixture',
  );
  test.setTimeout(1_200_000);
  await freezeEvidenceClock(page);
  await watchFeedbackAlerts(page);

  const cycle = await readFirstApiItem<FeedbackCycleView>(
    adminApi.context,
    '/api/research/feedback-cycles?page=1&size=100',
    (candidate) =>
      candidate.status === 'succeeded' &&
      candidate.decision === 'candidate_ready',
  );
  const initialDetail = await readApiData<FeedbackCycleDetailView>(
    adminApi.context,
    `/api/research/feedback-cycles/${encodeURIComponent(cycle.feedback_cycle_id)}`,
  );
  assertCompleteFeedbackDag(initialDetail);
  const candidate = initialDetail.candidate_ready;
  if (!candidate) {
    throw new Error('production closure cycle has no CandidateReady evidence');
  }
  const candidateModelId = candidate.route_diff.candidate_model_version_id;
  const championModelId = candidate.route_diff.champion_model_version_id;

  await page.goto(
    `/research/feedback?view=cycles&cycle_id=${encodeURIComponent(cycle.feedback_cycle_id)}`,
  );
  await waitForShell(page);
  const detailSelector = `[aria-labelledby="feedback-cycle-detail-${cycle.feedback_cycle_id}"]`;
  const detail = page.locator(detailSelector);
  // App-shell readiness does not imply that the authoritative REST detail has
  // hydrated. Wait on the deep-linked business identity so a loading skeleton
  // can never be mistaken for a rendered CandidateReady cycle.
  await expect(detail).toContainText(candidateModelId, { timeout: 60_000 });
  await expect(detail).toContainText(/Candidate ready|候选模型已就绪/i);
  await expect(detail).toContainText(candidate.route_diff.shadow_binding_id);
  await expect(page.getByTestId('feedback-trigger-profile')).toContainText(
    cycle.profile_ref.id,
  );

  const permitPanel = page.getByTestId('feedback-permit-panel');
  await expect(permitPanel).toBeVisible();
  await captureClosureMatrix(
    page,
    'candidate-ready',
    '[data-testid="feedback-workbench"]',
  );
  await permitPanel.getByTestId('feedback-issue-permit').click();
  await confirmGovernedAction(
    page,
    'production closure authorize exact route promotion permit',
  );

  const permit = await readFirstApiItem<PromotionPermitView>(
    adminApi.context,
    `/api/research/model-route-activation-permits?page=1&size=100`,
    (item) =>
      item.feedback_cycle_id === cycle.feedback_cycle_id &&
      item.status === 'active',
  );
  expect(permit.candidate_model_version_id).toBe(candidateModelId);
  expect(permit.champion_model_version_id).toBe(championModelId);
  const permitCard = permitPanel.getByTestId(
    `feedback-permit-${permit.promotion_permit_id}`,
  );
  await expect(permitCard).toBeVisible({ timeout: 60_000 });
  await expect(permitCard).toContainText(candidateModelId);
  await permitCard
    .getByTestId(`feedback-activate-${permit.promotion_permit_id}`)
    .click();
  await expect(page.getByTestId('governed-action-modal')).toContainText(
    candidateModelId,
  );
  await confirmGovernedAction(
    page,
    'production closure activate exact candidate route',
  );

  await expect
    .poll(() => new URL(page.url()).searchParams.get('activation_id'), {
      timeout: 60_000,
    })
    .not.toBeNull();
  const activationId = new URL(page.url()).searchParams.get('activation_id');
  if (!activationId) {
    throw new Error('activation deep link was not canonicalized');
  }
  const activatedDetail = await readApiData<FeedbackCycleDetailView>(
    adminApi.context,
    `/api/research/feedback-cycles/${encodeURIComponent(cycle.feedback_cycle_id)}`,
  );
  const receipt = activatedDetail.activation_receipt;
  if (!receipt) {
    throw new Error('activation receipt was not persisted on cycle detail');
  }
  expect(receipt.policy_activation_id).toBe(activationId);
  expect(receipt.activated_model_version_id).toBe(candidateModelId);
  expect(receipt.previous_model_version_id).toBe(championModelId);
  expect(receipt.rollback_target.restored_model_version_id).toBe(
    championModelId,
  );
  expect(receipt.rollback_target.shadow_cleared).toBe(true);
  expect(
    activatedDetail.candidate_ready?.route_diff.shadow_binding_status,
  ).toBe('promoted');

  const receiptCard = permitPanel.getByTestId('feedback-activation-receipt');
  await expect(receiptCard).toBeVisible({ timeout: 60_000 });
  await expect(receiptCard).toContainText(candidateModelId);
  await expect(receiptCard).toContainText(championModelId);
  await page.reload();
  await waitForShell(page);
  await expect(
    page.getByRole('alert').filter({
      hasText:
        /Live feedback is polling|Unable to load cycle detail|反馈实时更新正在轮询|无法加载周期详情/i,
    }),
  ).toHaveCount(0);
  await expect(page.getByTestId('feedback-activation-receipt')).toContainText(
    activationId,
    { timeout: 60_000 },
  );
  await expect(detail).toContainText(candidateModelId);
  const alertHistory = await page.evaluate(
    () =>
      (
        window as Window & {
          __qpFeedbackAlertHistory?: string[];
        }
      ).__qpFeedbackAlertHistory ?? [],
  );
  expect(
    alertHistory.some((text) =>
      /Live feedback is polling|Unable to load cycle detail|反馈实时更新正在轮询|无法加载周期详情/i.test(
        text,
      ),
    ),
  ).toBe(false);
  await expectAccessible(page, '[data-testid="feedback-permit-panel"]');

  await captureClosureMatrix(
    page,
    'activation-receipt',
    '[data-testid="feedback-workbench"]',
  );

  await awaitBrowserReportReady(cycle.feedback_cycle_id);
  await page.goto('/quant/reports');
  await waitForShell(page);
  await openReportGovernance(page, { knowledgeLagSecs: 0, topN: 10 });
  await confirmGovernedAction(
    page,
    'production closure run exact post-activation global portfolio report',
  );
  await expect
    .poll(() => new URL(page.url()).searchParams.get('run_id'), {
      timeout: 60_000,
    })
    .not.toBeNull();
  const reportRunId = new URL(page.url()).searchParams.get('run_id');
  if (!reportRunId) {
    throw new Error('report run deep link was not canonicalized');
  }
  const terminalRun = await awaitReportRun(adminApi.context, reportRunId);
  if (!terminalRun.output_report_id) {
    throw new Error('succeeded report run has no output report');
  }
  const reportId = terminalRun.output_report_id;
  const reportView = await awaitPublishedReport(adminApi.context, reportId);
  const [recommendations, diagnostics] = await Promise.all([
    readApiData<QuantRecommendationView[]>(
      adminApi.context,
      `/api/quant/reports/${encodeURIComponent(reportId)}/recommendations`,
    ),
    readApiData<QuantReportDiagnosticsView>(
      adminApi.context,
      `/api/quant/reports/${encodeURIComponent(reportId)}/diagnostics`,
    ),
  ]);
  expect(reportView.represented_routes.routes).toEqual(['crypto', 'weather']);
  expect(reportView.portfolio_decision.outcome).toBe('optimized');
  if (reportView.portfolio_decision.outcome !== 'optimized') {
    throw new Error('mixed-Route report did not persist an optimized plan');
  }
  const plan = reportView.portfolio_decision.plan;
  expect(plan.solver.backend).toBe('highs');
  expect(plan.solver.optimal).toBe(true);
  expect(plan.solver.deterministic_threads).toBe(1);
  expect(plan.exact_verification.passed).toBe(true);
  expect(plan.selected_tier_ids).toHaveLength(recommendations.length);
  expect(diagnostics.routes.map((route) => route.route)).toEqual([
    'crypto',
    'weather',
  ]);
  expect(diagnostics.routes.every((route) => route.outcome === 'ready')).toBe(
    true,
  );
  expect(recommendations.length).toBeGreaterThanOrEqual(2);
  expect(recommendations.map((item) => item.rank)).toEqual(
    recommendations.map((_, index) => index + 1),
  );
  expect(new Set(recommendations.map((item) => item.route))).toEqual(
    new Set(['crypto', 'weather']),
  );
  for (const recommendation of recommendations) {
    expect(
      Number(recommendation.economics.robust_expected_net_usd),
    ).toBeGreaterThan(0);
    expect(
      Number(recommendation.economics.marginal_portfolio_value_usd),
    ).toBeGreaterThan(0);
  }

  const closureManifest = await awaitBrowserClosure(
    cycle.feedback_cycle_id,
    reportId,
  );
  expect(closureManifest.closure.feedback_cycle_id).toBe(
    cycle.feedback_cycle_id,
  );
  expect(closureManifest.closure.candidate_model_version_id).toBe(
    candidateModelId,
  );
  expect(closureManifest.successor_feedback.parent_cycle_id).toBe(
    cycle.feedback_cycle_id,
  );
  expect(closureManifest.resolution_plane.facts.length).toBeGreaterThanOrEqual(
    recommendations.length,
  );
  expect(
    new Set(
      closureManifest.successor_feedback.route_cohorts.map(
        (cohort) => cohort.route,
      ),
    ),
  ).toEqual(new Set(['crypto', 'weather']));
  for (const cohort of closureManifest.successor_feedback.route_cohorts) {
    expect(cohort.recommendation_ids.length).toBeGreaterThan(0);
    expect(cohort.model_learning_eligible_count).toBe(
      cohort.recommendation_ids.length,
    );
    expect(cohort.policy_evaluation_eligible_count).toBe(
      cohort.recommendation_ids.length,
    );
    expect(cohort.execution_learning_excluded_count).toBe(
      cohort.recommendation_ids.length,
    );
    expect(cohort.execution_exclusion_reason).toBe(
      'report_only_no_execution_authority',
    );
    if (cohort.route === 'weather') {
      expect(cohort.model_version_id).toBe(candidateModelId);
    }
  }

  await page.goto(`/quant/reports/${encodeURIComponent(reportId)}`);
  await waitForShell(page);
  const reportWorkspace = page.getByTestId('report-detail-workspace');
  await expect(reportWorkspace).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('represented-routes')).toContainText(
    /Crypto|加密/i,
  );
  await expect(page.getByTestId('represented-routes')).toContainText(
    /Weather|天气/i,
  );
  await expect(page.getByTestId('portfolio-solver-evidence')).toContainText(
    /highs/i,
  );
  await expect(page.getByTestId('portfolio-solver-evidence')).toContainText(
    /verified|已验证|验证通过|精确复核通过/i,
  );
  await captureClosureMatrix(
    page,
    'global-report',
    '[data-testid="report-detail-workspace"]',
  );

  await page.getByRole('tab', { name: /Recommendations|推荐/i }).click();
  const recommendationTable = page.getByTestId('global-report-recommendations');
  await expect(recommendationTable).toContainText(/Crypto|加密/i);
  await expect(recommendationTable).toContainText(/Weather|天气/i);
  await page.getByRole('tab', { name: /Overview|概览/i }).click();
  await page.getByTestId('open-route-lineage').first().click();
  const routeLineage = page.getByTestId('route-lineage-drawer');
  await expect(routeLineage).toBeVisible();
  await expect(routeLineage).toContainText(/ReportRouteRunId/);
  await expectAccessible(page, '[data-testid="route-lineage-drawer"]');
  await captureClosureMatrix(
    page,
    'route-lineage',
    '[data-testid="route-lineage-drawer"]',
  );

  await page.goto(
    `/research/feedback?view=cycles&cycle_id=${encodeURIComponent(cycle.feedback_cycle_id)}&activation_id=${encodeURIComponent(activationId)}`,
  );
  await waitForShell(page);
  await expect(page.getByTestId('feedback-activation-receipt')).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator(detailSelector)).toContainText(candidateModelId, {
    timeout: 60_000,
  });
  await browserAudit.drainHttp(page);

  await page.getByTestId('feedback-rollback-link').click();
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === '/system/config/model_routing' &&
      url.searchParams.get('activation_id') === activationId &&
      url.searchParams.get('activated_revision_id') ===
        receipt.activated_model_routing_revision_id &&
      url.searchParams.get('rollback_target_revision_id') ===
        receipt.rollback_target.rollback_target_revision_id
    );
  });
  await waitForShell(page);
  const workspace = page.getByTestId('config-resource-workspace');
  const linkedRollback = workspace.getByTestId('linked-model-route-rollback');
  await expect(linkedRollback).toBeVisible({ timeout: 60_000 });
  await expect(linkedRollback).toContainText(activationId);
  await expect(linkedRollback).toContainText(
    receipt.activated_model_routing_revision_id,
  );
  await expect(linkedRollback).toContainText(
    receipt.rollback_target.rollback_target_revision_id,
  );
  await expect(workspace.getByTestId('config-review')).toBeVisible();

  await runDraftStep(
    page,
    workspace,
    'validate-config-draft',
    'production closure validate exact rollback target',
  );
  await expect(workspace.getByTestId('config-validation-result')).toContainText(
    /通过|Passed/i,
  );
  await runDraftStep(
    page,
    workspace,
    'approve-config-draft',
    'production closure approve exact rollback target',
  );
  await runDraftStep(
    page,
    workspace,
    'activate-config-draft',
    'production closure activate exact rollback target',
  );
  await expect(
    workspace.getByTestId('config-activation-success'),
  ).toBeVisible();
  await expectAccessible(page, '[data-testid="config-resource-workspace"]');

  const current = await readApiData<CurrentPolicyResourceView>(
    adminApi.context,
    '/api/config/model_routing/current',
  );
  const restored = weatherRoute(current);
  expect(restored.champion.model_version_id).toBe(championModelId);
  expect(restored.shadow ?? null).toBeNull();
});

test('real CandidateReady governed rejection releases the exact shadow', async ({
  adminApi,
  authenticatedPage: page,
}) => {
  test.skip(
    process.env.PLAYWRIGHT_PRODUCTION_FIXTURE !== RECOVERY_FIXTURE ||
      closureScenario !== 'reject',
    'requires a fresh production feedback-closure fixture',
  );
  test.setTimeout(180_000);
  await freezeEvidenceClock(page);

  const cycle = await readFirstApiItem<FeedbackCycleView>(
    adminApi.context,
    '/api/research/feedback-cycles?page=1&size=100',
    (candidate) =>
      candidate.status === 'succeeded' &&
      candidate.decision === 'candidate_ready',
  );
  const before = await readApiData<FeedbackCycleDetailView>(
    adminApi.context,
    `/api/research/feedback-cycles/${encodeURIComponent(cycle.feedback_cycle_id)}`,
  );
  const candidate = before.candidate_ready;
  if (!candidate) {
    throw new Error('production closure cycle has no rejection candidate');
  }
  const route = candidate.route_diff;

  await page.goto(
    `/research/feedback?view=cycles&cycle_id=${encodeURIComponent(cycle.feedback_cycle_id)}`,
  );
  await waitForShell(page);
  const detailSelector = `[aria-labelledby="feedback-cycle-detail-${cycle.feedback_cycle_id}"]`;
  const detail = page.locator(detailSelector);
  await expect(detail).toContainText(route.shadow_binding_id, {
    timeout: 60_000,
  });
  await expect(page.getByTestId('feedback-trigger-profile')).toContainText(
    cycle.profile_ref.id,
  );
  await page.getByTestId('feedback-shadow-reject').click();
  await expect(page.getByTestId('governed-action-modal')).toContainText(
    route.shadow_binding_id,
  );
  await confirmGovernedAction(
    page,
    'production closure reject exact route-owned shadow',
  );

  await expect
    .poll(
      async () => {
        const detail = await readApiData<FeedbackCycleDetailView>(
          adminApi.context,
          `/api/research/feedback-cycles/${encodeURIComponent(cycle.feedback_cycle_id)}`,
        );
        return detail.candidate_ready?.route_diff.shadow_binding_status;
      },
      { timeout: 60_000 },
    )
    .toBe('rejected');
  await expect(page.getByTestId('feedback-shadow-reject')).toHaveCount(0);

  const current = await readApiData<CurrentPolicyResourceView>(
    adminApi.context,
    '/api/config/model_routing/current',
  );
  const released = weatherRoute(current);
  expect(released.champion.model_version_id).toBe(
    route.champion_model_version_id,
  );
  expect(released.champion.model_version_id).not.toBe(
    route.candidate_model_version_id,
  );
  expect(released.shadow ?? null).toBeNull();
  await expectAccessible(page, detailSelector);
  await captureClosureMatrix(
    page,
    'rejection-receipt',
    '[data-testid="feedback-workbench"]',
  );
});
