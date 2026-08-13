import type { APIResponse, Page, Route } from 'playwright/test';

import type {
  ApiEnvelope,
  DashboardOverviewView,
  FeedbackCandidateReadyView,
  FeedbackCycleDetailView,
  FeedbackCycleView,
  FeedbackDecision,
  FeedbackOverviewView,
  FeedbackSchedulerListView,
  ModelRouteActivationReceiptView,
  Paginated,
  PromotionPermitView,
} from '@vben/types';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const AUTH_ME_ROUTE = /\/api\/auth\/me(?:\?.*)?$/;
const FEEDBACK_CYCLES_ROUTE =
  /\/api\/research\/feedback-cycles(?:\/[^/?]+)?(?:\?.*)?$/;
const FEEDBACK_OVERVIEW_ROUTE = /\/api\/research\/feedback-overview(?:\?.*)?$/;
const DASHBOARD_OVERVIEW_ROUTE = /\/api\/dashboard\/overview(?:\?.*)?$/;
const FEEDBACK_SCHEDULERS_ROUTE =
  /\/api\/research\/feedback-schedulers(?:\?.*)?$/;
const PROMOTION_PERMITS_ROUTE =
  /\/api\/research\/model-route-activation-permits(?:\?.*)?$/;
const CONTROLLED_PRESENTATION_TIME = '2030-01-15T11:55:00.000Z';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

interface HeldResponse {
  response: APIResponse;
  route: Route;
}

export interface ControlledFeedbackSnapshot {
  release: () => Promise<void>;
  ready: Promise<void>;
}

export interface ControlledFeedbackTrigger {
  count: () => number;
  release: () => Promise<number>;
  ready: Promise<void>;
}

export type FeedbackPresentation = 'blocked' | 'empty' | FeedbackDecision;

