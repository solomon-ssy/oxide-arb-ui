import type {
  MarketBookView,
  MarketId,
  MarketPageQuery,
  MarketView,
  Paginated,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace MarketApi {
  export const base = '/markets';
  export const detail = (marketId: MarketId) => `${base}/${marketId}`;
  export const book = (marketId: MarketId) => `${base}/${marketId}/book`;
  export const subscribe = (marketId: MarketId) =>
    `${base}/${marketId}/subscribe`;
  export const unsubscribe = (marketId: MarketId) =>
    `${base}/${marketId}/unsubscribe`;
}

/** `GET /markets` — filtered, paginated market catalog with runtime overlay. */
export async function fetchMarketPage(query: MarketPageQuery = {}) {
  return requestClient.get<Paginated<MarketView>>(MarketApi.base, {
    params: query,
  });
}

/** `GET /markets/{market_id}` — single market detail with runtime overlay. */
export async function getMarketById(marketId: MarketId) {
  return requestClient.get<MarketView>(MarketApi.detail(marketId));
}

/** `GET /markets/{market_id}/book` — published YES / NO order books. */
export async function getMarketBook(marketId: MarketId) {
  return requestClient.get<MarketBookView>(MarketApi.book(marketId));
}

/** `POST /markets/{market_id}/subscribe` — add both tokens to the CLOB WS. */
export async function subscribeMarket(marketId: MarketId) {
  return requestClient.post<null>(MarketApi.subscribe(marketId));
}

/** `POST /markets/{market_id}/unsubscribe` — drop the operator overlay. */
export async function unsubscribeMarket(marketId: MarketId) {
  return requestClient.post<null>(MarketApi.unsubscribe(marketId));
}
