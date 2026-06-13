import type {
  ControlFactorMaterializationRunView,
  OpportunityView,
  SyncSnapshot,
  SystemStatus,
  TradeView,
  WsEnvelope,
} from '@vben/types';

import type { WsDispatchHooks } from '../ws-dispatch';

import {
  BREAKER_STATES,
  EXECUTION_MODES,
  SIDES,
  TRADE_STATES,
} from '@vben/types';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOpportunityStore } from '#/store/opportunity';
import { usePnlStore } from '#/store/pnl';
import { useReplayStore } from '#/store/replay';
import { useRiskStore } from '#/store/risk';
import { useSystemStore } from '#/store/system';
import { useTradeStore } from '#/store/trade';
import { useWsStore } from '#/store/ws';

import { dispatchWsEnvelope } from '../ws-dispatch';
import { deriveSystemIndicator } from '../ws-indicators';

function hooks(): WsDispatchHooks {
  return {
    onAlert: vi.fn(),
    onBreakerTrip: vi.fn(),
    onConfigActivated: vi.fn(),
    onControlPublished: vi.fn(),
    onMarketResolved: vi.fn(),
  };
}

function envelope<T>(type: WsEnvelope['type'], data: T): WsEnvelope<T> {
  return { data, timestamp: '2026-06-11T12:00:00.000Z', type };
}

function systemStatus(overrides: Partial<SystemStatus> = {}): SystemStatus {
  return {
    active_markets: 12,
    breaker_state: BREAKER_STATES.closed,
    catalog: {
      markets: 3000,
      state: 'ready',
      synced_at: '2026-06-11T11:00:00Z',
    },
    checked_at: '2026-06-11T12:00:00Z',
    daily_pnl: '15.5',
    execution_mode: EXECUTION_MODES.paper,
    open_positions: 3,
    pending_reservations: 1,
    total_exposure: '120.00',
    uptime_secs: 3600,
    ...overrides,
  };
}

function tradeView(id: string): TradeView {
  return {
    business_outcome: 'success',
    category: 'politics',
    confirmed_at: '2026-06-11T12:00:00Z',
    cost_usd: '74.4',
    created_at: '2026-06-11T12:00:00Z',
    detected_edge_bps: '300',
    detected_profit_usd: '4.5',
    error_message: null,
    event_id: 'e1',
    execution_mode: EXECUTION_MODES.paper,
    fee_usd: '0.5',
    latency_ms: 42,
    market_id: '0xabc',
    net_profit_usd: '4.1',
    opportunity_id: '0197a1b2-0000-7000-8000-000000000001',
    order_id: 'ord1',
    price: '0.93',
    shares: '80',
    side: SIDES.buy,
    state: TRADE_STATES.fillObserved,
    submitted_at: '2026-06-11T12:00:00Z',
    token_id: 'tok1',
    trade_id: id,
    tx_hash: null,
    updated_at: '2026-06-11T12:00:00Z',
  };
}

function opportunityView(id: string): OpportunityView {
  return {
    detected_at: '2026-06-11T12:00:00Z',
    edge_bps: '300',
    expected_net_profit_usd: '2.60',
    market_id: '0xabc',
    opportunity_id: id,
  };
}

function materializationRun(
  overrides: Partial<ControlFactorMaterializationRunView> = {},
): ControlFactorMaterializationRunView {
  return {
    created_at: '2026-06-11T12:00:00Z',
    created_by: 'ops',
    failure_code: null,
    failure_detail: null,
    finished_at: null,
    market_filter: {},
    materialization_run_id: 'run-1',
    output_policy: 'report_only',
    report: {},
    report_uri: null,
    requested_factor_types: ['bucket_risk'],
    run_dedupe_key: null,
    run_kind: 'backfill',
    source_delay_secs: 0,
    started_at: null,
    status: 'queued',
    trigger_ref: null,
    trigger_type: 'backfill',
    updated_at: '2026-06-11T12:00:00Z',
    window_from: '2026-06-10T00:00:00Z',
    window_to: '2026-06-11T00:00:00Z',
    ...overrides,
  };
}