export async function installDashboardPresentation(
  page: Page,
): Promise<() => Promise<void>> {
  const feedbackHandler = async (route: Route) => {
    await fulfillUpstream<FeedbackOverviewView>(route, (overview) => {
      freezePresentationDateTimes(overview);
      overview.generated_at = CONTROLLED_PRESENTATION_TIME;
      overview.queue = {
        oldest_queued_at: null,
        oldest_running_at: null,
        pending_outbox: 0,
        queued: 0,
        running: 0,
      };
      overview.revision = 17;
      if (overview.readiness !== null) {
        overview.readiness.latency_ready = true;
        overview.readiness.observed_at = CONTROLLED_PRESENTATION_TIME;
        overview.readiness.observed_history_days =
          overview.readiness.required_history_days;
        overview.readiness.retention_ready = true;
      }
      for (const [index, profile] of overview.profiles.entries()) {
        const identityDigit = String(index + 1);
        profile.feedback_policy_hash = `blake3:${identityDigit.repeat(64)}`;
        profile.profile_ref = {
          content_hash: `blake3:${identityDigit.repeat(64)}`,
          id: `00000000-0000-0000-0000-00000000000${identityDigit}`,
          version: 3,
        };
        profile.latest_coverage = null;
        profile.latest_cycle = null;
      }
    });
  };
  const dashboardHandler = async (route: Route) => {
    await fulfillUpstream<DashboardOverviewView>(route, (overview) => {
      freezePresentationDateTimes(overview);
      overview.generated_at = CONTROLLED_PRESENTATION_TIME;
      overview.revision = 'w4-visual-dashboard';
      overview.latest_report = {
        reason_code: 'no_report',
        state: 'unavailable',
      };
      overview.report_lifecycle = {
        observed_at: CONTROLLED_PRESENTATION_TIME,
        state: 'ready',
        value: { counts: {}, total: 0 },
      };
      overview.action_inbox = {
        observed_at: CONTROLLED_PRESENTATION_TIME,
        state: 'ready',
        value: [],
      };
      if (
        overview.authority.state === 'ready' ||
        overview.authority.state === 'stale'
      ) {
        const system = overview.authority.value.system;
        system.checked_at = CONTROLLED_PRESENTATION_TIME;
        system.market_data.last_message_age_ms = 100;
        system.uptime_secs = 3600;
        if (system.catalog.state === 'ready') {
          system.catalog.synced_at = CONTROLLED_PRESENTATION_TIME;
        }
      }
      overview.data_quality = {
        observed_at: CONTROLLED_PRESENTATION_TIME,
        state: 'ready',
        value: {
          acceptable: 1,
          as_of: CONTROLLED_PRESENTATION_TIME,
          degraded: 0,
          fresh: 1,
          ingest_lag_exceeded: false,
          insufficient: 0,
          max_book_age_ms: 5000,
          max_ingest_lag_ms: 1000,
          stale: 0,
          total_tokens: 2,
          worst_book_age_ms: 100,
          worst_ingest_lag_ms: 10,
        },
      };
    });
  };
  await Promise.all([
    page.route(FEEDBACK_OVERVIEW_ROUTE, feedbackHandler),
    page.route(DASHBOARD_OVERVIEW_ROUTE, dashboardHandler),
  ]);
  return async () => {
    await Promise.all([
      page.unroute(FEEDBACK_OVERVIEW_ROUTE, feedbackHandler),
      page.unroute(DASHBOARD_OVERVIEW_ROUTE, dashboardHandler),
    ]);
  };
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function requireData<T>(envelope: ApiEnvelope<T>, route: Route): T {
  if (envelope.code !== 200 || envelope.data === null) {
    throw new TypeError(
      `controlled ${route.request().method()} ${route.request().url()} did not return a success envelope`,
    );
  }
  return envelope.data;
}

async function fulfillUpstream<T>(
  route: Route,
  transform: (data: T) => void,
): Promise<void> {
  const response = await route.fetch();
  const envelope = (await response.json()) as ApiEnvelope<T>;
  transform(requireData(envelope, route));
  await route.fulfill({ json: envelope, response });
}

function terminalReason(decision: FeedbackDecision): string {
  switch (decision) {
    case 'candidate_ready': {
      return 'feedback_candidate_ready_governance_required';
    }
    case 'challenger_rejected': {
      return 'feedback_all_candidates_rejected';
    }
    case 'no_action': {
      return 'feedback_shadow_insufficient_observations';
    }
    case 'promoted': {
      return 'feedback_promotion_committed';
    }
  }
}

function projectDecision(
  cycle: FeedbackCycleView,
  decision: FeedbackDecision,
  preserveRuntimeEvidence = false,
): FeedbackCycleView {
  return {
    ...cycle,
    cancel_requested_at: null,
    completed_at: preserveRuntimeEvidence
      ? (cycle.completed_at ?? CONTROLLED_PRESENTATION_TIME)
      : CONTROLLED_PRESENTATION_TIME,
    created_at: preserveRuntimeEvidence
      ? cycle.created_at
      : CONTROLLED_PRESENTATION_TIME,
    decision,
    generation: 3,
    label_cutoff: CONTROLLED_PRESENTATION_TIME,
    lease_expires_at: null,
    policy_bundle_generation: 6,
    route_generation: 7,
    started_at: preserveRuntimeEvidence
      ? (cycle.started_at ?? CONTROLLED_PRESENTATION_TIME)
      : CONTROLLED_PRESENTATION_TIME,
    status: 'succeeded',
    terminal_reason_code: terminalReason(decision),
    updated_at: preserveRuntimeEvidence
      ? cycle.updated_at
      : CONTROLLED_PRESENTATION_TIME,
  };
}

function freezePresentationDateTimes(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) freezePresentationDateTimes(item);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (typeof child === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(child)) {
      record[key] = CONTROLLED_PRESENTATION_TIME;
      continue;
    }
    freezePresentationDateTimes(child);
  }
}

