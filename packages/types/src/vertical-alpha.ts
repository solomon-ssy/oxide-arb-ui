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

// ── Structural Alpha monitor (Phase 11.2.1+) ────────────────────────────────

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

export interface MissingReasonCountView {
  reason: string;
  count: number;
}

export interface TradeTapeSourceHealthView {
  source: string;
  enabled: boolean;
  token_cursor_count: number;
  bootstrap_count: number;
  catching_up_count: number;
  live_count: number;
  empty_count: number;
  error_count: number;
  worst_lag_blocks: null | number;
  last_updated_at: IsoDateTime | null;
}

export interface TradeTapeCoverageView {
  as_of: IsoDateTime;
  pit_as_of: IsoDateTime;
  pit_cutoff: IsoDateTime;
  window_secs: number;
  source_delay_secs: number;
  active_market_count: number;
  token_cursor_count: number;
  market_cursor_count: number;
  covered_market_ratio: DecimalString;
  source_health: TradeTapeSourceHealthView[];
  missing_reason_breakdown: MissingReasonCountView[];
}

export interface ParticipantConcentrationMarketView {
  market_id: string;
  token_id: string;
  question: string;
  pit_as_of: IsoDateTime;
  pit_cutoff: IsoDateTime;
  trade_count: null | number;
  participant_count: null | number;
  notional_usd: DecimalString | null;
  coverage_ratio: DecimalString | null;
  gini: DecimalString | null;
  hhi: DecimalString | null;
  cr1_share: DecimalString | null;
  composite_raw: DecimalString | null;
  lag_blocks: null | number;
  missing_reason: null | string;
}

export interface ParticipantConcentrationSummaryView {
  as_of: IsoDateTime;
  pit_as_of: IsoDateTime;
  pit_cutoff: IsoDateTime;
  window_secs: number;
  source_delay_secs: number;
  min_unique_participants: number;
  min_notional_usd: DecimalString;
  min_coverage_ratio: DecimalString;
  markets: ParticipantConcentrationMarketView[];
  missing_reason_breakdown: MissingReasonCountView[];
}

export interface ParticipantConcentrationParticipantView {
  participant_address: string;
  participant_role: string;
  trade_count: number;
  notional_usd: DecimalString;
  share: DecimalString;
}

export interface ParticipantConcentrationDetailView {
  as_of: IsoDateTime;
  pit_as_of: IsoDateTime;
  pit_cutoff: IsoDateTime;
  market: ParticipantConcentrationMarketView;
  top_participants: ParticipantConcentrationParticipantView[];
}
