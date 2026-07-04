import type { IsoDateTime, MarketId, UuidString } from './common';
import type {
  AlertCategory,
  AlertLevel,
  AlertSource,
  MaterializationRunKind,
  MaterializationRunStatus,
  OrderIntentStatus,
  QuantRuntimeMode,
  RecommendationReportStatus,
  ReconciliationResult,
  ReportKind,
  SettlementRedeemState,
} from './enums';
import type { MarketBookView, MarketResolvedEvent } from './market';
import type { SystemStatus } from './system';

/**
 * Subscribable WS channels, mirroring Rust `WsChannel` wire names. This is the
 * closed 10-channel allowlist; no other channel may be subscribed or dispatched.
 */
export const WS_CHANNELS = {
  configActivated: 'config.activated',
  marketBookUpdate: 'market.book_update',
  marketResolved: 'market.resolved',
  materializationRunUpdate: 'materialization.run_update',
  quantIntent: 'quant.intent',
  quantReconciliation: 'quant.reconciliation',
  quantReport: 'quant.report',
  quantSettlement: 'quant.settlement',
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

/**
 * WS `quant.report` payload — report lifecycle transition (mirrors Rust
 * `ReportLifecycleEvent`). `recommendation_report_id` is `null` for the
 * ephemeral `started` / `failed` signals, which correlate by `trigger_key`.
 */
export interface ReportLifecycleEvent {
  event: ReportLifecycleEventKind;
  trigger_key: string;
  recommendation_report_id: null | UuidString;
  report_kind: ReportKind;
  runtime_mode: QuantRuntimeMode;
  status: RecommendationReportStatus;
  as_of: IsoDateTime;
}

/** `quant.intent` lifecycle event kinds (discriminated by `event`). */
export type IntentLifecycleEventKind =
  | 'admission_rejected'
  | 'approved'
  | 'cancelled'
  | 'created'
  | 'expired'
  | 'failed'
  | 'filled'
  | 'invalidated'
  | 'partially_filled'
  | 'rejected'
  | 'submitted';

/**
 * WS `quant.intent` payload — order-intent lifecycle transition (mirrors Rust
 * `IntentLifecycleEvent`; `reason` carries the status or approval reason).
 */
export interface IntentLifecycleEvent {
  event: IntentLifecycleEventKind;
  order_intent_id: UuidString;
  recommendation_id: UuidString;
  runtime_mode: QuantRuntimeMode;
  status: OrderIntentStatus;
  reason: null | string;
  occurred_at: IsoDateTime;
}

/**
 * WS `materialization.run_update` payload — a lean run-status hint for the
 * research catalog (mirrors Rust `MaterializationRunEvent`). The catalog pages
 * re-fetch the dataset / model / report by id on any bump.
 */
export interface MaterializationRunEvent {
  run_id: UuidString;
  kind: MaterializationRunKind;
  status: MaterializationRunStatus;
  /** The durable research-job id driving this run (async job engine). */
  job_id?: string;
  /** Current execution phase (e.g. `materialize`, `finalize`). */
  phase?: string;
  /** Completion fraction in `[0, 1]` when a positive total is known. */
  pct?: number;
}

/**
 * WS `quant.reconciliation` payload — a reconciliation row detect/update hint
 * (mirrors Rust `ReconciliationLifecycleEvent`). The queue + recovery panel
 * re-fetch over REST on any bump.
 */
export interface ReconciliationLifecycleEvent {
  execution_order_id: UuidString;
  order_intent_id: UuidString;
  result: ReconciliationResult;
  operator_resolved: boolean;
}

/**
 * WS `quant.settlement` payload — a settlement-redeem state transition hint
 * (mirrors Rust `SettlementRedeemLifecycleEvent`). The settlement ledger
 * re-fetches over REST on any bump.
 */
export interface SettlementRedeemLifecycleEvent {
  settlement_redeem_id: UuidString;
  market_id: MarketId;
  state: SettlementRedeemState;
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
  'quant.reconciliation': ReconciliationLifecycleEvent;
  'quant.report': ReportLifecycleEvent;
  'quant.settlement': SettlementRedeemLifecycleEvent;
  'system.alert': SystemAlertEvent;
  'system.status': SystemStatus;
}

/** Client-to-server command grammar (`action`-tagged). */
export type WsClientCommand =
  | { action: 'ping' }
  | { action: 'subscribe'; channel: WsChannel; market_id?: MarketId }
  | { action: 'sync' }
  | { action: 'unsubscribe'; channel: WsChannel; market_id?: MarketId };
