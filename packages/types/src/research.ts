import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  ProbabilityString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type {
  FactorDefinitionScope,
  FactorDirection,
  FactorFamily,
  FactorNormalization,
  MarketCategory,
  PublicationStatus,
  TrainingDatasetStatus,
} from './enums';

/** Sample source for a training-dataset build (mirrors Rust `TrainingSampleSource`). */
export type TrainingSampleSource =
  | 'exit_decision'
  | 'historical_pit'
  | 'live_attribution';

// ── Training datasets ───────────────────────────────────────────────────────

/** Optional training-matrix probe (build-time diagnostic; does not gate build). */
export interface MatrixCoverageProbe {
  accepted_rows: number;
  rejected_rows: number;
  label_name: string;
  label_horizon_secs: number;
  feature_columns: number;
}

/**
 * `TrainingDatasetView.coverage_json` content — per-sample build accounting.
 * Backend types the column as opaque JSON but always writes `DatasetCoverage`.
 */
export interface DatasetCoverage {
  planned_samples: number;
  built_examples: number;
  markets: number;
  labels_available: number;
  labels_not_mature: number;
  labels_unavailable: number;
  samples_dropped_insufficient: number;
  live_attribution_candidates: number;
  live_attribution_dropped_missing_evidence: number;
  book_decode_failures: number;
  exit_decision_candidates: number;
  exit_decision_built: number;
  exit_fill_l2_rows: number;
  exit_fill_fallback_rows: number;
  matrix_probe?: MatrixCoverageProbe | null;
}

/** `POST /research/training-datasets/plan` result. */
export interface TrainingDatasetPlanView {
  training_dataset_id: UuidString;
  model_spec_id: string;
  runtime_config_version_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  planned_samples: number;
}

/** `GET /research/training-datasets/{id}` / build result. */
export interface TrainingDatasetView {
  training_dataset_id: UuidString;
  model_spec_id: string;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  status: TrainingDatasetStatus;
  feature_schema_hash: string;
  factor_schema_hash: string;
  label_schema_hash: string;
  dataset_hash: string;
  parquet_uri: string;
  sample_count: number;
  coverage_json: DatasetCoverage;
  runtime_config_version_id: UuidString;
  created_at: IsoDateTime;
}

/**
 * `POST /research/training-datasets/plan|build` governed request body (mirrors
 * Rust `BuildTrainingDatasetRequest`). Plan ignores `training_dataset_id`
 * (mints a fresh id); build passes the id returned by plan for stable polling.
 */
export interface BuildTrainingDatasetRequest {
  model_spec_id: string;
  runtime_config_version_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  /** Deterministic sample grid step in seconds (`>= 1`). */
  sample_interval_secs: number;
  /** Forward label horizons in seconds (one column per horizon, non-empty). */
  horizons_secs: number[];
  /** Feature source visibility delay in seconds (PIT cutoff, `>= 1`). */
  source_delay_secs: number;
  /** Feature schema version to materialize (defaults to 1 server-side). */
  feature_schema_version?: number;
  /** Sample sources (defaults to historical PIT + live attribution server-side). */
  sample_sources?: TrainingSampleSource[];
  reason: string;
  training_dataset_id?: UuidString;
}

/** Filter + pagination for `GET /research/training-datasets`. */
export interface TrainingDatasetListQuery extends PageQuery, TimeRangeQuery {
  model_spec_id?: string;
  status?: TrainingDatasetStatus;
}

// ── Models ──────────────────────────────────────────────────────────────────

/** Out-of-sample rolling-validation objective shared by trainer families. */
export interface ModelValidationMetrics {
  mean_objective: DecimalString;
  fold_objectives: DecimalString[];
  sample_count: number;
}

/** Weighted-factor / sell-scorer trainer metrics. */
export interface WeightedFactorModelMetrics {
  in_sample: { objective_value: DecimalString; summary: string };
  validation: ModelValidationMetrics;
}

/** Classical (feature-matrix) trainer metrics (`ml-classical` feature). */
export interface ClassicalModelMetrics {
  kind: string;
  in_sample: {
    feature_count: number;
    train_samples: number;
    validation_objective: DecimalString;
  };
  validation: ModelValidationMetrics;
  feature_importances: { feature: string; importance: DecimalString }[];
}

/**
 * `TrainedModelView.metrics` — the backend emits a family-shaped JSON object
 * with no shared discriminant tag (weighted-factor omits `kind`, classical
 * carries it), and exit-scorer paths emit `{}`. Consumers feature-detect; the
 * `Record` arm keeps forward-compat with future trainer families.
 */
export type ModelMetrics =
  | ClassicalModelMetrics
  | Record<string, unknown>
  | WeightedFactorModelMetrics;

/** `GET /research/models/{id}` / train result. */
export interface TrainedModelView {
  model_version_id: UuidString;
  model_spec_id: string;
  version: number;
  artifact_hash: string;
  training_dataset_id: null | UuidString;
  publication_status: PublicationStatus;
  metrics: ModelMetrics;
  created_at: IsoDateTime;
  /** Present on `POST .../train` only — materialization run id for WS hints. */
  model_run_id?: UuidString;
}