function candidateScorecard(
  detail: FeedbackCycleDetailView,
): FeedbackCandidateReadyView {
  return {
    attribution: {
      decision_intervention_replay_count: 24,
      execution_outcome_association_count: 1,
      execution_trajectory_count: 12,
      policy_counterfactual_count: 12,
      prediction_explanation_count: 24,
      prior_cycle_use_count: 8,
      produced_set_hash: 'blake3:e2e-attribution-produced',
      resolution_outcome_association_count: 1,
      use_set_hash: 'blake3:e2e-attribution-uses',
    },
    blockers: [],
    comparison: {
      adjusted_p_value: '0.01',
      confidence: '0.95',
      effect_bps: '18.5',
      observation_count: 240,
      simultaneous_lower_bound_bps: '7.2',
    },
    quality_gate: {
      evaluated_at: CONTROLLED_PRESENTATION_TIME,
      gates: [
        {
          class: 'hard',
          detail: 'All point-in-time inputs remained at or before cutoff.',
          gate: 'no_pit_leakage',
          observed: 'true',
          status: 'pass',
          threshold: 'true',
        },
        {
          class: 'hard',
          detail: 'Deflated Sharpe cleared the governed threshold.',
          gate: 'deflated_sharpe',
          observed: '0.91',
          status: 'pass',
          threshold: '0.80',
        },
        {
          class: 'hard',
          detail: 'Probability of backtest overfitting remained below the cap.',
          gate: 'pbo',
          observed: '0.08',
          status: 'pass',
          threshold: '0.20',
        },
        {
          class: 'hard',
          detail: 'Exact explanation proof is bound to the serving contract.',
          gate: 'explainability_required',
          observed: 'verified',
          status: 'pass',
          threshold: 'verified',
        },
      ],
      intent: 'candidate',
      passed: true,
      report_hash: 'blake3:e2e-quality-gate',
    },
    route_diff: {
      candidate_model_version_id: '00000000-0000-0000-0000-000000000902',
      champion_model_version_id: detail.cycle.champion_model_version_id,
      current_policy_generation: detail.cycle.policy_bundle_generation,
      current_route_generation: detail.cycle.route_generation,
      execution_authority_unchanged: true,
      proposed_route_generation: detail.cycle.route_generation + 1,
      route: detail.cycle.route,
      shadow_binding_generation: 1,
      shadow_binding_id: '00000000-0000-0000-0000-000000000901',
      shadow_binding_status: 'active',
      shadow_bound_at: CONTROLLED_PRESENTATION_TIME,
      shadow_lifecycle_generation: 0,
      shadow_terminated_at: null,
      shadow_termination_policy_activation_id: null,
      shadow_termination_reason_code: null,
    },
    shadow: {
      any_hard_divergence: false,
      mean_topn_decision_overlap: '0.93',
      minimum_topn_decision_overlap: '0.85',
      observed: 288,
      served_window_secs: 259_200,
      required: 240,
      required_window_secs: 259_200,
    },
  };
}

function activationReceipt(
  detail: FeedbackCycleDetailView,
): ModelRouteActivationReceiptView {
  const cycle = detail.cycle;
  return {
    activated_by_role: 'super_admin',
    activated_by_user_id: '00000000-0000-0000-0000-000000000920',
    activated_by_username: 'w4-visual-operator',
    activated_model_routing_revision_id: '00000000-0000-0000-0000-000000000921',
    activated_model_version_id: '00000000-0000-0000-0000-000000000902',
    activated_route_generation: cycle.route_generation + 1,
    audit_event_id: '00000000-0000-0000-0000-000000000922',
    execution_authority_unchanged: true,
    feedback_cycle_id: cycle.feedback_cycle_id,
    model_governance_audit_id: '00000000-0000-0000-0000-000000000923',
    outbox_event_id: '00000000-0000-0000-0000-000000000924',
    permit_issued_by_role: 'super_admin',
    permit_issued_by_user_id: '00000000-0000-0000-0000-000000000920',
    permit_issued_by_username: 'w4-visual-operator',
    policy_activation_id: '00000000-0000-0000-0000-000000000925',
    previous_model_version_id: cycle.champion_model_version_id,
    previous_route_generation: cycle.route_generation,
    promotion_permit_id: '00000000-0000-0000-0000-000000000926',
    rollback_target: {
      activated_model_version_id: '00000000-0000-0000-0000-000000000902',
      restored_model_version_id: cycle.champion_model_version_id,
      rollback_target_revision_hash: `blake3:${'9'.repeat(64)}`,
      rollback_target_revision_id: '00000000-0000-0000-0000-000000000927',
      route: cycle.route,
      shadow_cleared: true,
    },
    route: cycle.route,
    server_timestamp: CONTROLLED_PRESENTATION_TIME,
    transaction_hash: `blake3:${'8'.repeat(64)}`,
  };
}

