import type {
  MarketBookView,
  SyncSnapshot,
  SystemAlertEvent,
  SystemStatus,
  WsEnvelope,
} from '@vben/types';

import type { WsDispatchHooks } from './ws-dispatch';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMarketStore } from '#/store/market';
import { useOrderIntentStore } from '#/store/order-intent';
import { useQuantReportStore } from '#/store/quant-report';
import { useReconciliationStore } from '#/store/reconciliation';
import { useResearchStore } from '#/store/research';
import { useSettlementRedeemStore } from '#/store/settlement-redeem';
import { useSystemStore } from '#/store/system';
import { useWsStore } from '#/store/ws';

import { dispatchWsEnvelope } from './ws-dispatch';

function hooks(): WsDispatchHooks {
  return {
    onAlert: vi.fn(),
    onConfigActivated: vi.fn(),
    onMarketResolved: vi.fn(),
  };
}

function envelope<T>(type: WsEnvelope['type'], data: T): WsEnvelope<T> {
  return { data, timestamp: '2026-06-11T12:00:00.000Z', type };
}

function systemAlert(
  overrides: Partial<SystemAlertEvent> = {},
): SystemAlertEvent {
  return {
    affects_trading: false,
    category: 'operator_notice',
    dedupe_secs: 60,
    idempotency_key: 'test.alert',
    level: 'warning',
    message: 'lag',
    source: 'system',
    title: 'Test alert',
    visible_toast: false,
    ...overrides,
  };
}

function systemStatus(overrides: Partial<SystemStatus> = {}): SystemStatus {
  return {
    active_markets: 12,
    catalog: {
      markets: 3000,
      state: 'ready',
      synced_at: '2026-06-11T11:00:00Z',
    },
    checked_at: '2026-06-11T12:00:00Z',
    execution_recovery: {
      auto_execution_blocked: false,
      has_unresolvable_reconciliation: false,
      kill_switch_requires_ack: false,
      kill_switch_state: 'closed',
      next_steps: [],
      quant_runtime_mode: 'report_only',
      unresolvable_count: 0,
    },
    kill_switch: {
      changed_at: '2026-06-11T10:00:00Z',
      changed_by: 'system',
      last_reason: 'bootstrap',
      requires_operator_ack: false,
      state: 'closed',
    },
    market_data: {
      last_message_age_ms: 100,
      ready: true,
      ws_shards: {
        connected_ratio_bps: 10_000,
        disconnected: 0,
        oldest_disconnected_secs: null,
        total: 2,
      },
    },
    operational_phase: { phase: 'operational' },
    quant_runtime_mode: 'report_only',
    uptime_secs: 3600,
    ...overrides,
  };
}

function marketBook(): MarketBookView {
  return { market_id: '0xabc', no: null, yes: null };
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

  it('system.status does not clear latched bell alerts', () => {
    const ws = useWsStore();
    ws.recordAlert(
      systemAlert({ idempotency_key: 'kill.emergency', level: 'critical' }),
    );
    dispatchWsEnvelope(envelope('system.status', systemStatus()), hooks());
    expect(ws.recentAlertLevel).toBe('critical');
  });

  it('sync snapshot hydrates system status and marks sync', () => {
    const snapshot: SyncSnapshot = { system_status: systemStatus() };
    dispatchWsEnvelope(envelope('sync', snapshot), hooks());
    expect(useSystemStore().status?.quant_runtime_mode).toBe('report_only');
    expect(useWsStore().lastSyncAt).not.toBeNull();
    expect(useWsStore().lastSystemStatusAt).toBe('2026-06-11T12:00:00.000Z');
  });

  it('sync omitting system status leaves the store untouched', () => {
    const system = useSystemStore();
    system.applySystemStatus(systemStatus({ active_markets: 5 }));
    dispatchWsEnvelope(envelope('sync', {} satisfies SyncSnapshot), hooks());
    expect(system.status?.active_markets).toBe(5);
  });

  it('quant.report bumps the report revision and records the last event', () => {
    dispatchWsEnvelope(
      envelope('quant.report', {
        decision_at: '2026-06-11T12:00:00Z',
        event: 'published',
        recommendation_report_id: 'r1',
        report_kind: 'top_n',
        runtime_mode: 'report_only',
        status: 'published',
        trigger_key: 'schedule:2026-06-11T12:00:00Z',
      }),
      hooks(),
    );
    const store = useQuantReportStore();
    expect(store.revision).toBe(1);
    expect(store.lastEvent?.event).toBe('published');
  });

  it('quant.intent bumps the intent revision', () => {
    dispatchWsEnvelope(
      envelope('quant.intent', {
        event: 'created',
        occurred_at: '2026-06-11T12:00:00Z',
        order_intent_id: 'i1',
        reason: null,
        recommendation_id: 'rec-1',
        runtime_mode: 'semi_auto',
        status: 'pending_approval',
      }),
      hooks(),
    );
    expect(useOrderIntentStore().revision).toBe(1);
  });

  it('materialization.run_update bumps the research revision', () => {
    dispatchWsEnvelope(
      envelope('materialization.run_update', {
        kind: 'training',
        run_id: 'run-1',
        status: 'running',
      }),
      hooks(),
    );
    expect(useResearchStore().revision).toBe(1);
  });

  it('quant.reconciliation bumps the reconciliation revision', () => {
    dispatchWsEnvelope(
      envelope('quant.reconciliation', {
        execution_order_id: 'eo-1',
        operator_resolved: true,
        order_intent_id: 'oi-1',
        result: 'filled',
      }),
      hooks(),
    );
    const store = useReconciliationStore();
    expect(store.revision).toBe(1);
    expect(store.lastEvent?.result).toBe('filled');
  });

  it('quant.settlement bumps the settlement-redeem revision', () => {
    dispatchWsEnvelope(
      envelope('quant.settlement', {
        market_id: '0xabc',
        settlement_redeem_id: 'sr-1',
        state: 'confirmed',
      }),
      hooks(),
    );
    const store = useSettlementRedeemStore();
    expect(store.revision).toBe(1);
    expect(store.lastEvent?.state).toBe('confirmed');
  });

  it('config.activated records the active version and delegates the toast', () => {
    const h = hooks();
    dispatchWsEnvelope(envelope('config.activated', { version_id: 'v-9' }), h);
    expect(useSystemStore().activeConfigVersion).toBe('v-9');
    expect(h.onConfigActivated).toHaveBeenCalledWith({ version_id: 'v-9' });
  });

  it('market.book_update caches the book; market.resolved marks silently', () => {
    const h = hooks();
    dispatchWsEnvelope(envelope('market.book_update', marketBook()), h);
    expect(useMarketStore().books['0xabc']).toBeDefined();

    dispatchWsEnvelope(
      envelope('market.resolved', { market_id: '0xabc', outcome: true }),
      h,
    );
    expect(useMarketStore().resolved.has('0xabc')).toBe(true);
    expect(h.onMarketResolved).toHaveBeenCalledWith({
      market_id: '0xabc',
      outcome: true,
    });
  });

  it('system.alert is delegated without store writes', () => {
    const h = hooks();
    const alert = systemAlert();
    dispatchWsEnvelope(envelope('system.alert', alert), h);
    expect(h.onAlert).toHaveBeenCalledWith(alert);
  });

  it('error and unknown frames only warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatchWsEnvelope(envelope('error', { error: 'forbidden' }), hooks());
    dispatchWsEnvelope(
      envelope('trade.filled' as WsEnvelope['type'], {}),
      hooks(),
    );
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
