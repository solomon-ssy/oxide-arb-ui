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
  /** Acceptable book-age threshold (ms) from runtime config. */
  max_book_age_ms: number;
  /** Worst book age (ms) actually observed across the live plane. */
  worst_book_age_ms: number;
  /** Max acceptable ingest pipeline lag (enqueue→flush, ms) from config. */
  max_ingest_lag_ms: number;
  /** Peak ingest pipeline lag (enqueue→flush, ms) observed in the plane. */
  worst_ingest_lag_ms: number;
  /** True when `worst_ingest_lag_ms` exceeds `max_ingest_lag_ms`. */
  ingest_lag_exceeded: boolean;
}
