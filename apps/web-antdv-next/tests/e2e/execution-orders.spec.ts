import { expect, readFirstApiItem, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface IntentRow {
  approval_status: string;
  order_intent_id: string;
  status: string;
}

test('execution flow correlates the durable intent chain and fails closed for invalidation', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const intent = await readFirstApiItem<IntentRow>(
    adminApi.context,
    '/api/quant/intents?page=1&size=100&status=invalidated',
    ({ approval_status, status }) =>
      status === 'invalidated' && approval_status === 'pending',
  );

  await page.goto(
    `/execution/orders?module=intents&entity=order-intent&id=${intent.order_intent_id}`,
  );
  await waitForUiReady(page, browserAudit);
  const detail = page.getByTestId('intent-detail');
  await expect(detail).toContainText(/已失效|Invalidated/i);
  await expect(detail).toContainText(/report_revoked/i);
  await expect(detail.getByTestId('approve-intent')).toHaveCount(0);

  await page.goto(
    `/execution/orders?module=flow&entity=order-intent&id=${intent.order_intent_id}`,
  );
  await waitForUiReady(page, browserAudit);
  for (const stage of [
    /Intent|意图/i,
    /Approval|审批/i,
    /Admission|准入/i,
    /Submission|提交/i,
    /Fill|成交/i,
    /Position|持仓/i,
    /Reconciliation|对账/i,
    /Settlement|结算/i,
  ]) {
    await expect(page.getByText(stage).first()).toBeVisible();
  }
  await expectReleaseQuality(page);
});
