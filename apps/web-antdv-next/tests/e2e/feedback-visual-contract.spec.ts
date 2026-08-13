import type { Locator, Page } from 'playwright/test';

import type {
  FeedbackCycleView,
  QuantRecommendationView,
  QuantReportDetailView,
  QuantReportView,
} from '@vben/types';

import {
  captureVisualMatrix,
  freezeEvidenceClock,
} from './deterministic-visual-matrix';
import {
  CONTROLLED_CANDIDATE_MODEL_ID,
  installFeedbackGovernanceFlow,
  installGlobalReportPresentation,
} from './feedback-governance-flow-harness';
import {
  expect,
  expectAccessible,
  readApiData,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';
import { confirmGovernedAction } from './governed-action-driver';
import { installFeedbackPresentation } from './responsive-a11y-harness';

async function captureFastClosureMatrix(
  page: Page,
  state: string,
  rootSelector: string,
  additionalMasks: Locator[] = [],
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
      ...additionalMasks,
    ],
    rootSelector,
    state: `feedback-fast-${state}`,
  });
}

test('CandidateReady and activation receipt visual contract is fast', async ({
  adminApi,
  authenticatedPage: page,
}) => {
  test.setTimeout(600_000);
  await freezeEvidenceClock(page);
  const cycle = await readFirstApiItem<FeedbackCycleView>(
    adminApi.context,
    '/api/research/feedback-cycles?page=1&size=100',
  );
  const presentation = await installFeedbackPresentation(
    page,
    'candidate_ready',
    cycle.feedback_cycle_id,
    { preserveRuntimeEvidence: true },
  );
  const governance = await installFeedbackGovernanceFlow(page, cycle);
  try {
    await page.goto(
      `/research/feedback?view=cycles&cycle_id=${encodeURIComponent(cycle.feedback_cycle_id)}`,
    );
    await waitForShell(page);
    const workbench = page.getByTestId('feedback-workbench');
    await expect(workbench).toContainText(CONTROLLED_CANDIDATE_MODEL_ID, {
      timeout: 60_000,
    });
    await captureFastClosureMatrix(
      page,
      'candidate-ready',
      '[data-testid="feedback-workbench"]',
    );

    const permitPanel = page.getByTestId('feedback-permit-panel');
    await permitPanel.getByTestId('feedback-issue-permit').click();
    await confirmGovernedAction(page, 'fast visual issue promotion permit');
    const permit = page.getByTestId(
      'feedback-permit-00000000-0000-0000-0000-000000000903',
    );
    await permit
      .getByTestId('feedback-activate-00000000-0000-0000-0000-000000000903')
      .click();
    await confirmGovernedAction(page, 'fast visual activate candidate');
    await expect(page.getByTestId('feedback-activation-receipt')).toBeVisible({
      timeout: 60_000,
    });
    await expectAccessible(page, '[data-testid="feedback-permit-panel"]');
    await captureFastClosureMatrix(
      page,
      'activation-receipt',
      '[data-testid="feedback-workbench"]',
    );
  } finally {
    await Promise.all([governance.cleanup(), presentation()]);
  }
});

test('mixed-Route report and lineage visual contract is fast', async ({
  adminApi,
  authenticatedPage: page,
}) => {
  test.setTimeout(600_000);
  await freezeEvidenceClock(page);
  const source = await readFirstApiItem<QuantReportView>(
    adminApi.context,
    '/api/quant/reports?page=1&size=100',
    (report) => report.published_recommendation_count > 0,
  );
  const [sourceReport, sourceRecommendations] = await Promise.all([
    readApiData<QuantReportDetailView>(
      adminApi.context,
      `/api/quant/reports/${encodeURIComponent(source.recommendation_report_id)}`,
    ),
    readApiData<QuantRecommendationView[]>(
      adminApi.context,
      `/api/quant/reports/${encodeURIComponent(source.recommendation_report_id)}/recommendations`,
    ),
  ]);
  const presentation = await installGlobalReportPresentation(
    page,
    sourceReport,
    sourceRecommendations,
  );
  try {
    await page.goto(`/quant/reports/${presentation.reportId}`);
    await waitForShell(page);
    const workspace = page.getByTestId('report-detail-workspace');
    await expect(workspace).toBeVisible({ timeout: 60_000 });
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
    await captureFastClosureMatrix(
      page,
      'global-report',
      '[data-testid="report-detail-workspace"]',
    );

    await page.getByRole('tab', { name: /Recommendations|推荐/i }).click();
    const recommendations = page.getByTestId('global-report-recommendations');
    await expect(recommendations).toContainText(/Crypto|加密/i);
    await expect(recommendations).toContainText(/Weather|天气/i);
    await page.getByRole('tab', { name: /Overview|概览/i }).click();
    await page.getByTestId('open-route-lineage').first().click();
    const lineage = page.getByTestId('route-lineage-drawer');
    await expect(lineage).toContainText(/ReportRouteRunId/);
    await expectAccessible(page, '[data-testid="route-lineage-drawer"]');
    await captureFastClosureMatrix(
      page,
      'route-lineage',
      '[data-testid="route-lineage-drawer"]',
      [workspace],
    );
  } finally {
    await presentation.cleanup();
  }
});
