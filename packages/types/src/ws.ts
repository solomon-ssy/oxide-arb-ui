import type { IsoDateTime, MarketId, UuidString } from './common';
import type {
  AlertCategory,
  AlertLevel,
  AlertSource,
  PublicationMode,
} from './enums';
import type { MarketBookView, MarketResolvedEvent } from './market';
import type { OpportunityView } from './opportunity';
import type { LivePnlView, PnlUpdateEvent } from './pnl';
import type { ControlFactorMaterializationRunView } from './replay';
import type { PositionView, RiskEngineStateView } from './risk';
import type { MaterializationScheduleStatusView, SystemStatus } from './system';
import type { TradeSettledEvent, TradeView } from './trade';

/**
 * Subscribable WS channels, mirroring Rust `WsChannel` wire names. The removed
 * `trade.opened` / `opportunity.expired` channels must never be subscribed.
 */
export const WS_CHANNELS = {
  configActivated: 'config.activated',
  controlPublished: 'control.published',
  marketBookUpdate: 'market.book_update',
  marketResolved: 'market.resolved',
  opportunityDetected: 'opportunity.detected',
  pnlUpdate: 'pnl.update',
  riskCircuitBreaker: 'risk.circuit_breaker',
  riskPositionUpdate: 'risk.position_update',
  systemAlert: 'system.alert',
  systemStatus: 'system.status',
  materializationRunUpdate: 'materialization.run_update',
  tradeFilled: 'trade.filled',
  tradeSettled: 'trade.settled',
} as const;

export type WsChannel = (typeof WS_CHANNELS)[keyof typeof WS_CHANNELS];

/** Server-push control reply types (non-channel `type` values). */
export type WsControlType = 'error' | 'pong' | 'sync';

/** Server-to-client message envelope: `{ type, timestamp, data }`. */
export interface WsEnvelope<T = unknown> {
  type: WsChannel | WsControlType;
  /** RFC3339 millisecond UTC emission instant. */
  timestamp: IsoDateTime;
  data: T;
}

/** WS `system.alert` payload. */
export interface SystemAlertEvent {
  idempotency_key: string;
  level: AlertLevel;
  category: AlertCategory;
  source: AlertSource;
  title: string;
  message: string;
  affects_trading: boolean;
  visible_toast: boolean;
  dedupe_secs: number;
}

/** WS `config.activated` payload. */
export interface ConfigActivatedEvent {
  version_id: UuidString;
}

/** WS `control.published` payload. */
export interface ControlPublishedEvent {
  publication_id: UuidString;
  mode: PublicationMode;
}

/** WS `error` reply payload (invalid command / forbidden channel). */
export interface WsErrorFrame {
  error: string;
  detail?: string;
  channel?: string;
}

/**
 * Full-state snapshot replied to a `sync` command. Sections the connection is
 * not authorized to read are omitted entirely (never `null`).
 */
export interface SyncSnapshot {
  system_status?: SystemStatus;
  risk?: RiskEngineStateView;
  open_positions?: PositionView[];
  pnl?: LivePnlView;
  recent_opportunities?: OpportunityView[];
  /** Active materialization runs (`Queued` / `Running`), requires `control_factor:read`. */
  active_materialization_runs?: ControlFactorMaterializationRunView[];
  /** Mode-aware materialization schedule status, requires `control_factor:read`. */
  materialization_schedules?: MaterializationScheduleStatusView[];
}

/** Per-channel payload map for typed envelope narrowing. */
export interface WsChannelPayloads {
  'config.activated': ConfigActivatedEvent;
  'control.published': ControlPublishedEvent;
  'market.book_update': MarketBookView;
  'market.resolved': MarketResolvedEvent;
  'materialization.run_update': ControlFactorMaterializationRunView;
  'opportunity.detected': OpportunityView;
  'pnl.update': PnlUpdateEvent;
  'risk.circuit_breaker': RiskEngineStateView;
  'risk.position_update': PositionView;
  'system.alert': SystemAlertEvent;
  'system.status': SystemStatus;
  'trade.filled': TradeView;
  'trade.settled': TradeSettledEvent;
}

/** Client-to-server command grammar (`action`-tagged). */
export type WsClientCommand =
  | { action: 'ping' }
  | { action: 'subscribe'; channel: WsChannel; market_id?: MarketId }
  | { action: 'sync' }
  | { action: 'unsubscribe'; channel: WsChannel; market_id?: MarketId };
