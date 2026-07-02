import type {
  BpsString,
  DecimalString,
  IsoDateTime,
  MarketId,
  PageQuery,
  PriceString,
  SharesString,
  TimeRangeQuery,
  TokenId,
  UsdString,
} from './common';
import type { MarketCategory, MarketStatus, TickSize } from './enums';

/** Live order-book digest attached to a {@link MarketView} (runtime overlay). */
export interface MarketBookSummaryView {
  yes_best_bid: null | PriceString;
  yes_best_ask: null | PriceString;
  no_best_bid: null | PriceString;
  no_best_ask: null | PriceString;
  /** Total resting notional (bid + ask) across both tokens' books. */
  depth_usd: UsdString;
  /** Publish timestamp of the freshest contributing book (epoch millis). */
  updated_at_ms: number;
}

/** Market catalog row + runtime overlay (`GET /markets`, `GET /markets/{id}`). */
export interface MarketView {
  market_id: MarketId;
  event_id: string;
  question: string;
  slug: string;
  categories: MarketCategory[];
  status: MarketStatus;
  outcome: null | string;
  yes_token_id: TokenId;
  no_token_id: TokenId;
  tick_size: TickSize;
  neg_risk: boolean;
  fees_enabled: boolean;
  /** Whether both tokens are live on the CLOB WS transport. */
  subscribed: boolean;
  /** Live order-book digest; `null` when no book has been published yet. */
  book: MarketBookSummaryView | null;
  end_date: IsoDateTime | null;
  resolved_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Sentinel value for the markets search form — filter rows with empty categories. */
export const MARKET_CATEGORY_UNKNOWN_FILTER = '__unknown__' as const;

/** Filter + pagination query for `GET /markets` (AND-combined). */
export interface MarketPageQuery extends PageQuery {
  /** Case-insensitive substring over question / slug. */
  keyword?: string;
  status?: MarketStatus;
  category?: MarketCategory;
  /** When `true`, match markets with an empty `categories` array. */
  category_unknown?: boolean;
  event_id?: string;
  /** When set, filter markets whose YES/NO tokens are both live on the CLOB WS. */
  subscribed?: boolean;
}

/** One price level of a published order book. */
export interface BookLevelView {
  price: PriceString;
  size: SharesString;
}

/** One token's published order book (bids + asks) at a point in time. */
export interface MarketBookSideView {
  token_id: TokenId;
  bids: BookLevelView[];
  asks: BookLevelView[];
  timestamp_ms: number;
  version: number;
}

/** WS `market.book_update` payload — both sides of one market's book. */
export interface MarketBookView {
  market_id: MarketId;
  yes: MarketBookSideView | null;
  no: MarketBookSideView | null;
}

/** WS `market.resolved` payload. */
export interface MarketResolvedEvent {
  market_id: MarketId;
  outcome: boolean;
}

/** `POST /markets/{market_id}/block` governed request body. */
export interface BlockMarketRequest {
  reason: string;
}

/** `POST /markets/{market_id}/unblock` governed request body. */
export interface UnblockMarketRequest {
  reason: string;
  restore_status?: MarketStatus;
}

/** Bucket resolution of a microstructure series (server-chosen by span). */
export type MicrostructureResolution = 'minute' | 'second';

/** Query for `GET /markets/{market_id}/microstructure` (ISO time window). */
export type MarketMicrostructureQuery = TimeRangeQuery;

/**
 * One microstructure observation bucket (`book_microstructure_1s`/`_1m`).
 * Money / price / bps fields are decimal strings; `imbalance` is a raw ratio
 * in `[-1, 1]`. Any field may be `null` when the bucket lacked that signal.
 */
export interface MicrostructureBucket {
  /** Bucket start time (epoch millis). */
  bucket_ms: number;
  mid_open: null | PriceString;
  mid_close: null | PriceString;
  best_bid_close: null | PriceString;
  best_ask_close: null | PriceString;
  spread_bps_min: BpsString | null;
  spread_bps_avg: BpsString | null;
  spread_bps_max: BpsString | null;
  depth_top1_usd: null | UsdString;
  depth_top5_usd: null | UsdString;
  depth_top20_usd: null | UsdString;
  /** Resting-depth imbalance `(bid - ask) / (bid + ask)`, bid-heavy positive. */
  imbalance: DecimalString | null;
  last_trade_count: number;
  update_count: number;
  gap_count: number;
  crossed_count: number;
}

/** A single last-trade print for the price-chart overlay. */
export interface MarketTradeTick {
  token_id: TokenId;
  /** Trade event time (epoch millis). */
  ts_ms: number;
  price: PriceString;
}

/** `GET /markets/{market_id}/microstructure` — YES/NO history + trade prints. */
export interface MarketMicrostructureView {
  market_id: MarketId;
  yes_token_id: TokenId;
  no_token_id: TokenId;
  resolution: MicrostructureResolution;
  /** Window start (epoch millis). */
  from_ms: number;
  /** Window end (epoch millis). */
  to_ms: number;
  yes: MicrostructureBucket[];
  no: MicrostructureBucket[];
  trades: MarketTradeTick[];
}