function projectDecisionDetail(
  detail: FeedbackCycleDetailView,
  decision: FeedbackDecision,
  preserveRuntimeEvidence: boolean,
): void {
  const runtimeEvidence = {
    completed_at: detail.cycle.completed_at,
    created_at: detail.cycle.created_at,
    started_at: detail.cycle.started_at,
    updated_at: detail.cycle.updated_at,
  };
  freezePresentationDateTimes(detail);
  const terminal = detail.timeline.at(-1);
  if (terminal === undefined) {
    throw new TypeError('controlled decision detail requires a real timeline');
  }
  detail.cycle = projectDecision(
    { ...detail.cycle, ...runtimeEvidence },
    decision,
    preserveRuntimeEvidence,
  );
  const receipt = decision === 'promoted' ? activationReceipt(detail) : null;
  detail.activation_receipt = receipt;
  detail.candidate_ready =
    decision === 'candidate_ready' || decision === 'promoted'
      ? candidateScorecard(detail)
      : null;
  if (receipt && detail.candidate_ready) {
    detail.candidate_ready.route_diff.shadow_binding_status = 'promoted';
    detail.candidate_ready.route_diff.shadow_termination_policy_activation_id =
      receipt.policy_activation_id;
  }
  // Optional evidence sections legitimately differ between seeded source
  // cycles. The fast visual contract owns one stable CandidateReady shape;
  // complete backend evidence remains covered by the real closure scenario.
  detail.coverage = null;
  detail.drift_reports = [];
  detail.evaluation_uses = [];
  terminal.actor = 'feedback_decision_worker';
  terminal.event_kind = 'succeeded';
  terminal.reason_code = terminalReason(decision);
  terminal.stage = 'decision';
  detail.timeline = [terminal];
  detail.triggers = [];
}

function removeMaterializationRead(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      removeMaterializationRead(item);
    }
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.permission_code === 'materialization:read') {
    record.permission_code = null;
  }
  for (const child of Object.values(record)) {
    removeMaterializationRead(child);
  }
}

/**
 * Keep the real `/auth/me` menu tree while removing the privileged role and the
 * permission code consumed by the Feedback workbench. This is a presentation
 * boundary, not an authorization substitute: server-side RBAC remains covered
 * by W4-E03.
 */
export async function installFeedbackPermissionState(
  page: Page,
): Promise<() => Promise<void>> {
  const handler = async (route: Route) => {
    await fulfillUpstream<Record<string, unknown>>(route, (me) => {
      removeMaterializationRead(me.menus);
      me.roles = [];
    });
  };
  await page.route(AUTH_ME_ROUTE, handler);
  return async () => {
    await page.unroute(AUTH_ME_ROUTE, handler);
  };
}

/**
 * Derive visual-only Feedback states from real upstream bytes. The owner never
 * writes persistence and never claims operational decision evidence; W4-E04
 * remains the canonical real-PostgreSQL decision proof.
 */
