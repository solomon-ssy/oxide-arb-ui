import { expect, readApiData, test, waitForShell } from './fixtures';

interface SettlementReadinessResponse {
  routes: Array<{
    advisories: Array<{ code: string }>;
    authority: {
      retrieved_at: string;
      source: string;
      source_url: string;
    };
    blocking_reasons: Array<{ code: string }>;
    route: string;
    runtime_code_hash: string;
    target_adapter: string;
  }>;
  settlement_write_policy: string;
}

interface SettlementRedeemPage {
  has_next: boolean;
  items: Array<{
    effective_policy: string;
    inventory_lot_count: number;
    settlement_redeem_id: string;
  }>;
  page: number;
  size: number;
  total: number;
}

interface SettlementRedeemDetail {
  effective_policy: string;
  inventory_lots: Array<{
    redeem_policy: string;
    settlement_mode: string;
  }>;
  redeemed_lots: unknown[];
  settlement_redeem_id: string;
}

test('settlement readiness renders typed truth while every money apply stays blocked', async ({
  adminApi,
  authenticatedPage,
}) => {
  const readiness = await readApiData<SettlementReadinessResponse>(
    adminApi.context,
    '/api/quant/settlement-readiness',
  );
  expect(readiness.settlement_write_policy).toBe('disabled');
  expect(readiness.routes.map(({ route }) => route).toSorted()).toEqual([
    'neg_risk_v2',
    'standard_v2',
  ]);
  for (const route of readiness.routes) {
    expect(route.authority.source).toBe('contracts_documentation');
    expect(route.authority.source_url).toContain('docs.polymarket.com');
    expect(route.authority.retrieved_at).not.toBe('');
    expect(route.target_adapter).toMatch(/^0x[0-9a-f]{40}$/);
    expect(route.runtime_code_hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(route.advisories.map(({ code }) => code)).toContain(
      'repository_documentation_drift',
    );
  }

  const preflightResponse = await adminApi.context.post(
    '/api/quant/settlement-operator-approvals/preflight',
    {
      data: {
        desired_approval: true,
        route: 'standard_v2',
      },
    },
  );
  expect(preflightResponse.ok(), await preflightResponse.text()).toBeTruthy();
  const preflight = (await preflightResponse.json()) as {
    data: {
      allowed: boolean;
      blocking_reasons: string[];
      preflight_token: null | string;
    };
  };
  expect(preflight.data.allowed).toBe(false);
  expect(preflight.data.preflight_token).toBeNull();
  expect(preflight.data.blocking_reasons).toContain(
    'settlement_write_policy_disabled',
  );

  await authenticatedPage.goto('/quant/settlement-redeems');
  await waitForShell(authenticatedPage);
  await expect(
    authenticatedPage.getByText(
      /结算资金写入仍处于阻断状态|Settlement writes remain blocked/i,
    ),
  ).toBeVisible();
  await expect(
    authenticatedPage.getByTestId('settlement-route-standard_v2'),
  ).toBeVisible();
  await expect(
    authenticatedPage.getByTestId('settlement-route-neg_risk_v2'),
  ).toBeVisible();
  await expect
    .poll(
      async () => {
        const page = await readApiData<SettlementRedeemPage>(
          adminApi.context,
          '/api/quant/settlement-redeems?page=1&size=20',
        );
        return page.total;
      },
      {
        message:
          'production settlement discovery must create the account-scoped ManualOnly case',
        timeout: 45_000,
      },
    )
    .toBe(1);
  const redeems = await readApiData<SettlementRedeemPage>(
    adminApi.context,
    '/api/quant/settlement-redeems?page=1&size=20',
  );
  expect(redeems.total).toBe(1);
  expect(redeems.items).toHaveLength(1);
  expect(redeems.items[0]?.effective_policy).toBe('manual_only');
  expect(redeems.items[0]?.inventory_lot_count).toBe(1);
  const redeemId = redeems.items[0]?.settlement_redeem_id;
  expect(redeemId).toBeTruthy();
  const redeem = await readApiData<SettlementRedeemDetail>(
    adminApi.context,
    `/api/quant/settlement-redeems/${redeemId}`,
  );
  expect(redeem.settlement_redeem_id).toBe(redeemId);
  expect(redeem.effective_policy).toBe('manual_only');
  expect(redeem.inventory_lots).toEqual([
    expect.objectContaining({
      redeem_policy: 'manual',
      settlement_mode: 'exit_before_resolution',
    }),
  ]);
  expect(redeem.redeemed_lots).toEqual([]);

  await authenticatedPage.goto(`/quant/settlement-redeems?open=${redeemId}`);
  await waitForShell(authenticatedPage);
  await expect(
    authenticatedPage.getByTestId('settlement-redeem-detail'),
  ).toBeVisible();
  await expect(
    authenticatedPage.getByText(
      /System redemption is blocked for this inventory|该库存禁止系统发起赎回/i,
    ),
  ).toBeVisible();
  const inventory = authenticatedPage.getByTestId('settlement-inventory-lots');
  await expect(inventory).toBeVisible();
  await expect(
    inventory.getByText('exit_before_resolution', { exact: true }),
  ).toBeVisible();
  await expect(inventory.getByText('manual', { exact: true })).toBeVisible();
});
