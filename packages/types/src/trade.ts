import type {
  BpsString,
  IsoDateTime,
  MarketId,
  PageQuery,
  PriceString,
  SharesString,
  TokenId,
  UsdString,
  UuidString,
} from './common';
import type {
  ExecutionMode,
  MarketCategory,
  NetProfitKind,
  Side,
  TradeBusinessOutcome,
  TradeReconcileResolution,
  TradeState,
} from './enums';

export type { NetProfitKind };

/**
 * Outbound trade projection, shared verbatim by REST `GET /trades` items and
 * the WS `trade.filled` push (forensic columns are stripped server-side).
 */
export interface TradeView {
  trade_id: UuidString;
  /** Originating opportunity — join key into `GET /opportunities/{id}`. */
  opportunity_id: UuidString;
  market_id: MarketId;
  event_id: string;
  token_id: TokenId;
  side: Side;
  shares: SharesString;
  price: PriceString;
  cost_usd: UsdString;
  fee_usd: UsdString;
  detected_edge_bps: BpsString | null;
  detected_profit_usd: null | UsdString;
  net_profit_usd: null | UsdString;
  /** Fill-time EV semantics — not realized settlement PnL. */
  net_profit_kind: NetProfitKind;
  needs_reconcile: boolean;
  reconcile_resolution: null | TradeReconcileResolution;
  reconciled_at: IsoDateTime | null;
  reconcile_note: null | string;
  state: TradeState;
  business_outcome: null | TradeBusinessOutcome;
  category: MarketCategory;
  execution_mode: ExecutionMode;
  order_id: null | string;
  tx_hash: null | string;
  latency_ms: null | number;
  error_message: null | string;
  submitted_at: IsoDateTime | null;
  confirmed_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Filter + pagination query for `GET /trades` (AND-combined). */
export interface TradePageQuery extends PageQuery {
  market_id?: MarketId;
  side?: Side;
  state?: TradeState;
  business_outcome?: TradeBusinessOutcome;
  execution_mode?: ExecutionMode;
  from?: IsoDateTime;
  to?: IsoDateTime;
}

/** Operator request to record a manual reconciliation conclusion (`POST /trades/{id}/reconcile`). */
export interface ReconcileTradeRequest {
  resolution: TradeReconcileResolution;
  note: string;
}

/** WS `trade.settled` payload — settlement outcome of a previously filled trade. */
export interface TradeSettledEvent {
  trade_id: UuidString;
  outcome: TradeBusinessOutcome;
  pnl: UsdString;
}
