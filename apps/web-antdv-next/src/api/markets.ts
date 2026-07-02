import type {
  BlockMarketRequest,
  MarketBookView,
  MarketId,
  MarketPageQuery,
  MarketView,
  Paginated,
  UnblockMarketRequest,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
import { requestClient } from '#/api/request';

export namespace MarketApi {
  export const base = '/markets';
  export const detail = (marketId: MarketId) => `${base}/${marketId}`;
  export const book = (marketId: MarketId) => `${base}/${marketId}/book`;
  export const subscribe = (marketId: MarketId) =>
    `${base}/${marketId}/subscribe`;
  export const unsubscribe = (marketId: MarketId) =>
    `${base}/${marketId}/unsubscribe`;
  export const block = (marketId: MarketId) => `${base}/${marketId}/block`;
  export const unblock = (marketId: MarketId) => `${base}/${marketId}/unblock`;
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

/** `POST /markets/{market_id}/block` — governed market block. */
export async function blockMarket(
  marketId: MarketId,
  body: BlockMarketRequest,
  ctx: GovernedContext,
) {
  return governedPost<MarketView>(MarketApi.block(marketId), body, ctx);
}

/** `POST /markets/{market_id}/unblock` — governed market unblock/restore. */
export async function unblockMarket(
  marketId: MarketId,
  body: UnblockMarketRequest,
  ctx: GovernedContext,
) {
  return governedPost<MarketView>(MarketApi.unblock(marketId), body, ctx);
}
