import type { IsoDateTime, MarketId, UuidString } from './common';
import type {
  AlertCategory,
  AlertLevel,
  AlertSource,
  MaterializationRunStatus,
} from './enums';
import type { MarketBookView, MarketResolvedEvent } from './market';
import type { SystemStatus } from './system';

/**
 * Subscribable WS channels, mirroring Rust `WsChannel` wire names. This is the
 * closed 8-channel allowlist; no other channel may be subscribed or dispatched.
 */
export const WS_CHANNELS = {
  configActivated: 'config.activated',
  marketBookUpdate: 'market.book_update',
  marketResolved: 'market.resolved',
  materializationRunUpdate: 'materialization.run_update',
  quantIntent: 'quant.intent',
  quantReport: 'quant.report',
  systemAlert: 'system.alert',
  systemStatus: 'system.status',
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

/** `quant.report` lifecycle event kinds (discriminated by `event`). */
export type ReportLifecycleEventKind =
  | 'empty'
  | 'expired'
  | 'failed'
  | 'published'
  | 'revoked'
  | 'started';

/** WS `quant.report` payload — report lifecycle transition. */
export interface ReportLifecycleEvent {
  event: ReportLifecycleEventKind;
  recommendation_report_id: UuidString;
}

/** `quant.intent` lifecycle event kinds (discriminated by `event`). */
export type IntentLifecycleEventKind =
  | 'approved'
  | 'cancelled'
  | 'created'
  | 'expired'
  | 'invalidated'
  | 'rejected';

/** WS `quant.intent` payload — order-intent lifecycle transition. */
export interface IntentLifecycleEvent {
  event: IntentLifecycleEventKind;
  order_intent_id: UuidString;
}

/**
 * WS `materialization.run_update` payload. Producer is deferred (10.5/10.6);
 * the shape is a lean run-status hint for the research workbench polling cue.
 */
export interface MaterializationRunEvent {
  run_id: UuidString;
  status: MaterializationRunStatus;
}

/** WS `error` reply payload (invalid command / forbidden channel). */
export interface WsErrorFrame {
  error: string;
  detail?: string;
  channel?: string;
}

/**
 * Full-state snapshot replied to a `sync` command. Sections the connection is
 * not authorized to read are omitted entirely (never `null`). First version
 * carries only `system_status`.
 */
export interface SyncSnapshot {
  system_status?: SystemStatus;
}

/** Per-channel payload map for typed envelope narrowing. */
export interface WsChannelPayloads {
  'config.activated': ConfigActivatedEvent;
  'market.book_update': MarketBookView;
  'market.resolved': MarketResolvedEvent;
  'materialization.run_update': MaterializationRunEvent;
  'quant.intent': IntentLifecycleEvent;
  'quant.report': ReportLifecycleEvent;
  'system.alert': SystemAlertEvent;
  'system.status': SystemStatus;
}

/** Client-to-server command grammar (`action`-tagged). */
export type WsClientCommand =
  | { action: 'ping' }
  | { action: 'subscribe'; channel: WsChannel; market_id?: MarketId }
  | { action: 'sync' }
  | { action: 'unsubscribe'; channel: WsChannel; market_id?: MarketId };
