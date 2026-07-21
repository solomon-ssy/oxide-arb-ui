import type {
  ConfigActivatedEvent,
  EntryConditionLifecycleEvent,
  IntentLifecycleEvent,
  MarketBookView,
  MarketResolvedEvent,
  MaterializationRunEvent,
  ReconciliationLifecycleEvent,
  ReportLifecycleEvent,
  ReportRunLifecycleEvent,
  SettlementRedeemLifecycleEvent,
  SyncSnapshot,
  SystemAlertEvent,
  SystemControlPlaneStatus,
  WsEnvelope,
} from '@vben/types';

import { useEntryConditionStore } from '#/store/entry-condition';
// Direct module imports (not the `#/store` barrel) keep this reducer free of
// the auth/api dependency chain, so unit tests can drive it with bare Pinia.
import { useMarketStore } from '#/store/market';
import { useOrderIntentStore } from '#/store/order-intent';
import { useQuantReportStore } from '#/store/quant-report';
import { useReconciliationStore } from '#/store/reconciliation';
import { useResearchStore } from '#/store/research';
import { useSettlementRedeemStore } from '#/store/settlement-redeem';
import { useSystemStore } from '#/store/system';
import { useWsStore } from '#/store/ws';

/**
 * UI side-effects delegated by the dispatcher. Store writes happen inside
 * `dispatchWsEnvelope`; anything user-facing (notifications, toasts) is owned by
 * the caller, keeping the dispatcher a pure store reducer unit tests can drive.
 */
export interface WsDispatchHooks {
  /** `system.alert` frame — notification center + bell. */
  onAlert: (alert: SystemAlertEvent) => void;
  /** `config.activated` frame — lightweight info toast. */
  onConfigActivated: (event: ConfigActivatedEvent) => void;
  /** `market.resolved` frame — optional UI side-effect (store update is in the dispatcher). */
  onMarketResolved: (event: MarketResolvedEvent) => void;
}

/**
 * Route one server envelope through the canonical channel-to-store dispatch
 * table. Lists always re-fetch over REST; WS only bumps
 * revisions or updates the market book cache. Unknown types are logged and
 * dropped; `error` frames are logged without toasting (no error storms).
 */
export function dispatchWsEnvelope(
  envelope: WsEnvelope,
  hooks: WsDispatchHooks,
): void {
  switch (envelope.type) {
    case 'config.activated': {
      const event = envelope.data as ConfigActivatedEvent;
      useSystemStore().setActiveConfigVersion(event.version_id);
      hooks.onConfigActivated(event);
      break;
    }
    case 'error': {
      console.warn('[qp-ws] server error frame:', envelope.data);
      break;
    }
    case 'market.book_update': {
      useMarketStore().setBook(envelope.data as MarketBookView);
      break;
    }
    case 'market.resolved': {
      const event = envelope.data as MarketResolvedEvent;
      useMarketStore().markResolved(event.market_id);
      hooks.onMarketResolved(event);
      break;
    }
    case 'materialization.run_update': {
      useResearchStore().bumpRevision(envelope.data as MaterializationRunEvent);
      break;
    }
    case 'pong': {
      useWsStore().markHeartbeat();
      break;
    }
    case 'quant.condition': {
      useEntryConditionStore().bumpRevision(
        envelope.data as EntryConditionLifecycleEvent,
      );
      break;
    }
    case 'quant.intent': {
      useOrderIntentStore().bumpRevision(envelope.data as IntentLifecycleEvent);
      break;
    }
    case 'quant.reconciliation': {
      useReconciliationStore().bumpRevision(
        envelope.data as ReconciliationLifecycleEvent,
      );
      break;
    }
    case 'quant.report': {
      useQuantReportStore().bumpRevision(envelope.data as ReportLifecycleEvent);
      break;
    }
    case 'quant.report_run': {
      useQuantReportStore().bumpRunRevision(
        envelope.data as ReportRunLifecycleEvent,
      );
      break;
    }
    case 'quant.settlement': {
      useSettlementRedeemStore().bumpRevision(
        envelope.data as SettlementRedeemLifecycleEvent,
      );
      break;
    }
    case 'sync': {
      const snapshot = envelope.data as SyncSnapshot;
      useSystemStore().applySyncSnapshot(snapshot);
      useWsStore().markSync();
      if (snapshot.system_status) {
        useWsStore().markSystemStatus(envelope.timestamp);
      }
      break;
    }
    case 'system.alert': {
      hooks.onAlert(envelope.data as SystemAlertEvent);
      break;
    }
    case 'system.status': {
      const status = envelope.data as SystemControlPlaneStatus;
      useSystemStore().applyControlPlaneStatus(status);
      useWsStore().markSystemStatus(envelope.timestamp);
      break;
    }
    default: {
      console.warn('[qp-ws] unknown message type:', envelope.type);
    }
  }
}
