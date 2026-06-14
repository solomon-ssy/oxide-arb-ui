import type {
  CircuitBreakerTrip,
  ConfigActivatedEvent,
  ControlFactorMaterializationRunView,
  ControlPublishedEvent,
  MarketBookView,
  MarketResolvedEvent,
  OpportunityView,
  PnlUpdateEvent,
  PositionView,
  SyncSnapshot,
  SystemAlertEvent,
  SystemStatus,
  TradeSettledEvent,
  TradeView,
  WsEnvelope,
} from '@vben/types';

// Direct module imports (not the `#/store` barrel) keep this reducer free of
// the auth/api dependency chain, so unit tests can drive it with bare Pinia.
import { useMarketStore } from '#/store/market';
import { useOpportunityStore } from '#/store/opportunity';
import { usePnlStore } from '#/store/pnl';
import { useReplayStore } from '#/store/replay';
import { useRiskStore } from '#/store/risk';
import { useSystemStore } from '#/store/system';
import { useTradeStore } from '#/store/trade';
import { useWsStore } from '#/store/ws';

/**
 * UI side-effects delegated by the dispatcher. Store writes happen inside
 * `dispatchWsEnvelope`; anything user-facing (notifications, toasts) or
 * I/O-bearing (the breaker REST refetch) is owned by the caller, which keeps
 * the dispatcher a pure store reducer that unit tests can drive directly.
 */
export interface WsDispatchHooks {
  /** `system.alert` frame — notification center + bell. */
  onAlert: (alert: SystemAlertEvent) => void;
  /**
   * `risk.circuit_breaker` trip. The frame carries only `{level, reason}`,
   * so the handler must refetch the full breaker snapshot via REST.
   */
  onBreakerTrip: (trip: CircuitBreakerTrip) => void;
  /** `config.activated` frame — lightweight info toast. */
  onConfigActivated: (event: ConfigActivatedEvent) => void;
  /** `control.published` frame — lightweight info toast. */
  onControlPublished: (event: ControlPublishedEvent) => void;
  /** `market.resolved` frame — lightweight info toast. */
  onMarketResolved: (event: MarketResolvedEvent) => void;
}

/**
 * Route one server envelope into the domain stores (channel → store
 * dispatch table of phase 7.2 §1.2). Unknown types are logged and dropped;
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
    case 'control.published': {
      hooks.onControlPublished(envelope.data as ControlPublishedEvent);
      break;
    }
    case 'error': {
      console.warn('[oxide-ws] server error frame:', envelope.data);
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
      useReplayStore().upsertRun(
        envelope.data as ControlFactorMaterializationRunView,
      );
      break;
    }
    case 'opportunity.detected': {
      useOpportunityStore().prependFeed(envelope.data as OpportunityView);
      break;
    }
    case 'pnl.update': {
      usePnlStore().applyUpdate(
        envelope.data as PnlUpdateEvent,
        envelope.timestamp,
      );
      break;
    }
    case 'pong': {
      useWsStore().markHeartbeat();
      break;
    }
    case 'risk.circuit_breaker': {
      const trip = envelope.data as CircuitBreakerTrip;
      useRiskStore().recordTrip(trip);
      hooks.onBreakerTrip(trip);
      break;
    }
    case 'risk.position_update': {
      useRiskStore().upsertPosition(envelope.data as PositionView);
      break;
    }
    case 'sync': {
      const snapshot = envelope.data as SyncSnapshot;
      useSystemStore().applySyncSnapshot(snapshot);
      useRiskStore().applySyncSnapshot(snapshot);
      usePnlStore().applySyncSnapshot(snapshot);
      useOpportunityStore().applySyncSnapshot(snapshot);
      useReplayStore().applySyncSnapshot(snapshot);
      useWsStore().markSync();
      if (snapshot.system_status) {
        useWsStore().markSystemStatus(envelope.timestamp);
        useWsStore().reconcileAlertOnSystemStatus(snapshot.system_status);
      }
      break;
    }
    case 'system.alert': {
      hooks.onAlert(envelope.data as SystemAlertEvent);
      break;
    }
    case 'system.status': {
      const status = envelope.data as SystemStatus;
      useSystemStore().applySystemStatus(status);
      useWsStore().markSystemStatus(envelope.timestamp);
      useWsStore().reconcileAlertOnSystemStatus(status);
      break;
    }
    case 'trade.filled': {
      useTradeStore().prependTrade(envelope.data as TradeView);
      break;
    }
    case 'trade.settled': {
      useTradeStore().applySettlement(envelope.data as TradeSettledEvent);
      break;
    }
    default: {
      console.warn('[oxide-ws] unknown message type:', envelope.type);
    }
  }
}
