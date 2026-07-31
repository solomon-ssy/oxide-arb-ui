import type { FeedbackCycleView } from '@vben/types';

import {
  CONTROLLED_CANDIDATE_MODEL_ID,
  CONTROLLED_PROMOTION_PERMIT_ID,
  installFeedbackGovernanceFlow,
} from './feedback-governance-flow-harness';
import {
  expect,
  expectAccessible,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';
import { installFeedbackPresentation } from './w4-responsive-a11y-harness';

test('CandidateReady permit activation receipt and rollback flow', async ({
  adminApi,
  authenticatedPage: page,
}) => {
  test.setTimeout(120_000);
  const cycle = await readFirstApiItem<FeedbackCycleView>(
    adminApi.context,
    '/api/research/feedback-cycles?page=1&size=100',
  );
  const presentationCleanup = await installFeedbackPresentation(
    page,
    'candidate_ready',
    cycle.feedback_cycle_id,
  );
  const governance = await installFeedbackGovernanceFlow(page, cycle);

  try {
    await page.goto(
      `/research/feedback?view=cycles&cycle_id=${encodeURIComponent(cycle.feedback_cycle_id)}`,
    );
    await waitForShell(page);
    const detail = page.locator(
      `[aria-labelledby="feedback-cycle-detail-${cycle.feedback_cycle_id}"]`,
    );
    await expect(detail).toContainText(/Candidate ready|候选模型已就绪/i);
    await expect(detail).toContainText(CONTROLLED_CANDIDATE_MODEL_ID);

    const permitPanel = page.getByTestId('feedback-permit-panel');
    await expect(permitPanel).toBeVisible();
    await permitPanel.getByTestId('feedback-issue-permit').click();
    const issueModal = page.getByTestId('governed-action-modal');
    await expect(issueModal).toBeVisible();
    await issueModal
      .getByTestId('governed-reason')
      .fill('e2e issue bounded route activation permit');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /确\s*认|Confirm/i })
      .click();

    const permitCard = permitPanel.getByTestId(
      `feedback-permit-${CONTROLLED_PROMOTION_PERMIT_ID}`,
    );
    await expect(permitCard).toBeVisible();
    await expect(permitCard).toContainText(/Active|有效/i);
    await expect(permitCard).toContainText(CONTROLLED_CANDIDATE_MODEL_ID);
    expect(governance.issueRequests()).toHaveLength(1);
    expect(Object.keys(governance.issueRequests()[0] ?? {}).toSorted()).toEqual(
      [
        'feedback_cycle_id',
        'idempotency_key',
        'note',
        'reason_code',
        'ttl_secs',
      ],
    );

    await permitCard
      .getByTestId(`feedback-activate-${CONTROLLED_PROMOTION_PERMIT_ID}`)
      .click();
    const activationModal = page.getByTestId('governed-action-modal');
    await expect(activationModal).toBeVisible();
    await expect(activationModal).toContainText(CONTROLLED_CANDIDATE_MODEL_ID);
    await expect(activationModal).toContainText(
      /execution mode.*capital.*signing authority.*unchanged|执行模式.*资金.*签名权限.*(?:未变化|不变)/is,
    );
    await activationModal
      .getByTestId('governed-reason')
      .fill('e2e activate exact candidate route');
    const confirmation = activationModal.getByLabel(
      /Confirmation word|确认词/i,
    );
    await expect(confirmation).toBeVisible();
    const modalText = (await activationModal.textContent()) ?? '';
    await confirmation.fill(
      modalText.includes('ACTIVATE') ? 'ACTIVATE' : '激活',
    );
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /确\s*认|Confirm/i })
      .click();

    const receipt = permitPanel.getByTestId('feedback-activation-receipt');
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText(CONTROLLED_CANDIDATE_MODEL_ID);
    await expect(receipt).toContainText(/admin/i);
    await expect(receipt).toContainText(/7\s*→\s*8/);
    await expect(receipt.getByTestId('feedback-rollback-link')).toHaveAttribute(
      'href',
      '/system/config/model_routing',
    );
    expect(governance.activationRequests()).toHaveLength(1);
    expect(
      Object.keys(governance.activationRequests()[0] ?? {}).toSorted(),
    ).toEqual([
      'expected_policy_generation',
      'expected_runtime_control_revision',
      'feedback_cycle_id',
      'idempotency_key',
      'note',
      'promotion_permit_id',
      'reason_code',
    ]);
    await expectAccessible(page, '[data-testid="feedback-permit-panel"]');
  } finally {
    await governance.cleanup();
    await presentationCleanup();
  }
});