export async function installFeedbackPresentation(
  page: Page,
  presentation: FeedbackPresentation,
  cycleId: string,
  options: {
    detailLatencyMs?: number;
    preserveRuntimeEvidence?: boolean;
  } = {},
): Promise<() => Promise<void>> {
  const overviewHandler = async (route: Route) => {
    await fulfillUpstream<FeedbackOverviewView>(route, (overview) => {
      freezePresentationDateTimes(overview);
      overview.generated_at = CONTROLLED_PRESENTATION_TIME;
      overview.queue = {
        oldest_queued_at: null,
        oldest_running_at: null,
        pending_outbox: 0,
        queued: 0,
        running: 0,
      };
      overview.revision = 17;
      if (presentation === 'blocked') {
        overview.readiness = null;
      } else if (overview.readiness !== null) {
        overview.readiness.latency_ready = true;
        overview.readiness.observed_at = CONTROLLED_PRESENTATION_TIME;
        overview.readiness.observed_history_days =
          overview.readiness.required_history_days;
        overview.readiness.retention_ready = true;
      }
      for (const [index, profile] of overview.profiles.entries()) {
        const identityDigit = String(index + 1);
        profile.feedback_policy_hash = `blake3:${identityDigit.repeat(64)}`;
        profile.profile_ref = {
          content_hash: `blake3:${identityDigit.repeat(64)}`,
          id: `00000000-0000-0000-0000-00000000000${identityDigit}`,
          version: 3,
        };
        profile.latest_coverage = null;
        profile.latest_cycle = null;
      }
    });
  };
  const cyclesHandler = async (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/research/feedback-cycles') {
      await fulfillUpstream<Paginated<FeedbackCycleView>>(route, (pageData) => {
        if (presentation === 'empty') {
          pageData.has_next = false;
          pageData.items = [];
          pageData.total = 0;
          return;
        }
        if (presentation === 'blocked') {
          return;
        }
        const target = pageData.items.find(
          (cycle) => cycle.feedback_cycle_id === cycleId,
        );
        if (target === undefined) {
          throw new TypeError(
            `controlled decision list is missing cycle ${cycleId}`,
          );
        }
        pageData.has_next = false;
        pageData.items = [
          projectDecision(
            target,
            presentation,
            options.preserveRuntimeEvidence ?? false,
          ),
        ];
        pageData.page = 1;
        pageData.total = 1;
      });
      return;
    }
    if (presentation === 'blocked' || presentation === 'empty') {
      await route.continue();
      return;
    }
    await delay(options.detailLatencyMs ?? 0);
    await fulfillUpstream<FeedbackCycleDetailView>(route, (detail) => {
      if (detail.cycle.feedback_cycle_id !== cycleId) {
        throw new TypeError(
          `controlled decision detail returned ${detail.cycle.feedback_cycle_id}, expected ${cycleId}`,
        );
      }
      projectDecisionDetail(
        detail,
        presentation,
        options.preserveRuntimeEvidence ?? false,
      );
    });
  };
  const schedulersHandler = async (route: Route) => {
    await fulfillUpstream<FeedbackSchedulerListView>(route, (schedulers) => {
      schedulers.items = [];
      schedulers.observed_at = CONTROLLED_PRESENTATION_TIME;
    });
  };
  const permitsHandler = async (route: Route) => {
    await fulfillUpstream<Paginated<PromotionPermitView>>(route, (permits) => {
      permits.has_next = false;
      permits.items = [];
      permits.page = 1;
      permits.total = 0;
    });
  };
  await Promise.all([
    page.route(FEEDBACK_OVERVIEW_ROUTE, overviewHandler),
    page.route(FEEDBACK_CYCLES_ROUTE, cyclesHandler),
    page.route(FEEDBACK_SCHEDULERS_ROUTE, schedulersHandler),
    page.route(PROMOTION_PERMITS_ROUTE, permitsHandler),
  ]);
  return async () => {
    await Promise.all([
      page.unroute(FEEDBACK_OVERVIEW_ROUTE, overviewHandler),
      page.unroute(FEEDBACK_CYCLES_ROUTE, cyclesHandler),
      page.unroute(FEEDBACK_SCHEDULERS_ROUTE, schedulersHandler),
      page.unroute(PROMOTION_PERMITS_ROUTE, permitsHandler),
    ]);
  };
}

