import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  ProbabilityString,
  TimeRangeQuery,
  UuidString,
} from './common';
import type { CalibrationKind, CalibrationMethod } from './enums';

// ── Shared bias-table curve shapes (market_price_bias payload) ──────────────

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

/** One time-to-resolution bucket of a category bias curve. */
export interface TtrBucketCurveView {
  ttr_lo_secs: number;
  ttr_hi_secs: null | number;
  bins: PriceBiasBinView[];
  ic: DecimalString;
  ic_significant: boolean;
  sample_count: number;
}

/** A per-category empirical-bias curve. */
export interface CategoryBiasCurveView {
  by_ttr: TtrBucketCurveView[];
  sample_count: number;
}

/** Fixed `market_price_bias` artifact payload. */
export interface MarketPriceBiasPayload {
  by_category: Record<string, CategoryBiasCurveView>;
}

// ── Model-score calibrator payload ─────────────────────────────────────────

export interface IsotonicKnotView {
  score: DecimalString;
  probability: DecimalString;
}

export type MonotoneMappingView =
  | { a: DecimalString; b: DecimalString; method: 'platt' }
  | { knots: IsotonicKnotView[]; method: 'isotonic' };

/** One calibrated-probability-bucket reliability-diagram row (mirrors Rust `ReliabilityBin`). */
export interface ReliabilityBinView {
  predicted_lo: DecimalString;
  predicted_hi: DecimalString;
  sample_count: number;
  mean_predicted: ProbabilityString;
  empirical_frequency: ProbabilityString;
  wilson_ci: [ProbabilityString, ProbabilityString];
  mean_adverse_excursion_bps: DecimalString | null;
}

/** Calibration quality metrics + per-bin diagnostics (mirrors Rust `ReliabilityReport`). */
export interface ReliabilityReportView {
  bins: ReliabilityBinView[];
  brier_score: DecimalString;
  log_loss: DecimalString;
  ece: DecimalString;
  n_samples: number;
}

/** Parsed `model_score` artifact payload. */
export interface ModelScoreCalibrationPayload {
  model_version_id: UuidString;
  calibration_dataset_id: UuidString;
  mapping: MonotoneMappingView;
  reliability: ReliabilityReportView;
}

export interface WeatherLeadBiasView {
  lead_hours: number;
  sample_count: number;
  bias_celsius: DecimalString;
}

export interface WeatherStationBiasView {
  station: string;
  temperature_statistic: string;
  leads: WeatherLeadBiasView[];
}

export interface WeatherStationLeadBiasPayload {
  schema_version: number;
  methodology: string;
  methodology_hash: string;
  grid_hashes: string[];
  source_hashes: string[];
  stations: WeatherStationBiasView[];
}

export type CalibrationArtifactPayload =
  | { kind: 'market_price_bias'; payload: MarketPriceBiasPayload }
  | { kind: 'model_score'; payload: ModelScoreCalibrationPayload }
  | {
      kind: 'weather_station_lead_bias';
      payload: WeatherStationLeadBiasPayload;
    };

// ── Calibration artifact catalog ─────────────────────────────────────────────

/** Calibration-artifact summary row (`GET /research/calibration-artifacts`). */
export interface CalibrationArtifactSummaryView {
  artifact_id: UuidString;
  kind: CalibrationKind;
  content_hash: string;
  fit_window_start: IsoDateTime;
  fit_window_end: IsoDateTime;
  sample_count: number;
  active: boolean;
  created_at: IsoDateTime;
}

/** Full calibration-artifact detail (`GET /research/calibration-artifacts/{id}`). */
export interface CalibrationArtifactDetailView {
  artifact_id: UuidString;
  kind: CalibrationKind;
  content_hash: string;
  fit_window_start: IsoDateTime;
  fit_window_end: IsoDateTime;
  calibration_split_hash: string;
  sample_count: number;
  active: boolean;
  created_at: IsoDateTime;
  payload: CalibrationArtifactPayload;
}

/** Filter + pagination for `GET /research/calibration-artifacts`. */
export interface CalibrationArtifactListQuery
  extends PageQuery, TimeRangeQuery {
  kind?: CalibrationKind;
}

/** `POST /research/calibration-artifacts/fit-bias-table` governed request body. */
export interface FitBiasTableRequest {
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  reason: string;
}

/** `POST /research/calibration-artifacts/fit-model-calibrator` governed request body. */
export interface FitModelCalibratorRequest {
  model_version_id: UuidString;
  calibration_dataset_id: UuidString;
  method: CalibrationMethod;
  reason: string;
}

/** `POST /research/calibration-artifacts/{id}/activate` governed request body. */
export interface ActivateCalibrationArtifactRequest {
  reason: string;
}

/**
 * Read-only disjoint + embargo preflight result for the "Fit Model
 * Calibrator" wizard (mirrors Rust `ModelCalibrationFitPreflightView`).
 */
export interface ModelCalibrationFitPreflightView {
  disjoint_ok: boolean;
  embargo_ok: boolean;
  calibration_window_start: IsoDateTime;
  calibration_window_end: IsoDateTime;
  training_window_start: IsoDateTime | null;
  training_window_end: IsoDateTime | null;
  required_start: IsoDateTime | null;
  messages: string[];
}
