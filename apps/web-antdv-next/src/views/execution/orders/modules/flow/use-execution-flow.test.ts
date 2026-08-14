import type {
  ExecutionOrderView,
  OrderIntentView,
  PositionView,
  ReconciliationView,
  SettlementRedeemView,
} from '@vben/types';

import type { ExecutionFlowSnapshot } from './use-execution-flow';

import { describe, expect, it, vi } from 'vitest';

import { buildExecutionFlowStages } from './use-execution-flow';

vi.mock('#/api/execution-orders', () => ({ listExecutionOrders: vi.fn() }));
vi.mock('#/api/order-intents', () => ({ listOrderIntents: vi.fn() }));
vi.mock('#/api/positions', () => ({ listPositions: vi.fn() }));
vi.mock('#/api/reconciliations', () => ({ listReconciliations: vi.fn() }));
vi.mock('#/api/settlement-redeems', () => ({
  listSettlementRedeems: vi.fn(),
}));
vi.mock('#/shared/components/format', () => ({
  formatDurationSecs: (value: number) => `${value}s`,
}));

const NOW = '2026-08-14T00:00:00.000Z';
const LATER = '2026-08-14T00:00:10.000Z';

function snapshot(): ExecutionFlowSnapshot {
  return {
    intent: {
      admission_trace_ref: 'admission:1',
      approval_status: 'approved',
      approved_at: LATER,
      created_at: NOW,
      order_intent_id: 'intent-1',
      status: 'approved',
      updated_at: LATER,
    } as OrderIntentView,
    intentCount: 4,
    order: {
      created_at: LATER,
      execution_order_id: 'order-1',
      filled_at: null,
      market_id: 'market-1',
      state: 'submitted',
      submitted_at: LATER,
      updated_at: LATER,
    } as ExecutionOrderView,
    orderCount: 2,
    position: {
      market_id: 'market-1',
      opened_at: LATER,
      position_id: 'position-1',
      state: 'open',
      updated_at: LATER,
    } as PositionView,
    positionCount: 1,
    reconciliation: {
      created_at: LATER,
      reconciliation_id: 'reconciliation-1',
      result: 'pending',
      updated_at: LATER,
    } as ReconciliationView,
    reconciliationCount: 1,
    settlement: {
      created_at: LATER,
      settlement_redeem_id: 'settlement-1',
      state: 'discovered',
      updated_at: LATER,
    } as SettlementRedeemView,
    settlementCount: 1,
  };
}

describe('execution flow stage contract', () => {
  it('preserves the eight authoritative stages and canonical deep links', () => {
    const stages = buildExecutionFlowStages(snapshot());

    expect(stages.map((stage) => stage.key)).toEqual([
      'intent',
      'approval',
      'admission',
      'submission',
      'fill',
      'position',
      'reconciliation',
      'settlement',
    ]);
    expect(stages[0]?.route).toBe(
      '/execution/orders?module=intents&entity=order-intent&id=intent-1',
    );
    expect(stages[5]?.route).toBe(
      '/execution/portfolio?module=positions&entity=position&id=position-1',
    );
    expect(stages[7]?.scopeKey).toBe('page.execution.flow.scope.marketBound');
    expect(stages[7]?.route).toBe(
      '/execution/post-trade?module=settlement&entity=settlement-redeem&id=settlement-1',
    );
  });

  it('renders an explicit absent state without inventing records', () => {
    const empty: ExecutionFlowSnapshot = {
      intent: null,
      intentCount: 0,
      order: null,
      orderCount: 0,
      position: null,
      positionCount: 0,
      reconciliation: null,
      reconciliationCount: 0,
      settlement: null,
      settlementCount: 0,
    };

    const stages = buildExecutionFlowStages(empty);
    expect(stages).toHaveLength(8);
    expect(stages.every((stage) => stage.status.value === undefined)).toBe(
      true,
    );
    expect(stages.every((stage) => stage.active === false)).toBe(true);
  });
});
