import type {
  AnalyticsDailySeries,
  AnalyticsQueryParams,
  EdgeBucket,
  MarketPerformanceRow,
  PageQuery,
  Paginated,
  WeeklyReport,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace AnalyticsApi {
  export const base = '/analytics';
  export const daily = `${base}/daily`;
  export const weekly = `${base}/weekly`;
  export const edgeDistribution = `${base}/edge-distribution`;
  export const marketPerformance = `${base}/market-performance`;
}

export interface MarketPerformanceParams
  extends AnalyticsQueryParams, PageQuery {}

/** `GET /analytics/daily` — settlement-basis daily `PnL` series. */
export async function fetchDailySeries(params?: AnalyticsQueryParams) {
  return requestClient.get<AnalyticsDailySeries>(AnalyticsApi.daily, {
    params,
  });
}

/** `GET /analytics/weekly` — latest weekly settlement report, or null. */
export async function getWeeklyReport() {
  return requestClient.get<null | WeeklyReport>(AnalyticsApi.weekly);
}

/** `GET /analytics/edge-distribution` — execution-basis edge histogram. */
export async function fetchEdgeDistribution(params?: AnalyticsQueryParams) {
  return requestClient.get<EdgeBucket[]>(AnalyticsApi.edgeDistribution, {
    params,
  });
}

/** `GET /analytics/market-performance` — execution-basis per-market rollup. */
export async function fetchMarketPerformance(params?: MarketPerformanceParams) {
  return requestClient.get<Paginated<MarketPerformanceRow>>(
    AnalyticsApi.marketPerformance,
    { params },
  );
}
