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
  ResearchFeedbackEvent,
  SettlementRedeemLifecycleEvent,
  SyncSnapshot,
  SystemAlertEvent,
  SystemControlPlaneStatus,
  WsEnvelope,
} from '@vben/types';

import type { FeedbackRecoveryReason } from '#/store/feedback';

import { useEntryConditionStore } from '#/store/entry-condition';
import { useFeedbackStore } from '#/store/feedback';
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

const FEEDBACK_EVENT_KEYS = [
  'occurred_at',
  'profile_id',
  'revision',
  'subject_id',
  'subject_kind',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFeedbackEvent(value: unknown): value is ResearchFeedbackEvent {
  if (!isRecord(value)) {
    return false;
  }
  const keys = Object.keys(value).toSorted();
  return (
    keys.length === FEEDBACK_EVENT_KEYS.length &&
    keys.every((key, index) => key === FEEDBACK_EVENT_KEYS[index]) &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0 &&
    value.subject_kind === 'feedback_cycle' &&
    typeof value.subject_id === 'string' &&
    value.subject_id.length > 0 &&
    typeof value.profile_id === 'string' &&
    value.profile_id.length > 0 &&
    typeof value.occurred_at === 'string' &&
    !Number.isNaN(Date.parse(value.occurred_at))
  );
}

function feedbackErrorReason(value: unknown): FeedbackRecoveryReason | null {
  if (!isRecord(value) || typeof value.error !== 'string') {
    return null;
  }
  if (
    value.error === 'replay_unavailable' ||
    value.error === 'replay_window_exceeded'
  ) {
    return value.error;
  }
  return null;
}

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
  /** Durable feedback cursor must be recovered over REST before reconnect. */
  onFeedbackRecoveryRequired: (reason: FeedbackRecoveryReason) => void;
  /** `market.resolved` frame — optional UI side-effect (store update is in the dispatcher). */
  onMarketResolved: (event: MarketResolvedEvent) => void;
}

/**
 * Route one server envelope through the canonical channel-to-store dispatch
 * table. Lists always re-fetch over REST; WS only bumps
 * revisions or updates the market book cache. Unknown generic types are logged
 * and dropped. Invalid feedback hints fail closed into REST cursor recovery;
 * `error` frames are logged without toasting (no error storms).
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
      const reason = feedbackErrorReason(envelope.data);
      if (reason !== null) {
        useFeedbackStore().requireRecovery(reason);
        hooks.onFeedbackRecoveryRequired(reason);
      }
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
    case 'research.feedback': {
      if (isFeedbackEvent(envelope.data)) {
        useFeedbackStore().applyEvent(envelope.data);
      } else {
        const reason = 'invalid_feedback_event';
        useFeedbackStore().requireRecovery(reason);
        hooks.onFeedbackRecoveryRequired(reason);
        console.warn('[qp-ws] invalid research.feedback frame:', envelope.data);
      }
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
