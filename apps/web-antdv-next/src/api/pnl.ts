import type { DailyPnlSeries, LivePnlView, WeeklyReport } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace PnlApi {
  export const base = '/pnl';
  export const live = `${base}/live`;
  export const weekly = `${base}/weekly`;
  export const dailySeries = `${base}/daily-series`;
}

/** `GET /pnl/live` — live in-memory PnL snapshot. */
export async function getLivePnl() {
  return requestClient.get<LivePnlView>(PnlApi.live);
}

/** `GET /pnl/weekly` — latest persisted weekly settlement report (404 if none). */
export async function getWeeklyPnl() {
  return requestClient.get<WeeklyReport>(PnlApi.weekly);
}

/**
 * `GET /pnl/daily-series?days=` — per-day settled PnL history, ascending by
 * date with a running window total. Empty window → `points: []` (no 404).
 *
 * @param days look-back length, default 7, max 90 (server-validated)
 */
export async function getDailyPnlSeries(days?: number) {
  return requestClient.get<DailyPnlSeries>(PnlApi.dailySeries, {
    params: days === undefined ? undefined : { days },
  });
}
