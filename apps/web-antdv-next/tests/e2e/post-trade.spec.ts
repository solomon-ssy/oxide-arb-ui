import { expect, readApiData, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface SettlementReadiness {
  routes: Array<{ route: string; runtime_code_hash: string }>;
  settlement_write_policy: string;
}

interface SettlementRedeemPage {
  items: Array<{
    effective_policy: string;
    settlement_redeem_id: string;
  }>;
  total: number;
}

test('post-trade exposes settlement authority while money writes stay blocked', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const readiness = await readApiData<SettlementReadiness>(
    adminApi.context,
    '/api/quant/settlement-readiness',
  );
  expect(readiness.settlement_write_policy).toBe('disabled');
  expect(readiness.routes.map(({ route }) => route).toSorted()).toEqual([
    'neg_risk_v2',
    'standard_v2',
  ]);
  for (const route of readiness.routes) {
    expect(route.runtime_code_hash).toMatch(/^0x[0-9a-f]{64}$/);
  }

  await page.goto('/execution/post-trade?module=settlement');
  await waitForUiReady(page, browserAudit);
  await expect(page.getByTestId('settlement-readiness')).toContainText(
    /写入仍处于阻断状态|writes remain blocked/i,
  );
  await expect(page.getByTestId('settlement-route-standard_v2')).toBeVisible();
  await expect(page.getByTestId('settlement-route-neg_risk_v2')).toBeVisible();

  await expect
    .poll(
      async () => {
        const redeems = await readApiData<SettlementRedeemPage>(
          adminApi.context,
          '/api/quant/settlement-redeems?page=1&size=20',
        );
        return redeems.total;
      },
      { timeout: 45_000 },
    )
    .toBeGreaterThan(0);
  const redeems = await readApiData<SettlementRedeemPage>(
    adminApi.context,
    '/api/quant/settlement-redeems?page=1&size=20',
  );
  const redeem = redeems.items[0];
  if (!redeem) throw new Error('settlement discovery did not persist a case');
  expect(redeem.effective_policy).toBe('manual_only');

  await page.goto(
    `/execution/post-trade?module=settlement&entity=settlement-redeem&id=${redeem.settlement_redeem_id}`,
  );
  await waitForUiReady(page, browserAudit);
  await expect(page.getByTestId('settlement-redeem-detail')).toBeVisible();
  await expectReleaseQuality(page);
});
