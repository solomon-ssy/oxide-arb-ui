import type { CurrentPolicyResourceView, FeedbackCycleView } from '@vben/types';

import {
  CONTROLLED_CANDIDATE_MODEL_ID,
  CONTROLLED_PROMOTION_PERMIT_ID,
  CONTROLLED_REPORT_RUN_ID,
  installFeedbackGovernanceFlow,
  installLinkedRollbackPresentation,
  installReportRunFlow,
} from './feedback-governance-flow-harness';
import {
  expect,
  readApiData,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';
import {
  confirmGovernedAction,
  openReportGovernance,
} from './governed-action-driver';
import { installFeedbackPresentation } from './responsive-a11y-harness';

test('CandidateReady governed controls honor the fast UI contract', async ({
  adminApi,
  authenticatedPage: page,
}) => {
  const cycle = await readFirstApiItem<FeedbackCycleView>(
    adminApi.context,
    '/api/research/feedback-cycles?page=1&size=100',
  );
  const currentRouting = await readApiData<CurrentPolicyResourceView>(
    adminApi.context,
    '/api/config/model_routing/current',
  );
  const cleanupPresentation = await installFeedbackPresentation(
    page,
    'candidate_ready',
    cycle.feedback_cycle_id,
    { detailLatencyMs: 750 },
  );
  const governance = await installFeedbackGovernanceFlow(page, cycle);
  let cleanupLinkedRollback: (() => Promise<void>) | null = null;

  try {
    await page.goto(
      `/research/feedback?view=cycles&cycle_id=${encodeURIComponent(cycle.feedback_cycle_id)}`,
    );
    await waitForShell(page);
    const detail = page.locator(
      `[aria-labelledby="feedback-cycle-detail-${cycle.feedback_cycle_id}"]`,
    );
    await expect(detail).toContainText(CONTROLLED_CANDIDATE_MODEL_ID);

    const permitPanel = page.getByTestId('feedback-permit-panel');
    const issue = permitPanel.getByTestId('feedback-issue-permit');
    await expect(issue).toBeEnabled();
    await issue.click();
    await confirmGovernedAction(
      page,
      'fast contract authorize exact route promotion permit',
    );
    expect(governance.issueRequests()).toHaveLength(1);

    const permit = permitPanel.getByTestId(
      `feedback-permit-${CONTROLLED_PROMOTION_PERMIT_ID}`,
    );
    await expect(permit).toContainText(CONTROLLED_CANDIDATE_MODEL_ID);
    await permit
      .getByTestId(`feedback-activate-${CONTROLLED_PROMOTION_PERMIT_ID}`)
      .click();
    await expect(page.getByTestId('governed-action-modal')).toContainText(
      CONTROLLED_CANDIDATE_MODEL_ID,
    );
    await confirmGovernedAction(
      page,
      'fast contract activate exact candidate route',
    );
    expect(governance.activationRequests()).toHaveLength(1);
    await expect(page).toHaveURL((url) => {
      return url.searchParams.get('activation_id') !== null;
    });
    await expect(page.getByTestId('feedback-activation-receipt')).toBeVisible();

    const receipt = governance.activationReceipt();
    if (!receipt) {
      throw new Error('fast contract activation receipt is missing');
    }
    const linkedRollback = await installLinkedRollbackPresentation(
      page,
      currentRouting,
      receipt,
    );
    cleanupLinkedRollback = linkedRollback.cleanup;
    const detailRefresh = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        request.method() === 'GET' &&
        url.pathname ===
          `/api/research/feedback-cycles/${cycle.feedback_cycle_id}`
      );
    });
    await page.getByTestId('feedback-refresh').click();
    await detailRefresh;
    await page.getByTestId('feedback-rollback-link').click();
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === '/system/config/model_routing' &&
        url.searchParams.get('activation_id') ===
          receipt.policy_activation_id &&
        url.searchParams.get('activated_revision_id') ===
          receipt.activated_model_routing_revision_id &&
        url.searchParams.get('rollback_target_revision_id') ===
          receipt.rollback_target.rollback_target_revision_id
      );
    });
    await waitForShell(page);
    const configWorkspace = page.getByTestId('config-resource-workspace');
    await expect(
      configWorkspace.getByTestId('linked-model-route-rollback'),
    ).toBeVisible();
    await expect(configWorkspace.getByTestId('config-review')).toBeVisible();
  } finally {
    await Promise.all([
      governance.cleanup(),
      cleanupPresentation(),
      cleanupLinkedRollback?.(),
    ]);
  }
});

test('ad-hoc report controls honor the fast governed wire contract', async ({
  authenticatedPage: page,
}) => {
  const reportRun = await installReportRunFlow(page);
  try {
    await page.goto('/quant/reports');
    await waitForShell(page);
    await openReportGovernance(page, { knowledgeLagSecs: 0, topN: 10 });
    await confirmGovernedAction(
      page,
      'fast contract run governed global portfolio report',
    );

    expect(reportRun.requests()).toHaveLength(1);
    expect(reportRun.requests()[0]).toMatchObject({
      knowledge_lag_secs: 0,
      top_n: 10,
    });
    await expect(page).toHaveURL((url) => {
      return url.searchParams.get('run_id') === CONTROLLED_REPORT_RUN_ID;
    });
    await expect(page.getByTestId('report-run-drawer')).toContainText(
      CONTROLLED_REPORT_RUN_ID,
    );
  } finally {
    await reportRun.cleanup();
  }
});
