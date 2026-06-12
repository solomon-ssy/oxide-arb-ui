import type { MarketId, PriceString, SharesString, TokenId } from './common';

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
