import type {
  MarketBookView,
  ResearchFeedbackEvent,
  SyncSnapshot,
  SystemAlertEvent,
  SystemControlPlaneStatus,
  SystemStatus,
  WsEnvelope,
} from '@vben/types';

import type { WsDispatchHooks } from './ws-dispatch';

import { WS_CHANNELS } from '@vben/types';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedbackStore } from '#/store/feedback';
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
    onFeedbackRecoveryRequired: vi.fn(),
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
      revision: 0,
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

function controlPlaneStatus(): SystemControlPlaneStatus {
  const enabled = { enabled: true, reasons: [] };
  return {
    ...systemStatus(),
    capabilities: {
      automatic_parity_eligible: enabled,
      catalog_baseline_ready: enabled,
      control_plane_ready: enabled,
      entry_admission_eligible: enabled,
      order_submission_eligible: enabled,
      report_generation_eligible: enabled,
      research_capture_enabled: enabled,
      revision: 7,
    },
  };
}

function marketBook(): MarketBookView {
  return { market_id: '0xabc', no: null, yes: null };
}

function feedbackEvent(
  overrides: Partial<ResearchFeedbackEvent> = {},
): ResearchFeedbackEvent {
  return {
    occurred_at: '2026-07-29T01:00:00.000Z',
    profile_id: 'crypto_price_15m',
    revision: 7,
    subject_id: '019fa8be-8a00-7f00-8000-000000000001',
    subject_kind: 'feedback_cycle',
    ...overrides,
  };
}

describe('dispatchWsEnvelope', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('exposes the canonical research feedback channel', () => {
    expect(WS_CHANNELS.researchFeedback).toBe('research.feedback');
  });

  it('system.status overwrites the system store and marks status heartbeat', () => {
    const status = controlPlaneStatus();
    dispatchWsEnvelope(envelope('system.status', status), hooks());
    expect(useSystemStore().status).toEqual(status);
    expect(useWsStore().lastSystemStatusAt).toBe('2026-06-11T12:00:00.000Z');
  });

  it('system.status does not clear latched bell alerts', () => {
    const ws = useWsStore();
    ws.recordAlert(
      systemAlert({ idempotency_key: 'kill.emergency', level: 'critical' }),
    );
    dispatchWsEnvelope(
      envelope('system.status', controlPlaneStatus()),
      hooks(),
    );
    expect(ws.recentAlertLevel).toBe('critical');
  });

  it('action eligibility can be invalidated when live control-plane status is lost', () => {
    const system = useSystemStore();
    const allowed = {
      capability: { enabled: true, reasons: [] },
      enabled: true,
      permission_granted: true,
    };
    system.applyActionEligibility({
      capability_revision: 7,
      entry_admission: allowed,
      order_submission: allowed,
      report_generation: allowed,
    });

    system.clearActionEligibility();

    expect(system.actionEligibility).toBeNull();
  });

  it('sync snapshot hydrates system status and marks sync', () => {
    const snapshot: SyncSnapshot = { system_status: controlPlaneStatus() };
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
        empty_reason: null,
        error_code: null,
        event: 'published',
        profile_id: 'weather_forecast_24h',
        published_at: '2026-06-11T12:00:01Z',
        recommendation_count: 2,
        recommendation_report_id: 'r1',
        report_kind: 'top_n',
        runtime_mode: 'report_only',
        status: 'published',
        status_reason: null,
      }),
      hooks(),
    );
    const store = useQuantReportStore();
    expect(store.revision).toBe(1);
    expect(store.lastEvent?.event).toBe('published');
  });

  it('quant.report_run bumps the durable run revision independently', () => {
    dispatchWsEnvelope(
      envelope('quant.report_run', {
        occurred_at: '2026-06-11T12:00:01Z',
        output_report_id: null,
        report_run_id: 'run-1',
        status: 'running',
        terminal_reason: null,
      }),
      hooks(),
    );
    const store = useQuantReportStore();
    expect(store.revision).toBe(0);
    expect(store.runRevision).toBe(1);
    expect(store.lastRunEvent?.report_run_id).toBe('run-1');
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

  it('research.feedback advances only a strictly newer durable revision', () => {
    const h = hooks();
    dispatchWsEnvelope(
      envelope(WS_CHANNELS.researchFeedback, feedbackEvent()),
      h,
    );
    dispatchWsEnvelope(
      envelope(WS_CHANNELS.researchFeedback, feedbackEvent({ revision: 6 })),
      h,
    );

    const store = useFeedbackStore();
    expect(store.revision).toBe(7);
    expect(store.refreshGeneration).toBe(1);
    expect(store.lastEvent?.profile_id).toBe('crypto_price_15m');
    expect(h.onFeedbackRecoveryRequired).not.toHaveBeenCalled();
  });

  it('unknown feedback subjects fail closed into REST recovery', () => {
    const h = hooks();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatchWsEnvelope(
      envelope(WS_CHANNELS.researchFeedback, {
        ...feedbackEvent(),
        subject_kind: 'future_subject',
      }),
      h,
    );

    const store = useFeedbackStore();
    expect(store.revision).toBe(0);
    expect(store.recoveryRequired).toBe(true);
    expect(store.recoveryReason).toBe('invalid_feedback_event');
    expect(h.onFeedbackRecoveryRequired).toHaveBeenCalledWith(
      'invalid_feedback_event',
    );
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('feedback replay errors require an authoritative cursor refresh', () => {
    const h = hooks();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatchWsEnvelope(
      envelope('error', {
        after_revision: 0,
        error: 'replay_window_exceeded',
      }),
      h,
    );

    expect(useFeedbackStore().recoveryReason).toBe('replay_window_exceeded');
    expect(h.onFeedbackRecoveryRequired).toHaveBeenCalledWith(
      'replay_window_exceeded',
    );
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
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
    const h = hooks();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dispatchWsEnvelope(envelope('error', { error: 'forbidden' }), h);
    dispatchWsEnvelope(envelope('trade.filled' as WsEnvelope['type'], {}), h);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(h.onFeedbackRecoveryRequired).not.toHaveBeenCalled();
    expect(useFeedbackStore().recoveryRequired).toBe(false);
    warn.mockRestore();
  });
});
