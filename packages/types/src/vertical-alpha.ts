import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  TimeRangeQuery,
  UuidString,
} from './common';

// ── Favorite-longshot bias tables (Phase 11.2.1) ────────────────────────────

/** One `(category, price_bucket)` empirical-bias record (mirrors Rust `PriceBiasBinView`). */
export interface PriceBiasBinView {
  price_lo: DecimalString;
  price_hi: DecimalString;
  implied_mid: DecimalString;
  realized_frequency: DecimalString;
  bias: DecimalString;
  bias_ci: [DecimalString, DecimalString];
  sample_count: number;
}

/** A per-category empirical-bias curve (mirrors Rust `CategoryBiasCurveView`). */
export interface CategoryBiasCurveView {
  bins: PriceBiasBinView[];
  ic: DecimalString;
  ic_significant: boolean;
  sample_count: number;
}

/** Bias-table catalog summary row (`GET /research/bias-tables`). */
export interface BiasTableSummaryView {
  bias_table_id: UuidString;
  content_hash: string;
  fit_window_start: IsoDateTime;
  fit_window_end: IsoDateTime;
  category_count: number;
  total_sample_count: number;
  created_at: IsoDateTime;
}

/** Full bias-table detail (`GET /research/bias-tables/{id}`). */
export interface BiasTableDetailView {
  bias_table_id: UuidString;
  content_hash: string;
  fit_window_start: IsoDateTime;
  fit_window_end: IsoDateTime;
  calibration_split_hash: string;
  category_count: number;
  total_sample_count: number;
  created_at: IsoDateTime;
  /** Per-category curves keyed by market-category wire slug. */
  by_category: Record<string, CategoryBiasCurveView>;
}

/** Filter + pagination for `GET /research/bias-tables`. */
export type BiasTableListQuery = PageQuery & TimeRangeQuery;

/** `POST /research/bias-tables/fit` governed request body. */
export interface FitBiasTableRequest {
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  reason: string;
}

/** `POST /research/bias-tables/{id}/activate` governed request body. */
export interface ActivateBiasTableRequest {
  reason: string;
}

// ── Neg-risk structural monitor (Phase 11.2.1) ──────────────────────────────

/** One YES leg of a neg-risk event with its live best ask. */
export interface NegRiskLegView {
  market_id: string;
  yes_token_id: string;
  question: string;
  best_ask: DecimalString | null;
}

/** Per-event neg-risk leg-sum drift snapshot (`GET /quant/structural/negrisk-events`). */
export interface NegRiskEventDriftView {
  event_id: string;
  title: string;
  leg_count: number;
  ask_sum: DecimalString | null;
  drift: DecimalString | null;
  legs: NegRiskLegView[];
  as_of: IsoDateTime;
}
