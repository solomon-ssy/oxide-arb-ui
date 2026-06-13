import type {
  IsoDate,
  IsoDateTime,
  MarketId,
  PageQuery,
  PriceString,
  SharesString,
  TimeRangeQuery,
  TokenId,
  UsdString,
  UuidString,
} from './common';
import type {
  BreakerStateName,
  CircuitBreakerLevel,
  ExecutionMode,
  PositionStatus,
  RedeemStatus,
  RiskAuditEventType,
  Side,
} from './enums';

/** Live risk-engine snapshot (`GET /risk/circuit-breaker`, `sync.risk`). */
export interface RiskEngineStateView {
  breaker_state: BreakerStateName;
  breaker_level: CircuitBreakerLevel | null;
  is_halted: boolean;
  halt_reason: null | string;
  cooldown_until: IsoDateTime | null;
  total_exposure: UsdString;
  hourly_loss_usd: UsdString;
  hourly_fee_usd: UsdString;
  hourly_trade_count: number;
  hourly_success_count: number;
  hourly_miss_count: number;
  daily_pnl: UsdString;
  daily_loss_usd: UsdString;
  daily_fee_usd: UsdString;
  daily_budget_spent: UsdString;
  daily_trade_count: number;
  daily_success_count: number;
  daily_miss_count: number;
  daily_window_start: IsoDate;
  weekly_loss_usd: UsdString;
  weekly_trade_count: number;
  consecutive_misses: number;
  hwm_equity: UsdString;
  last_emergency_at: IsoDateTime | null;
  last_emergency_reason: null | string;
  snapshot_at: IsoDateTime;
}

/** Open/closed position projection (`sync.open_positions`, `risk.position_update`). */
export interface PositionView {
  position_id: UuidString;
  trade_id: UuidString;
  market_id: MarketId;
  token_id: TokenId;
  side: Side;
  /** Mode the position was opened in — ledger rows are mode-scoped. */
  execution_mode: ExecutionMode;
  shares: SharesString;
  avg_entry_price: PriceString;
  total_cost_usd: UsdString;
  total_fees_usd: UsdString;
  unrealized_pnl: UsdString;
  realized_pnl: UsdString;
  status: PositionStatus;
  redeem_status: RedeemStatus;
  settlement_payout_usd: null | UsdString;
  winning_token_id: null | TokenId;
  redeem_tx_hash: null | string;
  opened_at: IsoDateTime;
  closed_at: IsoDateTime | null;
  settled_at: IsoDateTime | null;
}

/**
 * WS `risk.circuit_breaker` trip notification. `level` is the numeric
 * escalation tier (1 trade … 4 system) — a trip carries only `{level, reason}`,
 * so consumers must refetch the full {@link RiskEngineStateView} via REST.
 */
export interface CircuitBreakerTrip {
  level: number;
  reason: string;
}

/**
 * Risk-decision audit event (`GET /trades/decisions` rows).
 *
 * `market_id` / `rejection_reason` are queryable columns lifted at persist
 * time; rows written before those columns existed surface `null`. `payload`
 * is the full forensic `RiskAuditEvent` JSON (check results, sizing trace).
 */
export interface RiskAuditEventView {
  event_type: RiskAuditEventType;
  market_id: MarketId | null;
  opportunity_id: null | UuidString;
  trade_id: null | UuidString;
  rejection_reason: null | string;
  payload: Record<string, unknown>;
  created_at: IsoDateTime;
}

/** Time-window pagination for `GET /trades/decisions` (max span 90 days). */
export interface TradeDecisionsQuery extends PageQuery, TimeRangeQuery {}
