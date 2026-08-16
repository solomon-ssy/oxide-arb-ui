import type {
  EquitySnapshotQuery,
  EquitySnapshotView,
  Paginated,
} from '@vben/types';

import {
  decodeEquitySnapshot,
  decodeLiveAccount,
  decodeMany,
} from '#/api/quant-operator-contract';
import { requestClient } from '#/api/request';

export namespace AccountApi {
  export const base = '/quant/account';
  export const live = `${base}/live`;
  export const equitySnapshots = `${base}/equity-snapshots`;
}

/** `GET /quant/account/live` — the freshly-fetched venue account. */
export async function getLiveAccount() {
  const response = await requestClient.get<unknown>(AccountApi.live);
  return decodeLiveAccount(response);
}

/** `GET /quant/account/equity-snapshots` — paginated equity history. */
export async function listEquitySnapshots(query: EquitySnapshotQuery = {}) {
  const response = await requestClient.get<Paginated<unknown>>(
    AccountApi.equitySnapshots,
    { params: query },
  );
  return {
    ...response,
    items: decodeMany(response.items, decodeEquitySnapshot),
  } satisfies Paginated<EquitySnapshotView>;
}
