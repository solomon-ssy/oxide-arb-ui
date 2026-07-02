import type { IsoDateTime } from './common';

/** `GET /quant/data-quality` — live data-quality aggregate snapshot. */
export interface DataQualitySnapshot {
  as_of: IsoDateTime;
  total_tokens: number;
  fresh: number;
  acceptable: number;
  degraded: number;
  stale: number;
  insufficient: number;
  max_book_age_ms: number;
  max_fact_lag_ms: number;
  worst_fact_lag_ms: number;
  fact_lag_exceeded: boolean;
}