describe('dispatchWsEnvelope', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('system.status overwrites the system store and marks status heartbeat', () => {
    const status = systemStatus();
    dispatchWsEnvelope(envelope('system.status', status), hooks());
    expect(useSystemStore().status).toEqual(status);
    expect(useWsStore().lastSystemStatusAt).toBe('2026-06-11T12:00:00.000Z');
  });

  it('sync snapshot hydrates every authorized section and marks sync', () => {
    const snapshot: SyncSnapshot = {
      active_materialization_runs: [materializationRun()],
      pnl: {
        daily_loss_usd: '0',
        daily_pnl: '15.5',
        total_exposure: '120',
        total_realized_pnl: '99',
      },
      recent_opportunities: [opportunityView('opp-1')],
      system_status: systemStatus(),
    };
    dispatchWsEnvelope(envelope('sync', snapshot), hooks());

    expect(useSystemStore().status?.daily_pnl).toBe('15.5');
    expect(usePnlStore().live?.total_realized_pnl).toBe('99');
    expect(useOpportunityStore().feed).toHaveLength(1);
    expect(useReplayStore().queuedOrRunning).toHaveLength(1);
    expect(useWsStore().lastSyncAt).not.toBeNull();
    expect(useWsStore().lastSystemStatusAt).toBe('2026-06-11T12:00:00.000Z');
  });

  it('sync omitting unauthorized sections leaves stores untouched', () => {
    const pnl = usePnlStore();
    pnl.applyLiveSnapshot({
      daily_loss_usd: '0',
      daily_pnl: '1',
      total_exposure: '2',
      total_realized_pnl: '3',
    });
    dispatchWsEnvelope(envelope('sync', {} satisfies SyncSnapshot), hooks());
    expect(pnl.live?.total_realized_pnl).toBe('3');
  });

  it('pnl.update patches the live view and extends the intraday series', () => {
    dispatchWsEnvelope(
      envelope('pnl.update', { daily: '5', total: '50' }),
      hooks(),
    );
    const pnl = usePnlStore();
    expect(pnl.live?.daily_pnl).toBe('5');
    expect(pnl.live?.total_realized_pnl).toBe('50');
    expect(pnl.intradaySeries).toEqual([['2026-06-11T12:00:00.000Z', '5']]);
  });

  it('trade.filled prepends with id dedup and trade.settled patches', () => {
    const store = useTradeStore();
    dispatchWsEnvelope(envelope('trade.filled', tradeView('t1')), hooks());
    dispatchWsEnvelope(envelope('trade.filled', tradeView('t2')), hooks());
    dispatchWsEnvelope(envelope('trade.filled', tradeView('t1')), hooks());
    expect(store.recent.map((t) => t.trade_id)).toEqual(['t1', 't2']);

    dispatchWsEnvelope(
      envelope('trade.settled', {
        outcome: 'success',
        pnl: '9.9',
        trade_id: 't2',
      }),
      hooks(),
    );
    const settled = store.recent.find((t) => t.trade_id === 't2');
    expect(settled?.net_profit_usd).toBe('9.9');
    expect(settled?.state).toBe('settled');
  });

  it('opportunity.detected prepends and respects the feed cap', () => {
    const store = useOpportunityStore();
    for (let index = 0; index < 205; index += 1) {
      dispatchWsEnvelope(
        envelope('opportunity.detected', opportunityView(`opp-${index}`)),
        hooks(),
      );
    }
    expect(store.feed).toHaveLength(200);
    expect(store.feed[0]?.opportunity_id).toBe('opp-204');
  });

  it('materialization.run_update upserts and evicts terminal runs', () => {
    dispatchWsEnvelope(
      envelope('materialization.run_update', materializationRun()),
      hooks(),
    );
    expect(useReplayStore().queuedOrRunning).toHaveLength(1);

    dispatchWsEnvelope(
      envelope(
        'materialization.run_update',
        materializationRun({ status: 'completed' }),
      ),
      hooks(),
    );
    expect(useReplayStore().queuedOrRunning).toHaveLength(0);
  });

  it('risk.circuit_breaker records the trip and delegates the refetch', () => {
    const h = hooks();
    dispatchWsEnvelope(
      envelope('risk.circuit_breaker', { level: 3, reason: 'daily loss cap' }),
      h,
    );
    expect(useRiskStore().lastTrip).toEqual({
      level: 3,
      reason: 'daily loss cap',
    });
    expect(h.onBreakerTrip).toHaveBeenCalledWith({
      level: 3,
      reason: 'daily loss cap',
    });
  });

  it('system.alert is delegated without store writes', () => {
    const h = hooks();
    dispatchWsEnvelope(
      envelope('system.alert', { level: 'warning', message: 'lag' }),
      h,
    );
    expect(h.onAlert).toHaveBeenCalledWith({
      level: 'warning',
      message: 'lag',
    });
  });

  it('error and unknown frames only warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatchWsEnvelope(envelope('error', { error: 'forbidden' }), hooks());
    dispatchWsEnvelope(
      envelope('trade.opened' as WsEnvelope['type'], {}),
      hooks(),
    );
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});

describe('deriveSystemIndicator', () => {
  it('aggregates green / yellow / red per the header light rules', () => {
    expect(deriveSystemIndicator(null, null)).toBe('unknown');
    expect(deriveSystemIndicator(systemStatus(), null)).toBe('running');
    expect(
      deriveSystemIndicator(systemStatus({ breaker_state: 'open' }), null),
    ).toBe('degraded');
    expect(
      deriveSystemIndicator(
        systemStatus({ catalog: { state: 'warming' } }),
        null,
      ),
    ).toBe('degraded');
    expect(
      deriveSystemIndicator(systemStatus({ breaker_state: 'halted' }), null),
    ).toBe('critical');
    expect(deriveSystemIndicator(systemStatus(), null, 'warning')).toBe(
      'degraded',
    );
    expect(deriveSystemIndicator(systemStatus(), null, 'critical')).toBe(
      'degraded',
    );
    expect(deriveSystemIndicator(systemStatus(), null, 'info')).toBe('running');
  });
});
