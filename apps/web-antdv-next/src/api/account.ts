import type {
  AccountSnapshotView,
  EquitySnapshotQuery,
  EquitySnapshotView,
  LiveAccountView,
  Paginated,
} from '@vben/types';

import { normalizeApiError } from '@vben/request/qp';

import { requestClient } from '#/api/request';

export namespace AccountApi {
  export const base = '/quant/account';
  export const live = `${base}/live`;
  export const snapshot = (id: string) => `${base}/snapshots/${id}`;
  export const equitySnapshots = `${base}/equity-snapshots`;
  export const latestEquitySnapshot = `${base}/equity-snapshots/latest`;
  export const equitySnapshot = (id: string) =>
    `${base}/equity-snapshots/${id}`;
}

/** `GET /quant/account/live` — the freshly-fetched venue account. */
export async function getLiveAccount() {
  return requestClient.get<LiveAccountView>(AccountApi.live);
}

/** `GET /quant/account/snapshots/{id}` — a persisted account snapshot. */
export async function getAccountSnapshot(id: string) {
  return requestClient.get<AccountSnapshotView>(AccountApi.snapshot(id));
}

/** `GET /quant/account/equity-snapshots` — paginated equity history. */
export async function listEquitySnapshots(query: EquitySnapshotQuery = {}) {
  return requestClient.get<Paginated<EquitySnapshotView>>(
    AccountApi.equitySnapshots,
    { params: query },
  );
}

/** `GET /quant/account/equity-snapshots/latest` — newest equity snapshot. */
export async function getLatestEquitySnapshot() {
  return requestClient.get<EquitySnapshotView>(AccountApi.latestEquitySnapshot);
}

/**
 * Same as {@link getLatestEquitySnapshot} but treats an empty history as `null`
 * instead of surfacing HTTP 404 (expected before the first persisted snapshot).
 */
export async function getLatestEquitySnapshotOptional(): Promise<EquitySnapshotView | null> {
  try {
    return await requestClient.get<EquitySnapshotView>(
      AccountApi.latestEquitySnapshot,
    );
  } catch (error) {
    const apiError = normalizeApiError(error);
    if (apiError.httpStatus === 404 || apiError.code === 404) {
      return null;
    }
    throw error;
  }
}

/** `GET /quant/account/equity-snapshots/{id}` — a single equity snapshot. */
export async function getEquitySnapshot(id: string) {
  return requestClient.get<EquitySnapshotView>(AccountApi.equitySnapshot(id));
}
