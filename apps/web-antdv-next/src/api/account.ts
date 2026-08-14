import type {
  EquitySnapshotQuery,
  EquitySnapshotView,
  LiveAccountView,
  Paginated,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace AccountApi {
  export const base = '/quant/account';
  export const live = `${base}/live`;
  export const equitySnapshots = `${base}/equity-snapshots`;
}

/** `GET /quant/account/live` — the freshly-fetched venue account. */
export async function getLiveAccount() {
  return requestClient.get<LiveAccountView>(AccountApi.live);
}

/** `GET /quant/account/equity-snapshots` — paginated equity history. */
export async function listEquitySnapshots(query: EquitySnapshotQuery = {}) {
  return requestClient.get<Paginated<EquitySnapshotView>>(
    AccountApi.equitySnapshots,
    { params: query },
  );
}
