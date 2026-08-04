import type { Locator, Page } from 'playwright/test';

import type {
  FeedbackCycleDetailView,
  FeedbackCycleView,
  PromotionPermitView,
} from '@vben/types';
import type {
  CurrentPolicyResourceView,
  ModelRouting,
} from '@vben/types/config-api';

import process from 'node:process';

import {
  expect,
  expectAccessible,
  readApiData,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';

const ACTIVATION_FIXTURE = 'feedback-closure';
const RECOVERY_FIXTURE = 'feedback-closure-recovery';
const closureScenario = process.env.PLAYWRIGHT_CLOSURE_SCENARIO ?? 'activation';

async function confirmGovernedAction(
  page: Page,
  reason: string,
): Promise<void> {
  const modal = page.getByTestId('governed-action-modal');
  await expect(modal).toBeVisible();
  await modal.getByTestId('governed-reason').fill(reason);
  const confirmation = modal.getByLabel(/Confirmation word|确认词/i);
  if ((await confirmation.count()) > 0) {
    const text = (await modal.textContent()) ?? '';
    const quoted = /[「"]([^」"]+)[」"]/.exec(text)?.[1];
    const fallback = text.includes('ACTIVATE') ? 'ACTIVATE' : '激活';
    await confirmation.fill(quoted ?? fallback);
  }
  await modal.getByRole('button', { name: /确\s*认|Confirm/i }).click();
  await expect(modal).toHaveCount(0, { timeout: 60_000 });
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
}) => {
  test.skip(
    process.env.PLAYWRIGHT_PRODUCTION_FIXTURE !== ACTIVATION_FIXTURE ||
      closureScenario !== 'activation',
    'requires the production feedback-closure fixture',
  );
  test.setTimeout(300_000);
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
  await expect(page.getByTestId('feedback-trigger-profile')).toContainText(
    cycle.profile_ref.id,
  );
  const detail = page.locator(
    `[aria-labelledby="feedback-cycle-detail-${cycle.feedback_cycle_id}"]`,
  );
  await expect(detail).toContainText(/Candidate ready|候选模型已就绪/i);
  await expect(detail).toContainText(candidateModelId);
  await expect(detail).toContainText(candidate.route_diff.shadow_binding_id);

  const permitPanel = page.getByTestId('feedback-permit-panel');
  await expect(permitPanel).toBeVisible();
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
  await expect(permitCard).toBeVisible();
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
  await expect(receiptCard).toBeVisible();
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
  await expect(linkedRollback).toBeVisible();
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
  await expectAccessible(
    page,
    `[aria-labelledby="feedback-cycle-detail-${cycle.feedback_cycle_id}"]`,
  );
});
