import type {
  Paginated,
  PositionDetailView,
  PositionListQuery,
  PositionView,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace PositionApi {
  export const base = '/quant/positions';
  export const detail = (id: string) => `${base}/${id}`;
}

/** `GET /quant/positions` — paginated system-lot position ledger. */
export async function listPositions(query: PositionListQuery = {}) {
  return requestClient.get<Paginated<PositionView>>(PositionApi.base, {
    params: query,
  });
}

/** `GET /quant/positions/{id}` — a single position. */
export async function getPosition(id: string) {
  return requestClient.get<PositionDetailView>(PositionApi.detail(id));
}
