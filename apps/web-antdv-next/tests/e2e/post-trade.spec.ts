import type { AccountRecoveryIncidentView } from '@vben/types';

import { expect, readApiData, test } from './fixtures';
import { confirmGovernedAction } from './governed-action-driver';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

const RECOVERY_INCIDENT_ID = '11111111-1111-7111-8111-111111111111';
const RECOVERY_EXECUTION_ID = '22222222-2222-7222-8222-222222222222';
const RECOVERY_MANIFEST_ID = '33333333-3333-7333-8333-333333333333';
const RECOVERY_LOT_IDS = [
  '44444444-4444-7444-8444-444444444444',
  '55555555-5555-7555-8555-555555555555',
] as const;

type AccountPauseOperationView =
  AccountRecoveryIncidentView['pause_operations'][number];

function recoveryHash(byte: string) {
  return `blake3:${byte.repeat(64)}`;
}

function pauseOperation(
  kind: 'pause' | 'unpause',
  state: AccountPauseOperationView['state'],
): AccountPauseOperationView {
  const now = new Date().toISOString();
  const confirmed = state === 'confirmed';
  return {
    account_pause_operation_id:
      kind === 'pause'
        ? '66666666-6666-7666-8666-666666666666'
        : '77777777-7777-7777-8777-777777777777',
    confirmation_block_hash: confirmed ? `0x${'1'.repeat(64)}` : null,
    confirmation_block_number: confirmed ? 1002 : null,
    confirmed_at: confirmed ? now : null,
    created_at: now,
    dispatched_at: now,
    effective_block: confirmed ? 1002 : null,
    exchange_address: '0xe111180000d2663c0091e4f400237545b87b996b',
    failure_detail: null,
    operation_kind: kind,
    requested_block: 1000,
    state,
    submission_kind: 'direct_eoa',
    transaction_hash: `0x${(kind === 'pause' ? '2' : '3').repeat(64)}`,
    updated_at: now,
  };
}

function recoveryIncident(
  stage: 'allocation' | 'converged' | 'finalized' | 'sealed',
): AccountRecoveryIncidentView {
  const now = new Date().toISOString();
  const converged = stage !== 'allocation';
  const sealed = stage === 'sealed' || stage === 'finalized';
  const finalized = stage === 'finalized';
  const revision = { allocation: 1, converged: 2, finalized: 4, sealed: 3 }[
    stage
  ];
  return {
    incident: {
      account_recovery_incident_id: RECOVERY_INCIDENT_ID,
      created_at: now,
      execution_account_id: '88888888-8888-7888-8888-888888888888',
      kind: 'unknown_external_execution',
      opened_at: now,
      reason: 'finalized external SELL is not associated with a system order',
      revision,
      seal_hash: sealed ? recoveryHash('8') : null,
      sealed_at: sealed ? now : null,
      sealed_by: sealed ? 'playwright-risk-owner' : null,
      status: sealed ? 'sealed' : 'reconciling',
      trigger_chain_execution_id: RECOVERY_EXECUTION_ID,
      updated_at: now,
    },
    latest_manifest: {
      account_recovery_manifest_id: RECOVERY_MANIFEST_ID,
      assessment: {
        allocations: converged
          ? RECOVERY_LOT_IDS.map((lotId, index) => ({
              after_cost_usd: index === 0 ? '3.75' : '1.5',
              after_shares: index === 0 ? '8.75' : '4.25',
              before_cost_usd: index === 0 ? '4.25' : '2.25',
              before_shares: index === 0 ? '10' : '5',
              closed_at: null,
              realized_pnl_delta_usd: index === 0 ? '0.125' : '0.075',
              strategy_position_lot_id: lotId,
              token_id: '12345',
            }))
          : [],
        created_lots: [],
        evidence_hash: recoveryHash('9'),
        mismatches: converged
          ? []
          : [
              {
                account_chain_execution_id: RECOVERY_EXECUTION_ID,
                candidate_lot_ids: [...RECOVERY_LOT_IDS],
                kind: 'lot_allocation_required',
                sold_shares: '2',
                token_id: '12345',
              },
            ],
      },
      attempt_no: converged ? 2 : 1,
      converged,
      created_at: now,
      evidence_hash: recoveryHash('9'),
      finalized_block_hash: `0x${'4'.repeat(64)}`,
      finalized_block_number: 1000,
      input: {
        chain_collateral_usd: '100',
        chain_positions: [{ shares: '13', token_id: '12345' }],
        chain_snapshot_hash: recoveryHash('a'),
        clean_funder_blocker: null,
        clob_collateral_usd: '100',
        clob_snapshot_hash: recoveryHash('b'),
        data_api_positions: [{ shares: '13', token_id: '12345' }],
        data_api_snapshot_hash: recoveryHash('c'),
        execution_account_id: '88888888-8888-7888-8888-888888888888',
        explicit_sell_allocations: converged
          ? [
              {
                account_chain_execution_id: RECOVERY_EXECUTION_ID,
                shares: '1.25',
                strategy_position_lot_id: RECOVERY_LOT_IDS[0],
              },
              {
                account_chain_execution_id: RECOVERY_EXECUTION_ID,
                shares: '0.75',
                strategy_position_lot_id: RECOVERY_LOT_IDS[1],
              },
            ]
          : [],
        finalized_block_hash: `0x${'4'.repeat(64)}`,
        finalized_block_number: 1000,
        incident_executions: [
          {
            account_chain_execution_id: RECOVERY_EXECUTION_ID,
            available_at: now,
            exact_fee_usd: '0.01',
            principal_usd: '1.2',
            shares_delta: '-2',
            token_id: '12345',
          },
        ],
        invalid_execution_ids: [],
        observed_at: now,
        open_lots: RECOVERY_LOT_IDS.map((lotId, index) => ({
          cost_usd: index === 0 ? '4.25' : '2.25',
          opened_at: now,
          shares: index === 0 ? '10' : '5',
          strategy_position_lot_id: lotId,
          token_id: '12345',
        })),
        open_order_ids: [],
        pause_confirmed: true,
        pending_settlement_count: 0,
        recovery_incident_id: RECOVERY_INCIDENT_ID,
        reserved_usd: '0',
        settlement_snapshot_hash: recoveryHash('d'),
        unmapped_token_ids: [],
        venue_snapshot_stable: true,
      },
      observed_at: now,
    },
    pause_operations: [
      pauseOperation('pause', 'confirmed'),
      ...(sealed
        ? [pauseOperation('unpause', finalized ? 'confirmed' : 'dispatched')]
        : []),
    ],
  };
}

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

