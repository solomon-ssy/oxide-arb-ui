import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  ProbabilityString,
  TimeRangeQuery,
  UuidString,
} from './common';
import type {
  CalibrationKind,
  CalibrationMethod,
  DownsideSource,
} from './enums';

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

/** A per-category empirical-bias curve (mirrors Rust `CategoryBiasCurveView`). */
export interface CategoryBiasCurveView {
  bins: PriceBiasBinView[];
  ic: DecimalString;
  ic_significant: boolean;
  sample_count: number;
}

/** Parsed `market_price_bias` artifact payload (`payload_json.by_category`). */
export type MarketPriceBiasPayload = Record<string, CategoryBiasCurveView>;

// ── Model-score calibrator payload ─────────────────────────────────────────

export interface IsotonicKnotView {
  score: DecimalString;
  probability: DecimalString;
}

export type MonotoneMappingView =
  | { a: DecimalString; b: DecimalString; method: 'platt' }
  | { knots: IsotonicKnotView[]; method: 'isotonic' };

/** One score-bucket reliability-diagram row (mirrors Rust `ReliabilityBin`). */
export interface ReliabilityBinView {
  score_lo: DecimalString;
  score_hi: DecimalString;
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
  mapping: MonotoneMappingView;
  reliability: ReliabilityReportView;
}

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
  payload_json: MarketPriceBiasPayload | ModelScoreCalibrationPayload;
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

/** `POST /research/models/{id}/bind-calibration` governed request body. */
export interface BindCalibrationRequest {
  calibrator_ref: UuidString;
  downside_source: DownsideSource;
  reason: string;
}

// ── Backward-compat aliases (Phase 11.2 → 11.3) ────────────────────────────

/** @deprecated Use {@link CalibrationArtifactSummaryView} with `artifact_id`. */
export interface BiasTableSummaryView extends CalibrationArtifactSummaryView {
  bias_table_id: UuidString;
  category_count: number;
  total_sample_count: number;
}

/** @deprecated Use {@link CalibrationArtifactDetailView} with `artifact_id`. */
export interface BiasTableDetailView extends Omit<
  CalibrationArtifactDetailView,
  'kind' | 'payload_json'
> {
  bias_table_id: UuidString;
  category_count: number;
  total_sample_count: number;
  by_category: MarketPriceBiasPayload;
}

/** @deprecated Use {@link CalibrationArtifactListQuery}. */
export type BiasTableListQuery = CalibrationArtifactListQuery;

/** @deprecated Use {@link ActivateCalibrationArtifactRequest}. */
export type ActivateBiasTableRequest = ActivateCalibrationArtifactRequest;
