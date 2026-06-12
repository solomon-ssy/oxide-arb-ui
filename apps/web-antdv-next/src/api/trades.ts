import type { Paginated, TradePageQuery, TradeView } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace TradeApi {
  export const base = '/trades';
}

/** `GET /trades` — filtered, paginated trade history (newest first). */
export async function fetchTradePage(query: TradePageQuery = {}) {
  return requestClient.get<Paginated<TradeView>>(TradeApi.base, {
    params: query,
  });
}
