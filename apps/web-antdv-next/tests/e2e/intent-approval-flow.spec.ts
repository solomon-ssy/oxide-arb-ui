import {
  expect,
  expectAccessible,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';

interface IntentListRow {
  approval_status: string;
  order_intent_id: string;
  status: string;
}

test('report containment invalidates its intent before any approval or submission', async ({
  adminApi,
  authenticatedPage,
}) => {
  const intent = await readFirstApiItem<IntentListRow>(
    adminApi.context,
    '/api/quant/intents?page=1&size=100&status=invalidated',
    (item) =>
      item.status === 'invalidated' && item.approval_status === 'pending',
  );

  await authenticatedPage.goto(`/quant/intents/${intent.order_intent_id}`);
  await waitForShell(authenticatedPage);
  await expect(authenticatedPage.getByTestId('intent-detail')).toContainText(
    /已失效|Invalidated/i,
  );
  await expect(authenticatedPage.getByTestId('intent-detail')).toContainText(
    /report_revoked/i,
  );
  await expect(authenticatedPage.getByTestId('approve-intent')).toHaveCount(0);
  await expect(authenticatedPage.getByTestId('cancel-intent')).toHaveCount(0);
  await expect(
    authenticatedPage.getByRole('button', { name: /提交|Submit/i }),
  ).toHaveCount(0);
  await expectAccessible(authenticatedPage, '[data-testid="intent-detail"]');
});