export async function installFeedbackErrorState(
  page: Page,
): Promise<() => Promise<void>> {
  const handler = async (route: Route) => {
    await route.fulfill({
      body: JSON.stringify({
        code: 503,
        data: null,
        message: 'w4_e06_controlled_unavailable',
      }),
      contentType: 'application/json',
      status: 503,
    });
  };
  await Promise.all([
    page.route(FEEDBACK_OVERVIEW_ROUTE, handler),
    page.route(FEEDBACK_CYCLES_ROUTE, handler),
  ]);
  return async () => {
    await Promise.all([
      page.unroute(FEEDBACK_OVERVIEW_ROUTE, handler),
      page.unroute(FEEDBACK_CYCLES_ROUTE, handler),
    ]);
  };
}

export async function holdFeedbackSnapshot(
  page: Page,
): Promise<ControlledFeedbackSnapshot> {
  const held: HeldResponse[] = [];
  const ready = deferred<undefined>();
  const released = deferred<undefined>();
  let didRelease = false;
  const handler = async (route: Route) => {
    const response = await route.fetch();
    held.push({ response, route });
    if (held.length === 2) {
      ready.resolve(undefined);
    }
    await released.promise;
    try {
      await route.fulfill({ response });
    } catch (error) {
      // A viewport matrix deliberately holds these responses while the page
      // remains live. If a later refresh supersedes one held request, Chromium
      // owns its cancellation and Playwright reports the route as handled.
      if (
        !(error instanceof Error) ||
        !error.message.includes('Route is already handled')
      ) {
        throw error;
      }
    }
  };
  await Promise.all([
    page.route(FEEDBACK_OVERVIEW_ROUTE, handler),
    page.route(FEEDBACK_CYCLES_ROUTE, handler),
  ]);
  return {
    async release() {
      if (didRelease) {
        throw new Error('controlled Feedback snapshot was released twice');
      }
      didRelease = true;
      released.resolve(undefined);
      await Promise.all(held.map(({ route }) => route.request().response()));
      await Promise.all([
        page.unroute(FEEDBACK_OVERVIEW_ROUTE, handler),
        page.unroute(FEEDBACK_CYCLES_ROUTE, handler),
      ]);
    },
    ready: ready.promise,
  };
}

export async function holdFeedbackTrigger(
  page: Page,
): Promise<ControlledFeedbackTrigger> {
  const held = deferred<Route>();
  const released = deferred<undefined>();
  let count = 0;
  let didRelease = false;
  const handler = async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    count += 1;
    held.resolve(route);
    await released.promise;
    await route.fulfill({
      contentType: 'application/json',
      json: {
        code: 409,
        data: null,
        message: 'w4_e06_controlled_active_cycle_conflict',
      },
      status: 409,
    });
  };
  await page.route(FEEDBACK_CYCLES_ROUTE, handler);
  return {
    count: () => count,
    async release() {
      if (didRelease) {
        throw new Error('controlled Feedback trigger was released twice');
      }
      didRelease = true;
      const route = await held.promise;
      released.resolve(undefined);
      await route.request().response();
      await page.unroute(FEEDBACK_CYCLES_ROUTE, handler);
      return 409;
    },
    ready: held.promise.then(() => undefined),
  };
}

export async function sha256File(path: string): Promise<{
  bytes: number;
  sha256: string;
}> {
  const bytes = await readFile(path);
  return {
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export function screenshotAggregate(
  rows: readonly { path: string; sha256: string }[],
): string {
  const canonical = rows
    .map(({ path, sha256 }) => `${sha256}  ${path}`)
    .toSorted()
    .join('\n');
  return createHash('sha256').update(`${canonical}\n`).digest('hex');
}