/** `POST /research/models/train` governed request body (mirrors Rust `TrainModelRequest`). */
export interface TrainModelRequest {
  model_spec_id: string;
  /** Frozen training dataset to train on (must be `built` or `ready`). */
  training_dataset_id: UuidString;
  runtime_config_version_id: UuidString;
  /** `"weighted_factor"` or `"classical:<kind>"` (e.g. `"classical:random_forest"`). */
  model_family: string;
  /** Supervised target label (e.g. `"settlement_outcome"`). */
  label_name: string;
  /** Target label horizon in seconds (`0` for horizon-independent labels). */
  label_horizon_secs: number;
  /**
   * Model-intrinsic prediction horizon frozen into the trained artifact and used
   * online for horizon score multiplier / suggested_horizon_secs (`>= 1`, default 86400).
   */
  prediction_horizon_secs?: number;
  /** Rolling validation folds (`2..=20`, defaults to 3 server-side). */
  validation_folds?: number;
  reason: string;
}

/** Model-spec catalog projection (the dataset/training selector source). */
export interface QuantModelSpecView {
  model_spec_id: string;
  name: string;
  model_family: string;
  prediction_horizon_secs: number;
  status: PublicationStatus;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Filter + pagination for `GET /research/model-specs`. */
export interface ModelSpecListQuery extends PageQuery {
  status?: PublicationStatus;
}

/** Filter + pagination for `GET /research/models`. */
export interface ModelVersionListQuery extends PageQuery, TimeRangeQuery {
  model_spec_id?: string;
  publication_status?: PublicationStatus;
}

/** `POST /research/models/{id}/publish` governed request body. */
export interface PublishModelRequest {
  reason: string;
}

/** `POST /research/models/{id}/rollback` governed request body. */
export interface RollbackModelRequest {
  reason: string;
}

/** `POST /research/models/{id}/retire` governed request body. */
export interface RetireModelRequest {
  reason: string;
}

// ── Backtests / comparison ──────────────────────────────────────────────────

/** Expected-vs-realized agreement summary (`BacktestReportView`). */
export interface ExpectedVsRealized {
  mean_expected_bps: DecimalString;
  mean_realized_bps: DecimalString;
  correlation: DecimalString;
  bias_bps: DecimalString;
}

/** Per-category performance breakdown (domain slice diagnostics). */
export interface CategoryMetric {
  category: MarketCategory;
  sample_count: number;
  rank_ic: DecimalString;
  hit_rate: ProbabilityString;
  mean_realized_bps: DecimalString;
}

/** One point of the cumulative realized-PnL curve. */
export interface PnlCurvePoint {
  as_of: IsoDateTime;
  cumulative_realized_pnl_usd: UsdString;
}

/** Portfolio-level PnL simulation summary. */
export interface PnlSimulation {
  total_allocated_usd: UsdString;
  realized_pnl_usd: UsdString;
  gross_return: DecimalString;
  pnl_curve: PnlCurvePoint[];
}

/** Per-category rank-IC divergence between candidate and baseline. */
export interface CategoryRankIcDelta {
  category: MarketCategory;
  baseline_rank_ic: DecimalString;
  candidate_rank_ic: DecimalString;
  rank_ic_delta: DecimalString;
}

/** `GET /research/backtest-reports/{id}` / backtest result. */
export interface BacktestReportView {
  backtest_report_id: UuidString;
  model_version_id: UuidString;
  model_run_id: UuidString;
  runtime_config_version_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  coverage: DecimalString;
  sample_count: number;
  missing_feature_count: number;
  rank_ic: DecimalString;
  hit_rate: ProbabilityString;
  expected_vs_realized: ExpectedVsRealized;
  max_drawdown: DecimalString;
  turnover: DecimalString;
  tail_loss: DecimalString;
  liquidity_feasibility: ProbabilityString;
  category_breakdown: CategoryMetric[];
  report_pnl_simulation: PnlSimulation;
  report_hash: string;
  parquet_uri: null | string;
  created_at: IsoDateTime;
  comparison_report_id: null | UuidString;
}

/**
 * `POST /research/models/{id}/backtest` governed request body (mirrors Rust
 * `RunBacktestRequest`). The replay window is defined by the frozen dataset, so
 * the request selects the dataset + config (not a window).
 */
export interface RunBacktestRequest {
  /** Frozen, PIT-materialized dataset to replay the model over. */
  training_dataset_id: UuidString;
  runtime_config_version_id: UuidString;
  /** Fit a calibrated return curve + register a calibrated child candidate. */
  calibrate?: boolean;
  /** When set, run pair mode: replay this baseline and persist a comparison. */
  comparison_model_version_id?: UuidString;
  reason: string;
}

/** Filter + pagination for `GET /research/backtest-reports`. */
export interface BacktestReportListQuery extends PageQuery, TimeRangeQuery {
  model_version_id?: UuidString;
}

/** `GET /research/comparison-reports/{id}`. */
export interface ModelComparisonReportView {
  comparison_report_id: UuidString;
  baseline_model_version_id: UuidString;
  candidate_model_version_id: UuidString;
  baseline_report_id: UuidString;
  candidate_report_id: UuidString;
  model_run_id: UuidString;
  rank_ic_delta: DecimalString;
  hit_rate_delta: DecimalString;
  realized_pnl_delta: UsdString;
  score_correlation: DecimalString;
  side_disagreement_rate: DecimalString;
  common_samples: number;
  category_breakdown_diff: CategoryRankIcDelta[];
  comparison_hash: string;
  created_at: IsoDateTime;
}

/** Filter + pagination for `GET /research/comparison-reports`. */
export interface ComparisonReportListQuery extends PageQuery, TimeRangeQuery {
  candidate_model_version_id?: UuidString;
}

// ── Model quality gate (publish readiness) ──────────────────────────────────

/** Whether a gate blocks the advance (`hard`) or is advisory only (`soft`). */
export type GateClass = 'hard' | 'soft';

/** Evaluated state of one gate against its threshold. */
export type GateStatus = 'fail' | 'not_applicable' | 'pass' | 'warn';

/** Which lifecycle transition a gate preview evaluates. */
export type GatePreviewIntent = 'auto_execution' | 'candidate' | 'publish';

/**
 * Stable gate identity wire name (append-only). The SPA keys its labels off
 * this; an unknown id degrades to the raw string.
 */
export type GateId =
  | 'backtest_required'
  | 'category_concentration'
  | 'critical_feature_coverage'
  | 'hit_rate'
  | 'label_coverage'
  | 'liquidity_exit_feasible'
  | 'max_drawdown'
  | 'no_pit_leakage'
  | 'rank_ic'
  | 'sample_count'
  | 'sell_fallback_ratio'
  | 'sell_l2_book_fidelity'
  | 'shadow_overlap_stability';

/** One evaluated gate row — the self-describing scorecard entry. */
export interface GateOutcome {
  gate: GateId;
  class: GateClass;
  status: GateStatus;
  observed: string;
  threshold: string;
  detail: string;
}

/**
 * `GET /research/models/{id}/quality-gate` — read-only publish-readiness
 * dry-run. `gates` is the complete ledger; the hard/soft split is derived by
 * filtering on `class` / `status`.
 */
export interface QualityGateReportView {
  intent: GatePreviewIntent;
  evaluated_at: IsoDateTime;
  passed: boolean;
  gates: GateOutcome[];
  report_hash: string;
}

/** Query for `GET /research/models/{id}/quality-gate`. */
export interface QualityGatePreviewQuery {
  intent?: GatePreviewIntent;
  backtest_report_id?: UuidString;
}

// ── Factor definitions ──────────────────────────────────────────────────────

/** Factor definition governance projection. */
export interface FactorDefinitionView {
  factor_definition_id: UuidString;
  name: string;
  factor_family: FactorFamily;
  scope: FactorDefinitionScope;
  input_schema_version: string;
  output_schema_version: string;
  status: PublicationStatus;
  /** Normalization method projected from the governed definition. */
  normalization: FactorNormalization | null;
  /** Default contribution direction. */
  direction: FactorDirection | null;
  /** Stable feature names this factor consumes. */
  input_features: string[];
  /** Whether the factor is required (declares at least one quality gate). */
  required: boolean;
  /** Names of the quality gates governing this factor. */
  quality_gates: string[];
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Filter + pagination for `GET /research/factors`. */
export interface FactorDefinitionListQuery extends PageQuery {
  factor_family?: FactorFamily;
  scope?: FactorDefinitionScope;
  status?: PublicationStatus;
}

/** One collinear factor pair from the collinearity report. */
export interface CollinearPairView {
  left: string;
  right: string;
  correlation: DecimalString;
}

/**
 * Which value plane the collinearity matrix is computed over. `raw` (default)
 * correlates pre-normalization values — the correct plane for detecting
 * same-signal factors; `normalized` correlates the post-normalization scores.
 */
export type FactorCollinearitySource = 'normalized' | 'raw';

/** `GET /research/factors/collinearity` — Spearman collinearity analysis. */
export interface FactorCollinearityView {
  factors: string[];
  matrix: DecimalString[][];
  violations: CollinearPairView[];
  threshold: DecimalString;
  observation_count: number;
  lookback_secs: number;
  panel_source: FactorCollinearitySource;
}

/** Query for `GET /research/factors/collinearity`. */
export interface FactorCollinearityQuery {
  lookback_secs?: number;
  threshold?: string;
  source?: FactorCollinearitySource;
}

/** `POST /research/factors/{id}/publish` governed request body. */
export interface PublishFactorRequest {
  reason: string;
}

/** `POST /research/factors/{id}/retire` governed request body. */
export interface RetireFactorRequest {
  reason: string;
}