test('break-glass recovery requires exact lot allocation and governed state transitions', async ({
  authenticatedPage: page,
  browserAudit,
}) => {
  let current = recoveryIncident('allocation');
  const mutationBodies: Record<string, unknown>[] = [];
  const actingRoles: string[] = [];
  await page.route(
    '**/api/system/execution-recovery/incidents/active',
    (route) =>
      route.fulfill({ json: { code: 200, data: current, message: 'OK' } }),
  );
  await page.route(
    `**/api/system/execution-recovery/incidents/${RECOVERY_INCIDENT_ID}/*`,
    async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as Record<string, unknown>;
      mutationBodies.push(body);
      actingRoles.push(request.headers()['x-acting-role'] ?? '');
      const path = new URL(request.url()).pathname;
      if (path.endsWith('/pause-and-reconcile')) {
        current = recoveryIncident('converged');
      } else if (path.endsWith('/seal')) {
        current = recoveryIncident('sealed');
      } else if (path.endsWith('/unpause-and-finalize')) {
        current = recoveryIncident('finalized');
      } else {
        throw new Error(`unexpected account recovery mutation: ${path}`);
      }
      await route.fulfill({
        json: { code: 200, data: current, message: 'OK' },
      });
    },
  );

  await page.goto('/execution/post-trade?module=settlement');
  await waitForUiReady(page, browserAudit);
  const panel = page.getByTestId('account-recovery-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/未知外部执行|Unknown External Execution/i);
  const allocations = panel.getByTestId('account-recovery-allocation-input');
  await expect(allocations).toHaveCount(2);
  await allocations.nth(0).fill('1.25');
  await allocations.nth(1).fill('0.75');

  await panel.getByTestId('account-recovery-reconcile').click();
  await confirmGovernedAction(page, 'reconcile exact external sell allocation');
  expect(mutationBodies[0]).toEqual({
    expected_revision: 1,
    reason: 'reconcile exact external sell allocation',
    sell_allocations: [
      {
        account_chain_execution_id: RECOVERY_EXECUTION_ID,
        shares: '1.25',
        strategy_position_lot_id: RECOVERY_LOT_IDS[0],
      },
      {
        account_chain_execution_id: RECOVERY_EXECUTION_ID,
        shares: '0.75',
        strategy_position_lot_id: RECOVERY_LOT_IDS[1],
      },
    ],
  });
  await expect(panel.getByTestId('account-recovery-seal')).toBeEnabled();

  await panel.getByTestId('account-recovery-seal').click();
  await confirmGovernedAction(page, 'seal converged account recovery evidence');
  expect(mutationBodies[1]).toEqual({
    account_recovery_manifest_id: RECOVERY_MANIFEST_ID,
    expected_revision: 2,
    reason: 'seal converged account recovery evidence',
  });
  await expect(panel.getByTestId('account-recovery-unpause')).toBeEnabled();

  await panel.getByTestId('account-recovery-unpause').click();
  await confirmGovernedAction(page, 'confirm finalized unpause evidence');
  expect(mutationBodies[2]).toEqual({
    expected_revision: 3,
    reason: 'confirm finalized unpause evidence',
  });
  expect(actingRoles).toEqual(['super_admin', 'super_admin', 'super_admin']);
  await expect(panel.getByTestId('account-recovery-unpause')).toBeDisabled();
  await expect(panel).toContainText(/unpause · confirmed/i);
  await expectReleaseQuality(page);
});
