import type {
  IsoDateTime,
  MarketId,
  PageQuery,
  PriceString,
  SharesString,
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

/** Filter + pagination query for `GET /markets` (AND-combined). */
export interface MarketPageQuery extends PageQuery {
  /** Case-insensitive substring over question / slug. */
  keyword?: string;
  status?: MarketStatus;
  category?: MarketCategory;
  event_id?: string;
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
