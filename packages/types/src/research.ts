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
  DatasetPurpose,
  DownsideSource,
  FactorDefinitionScope,
  FactorDirection,
  FactorFamily,
  FactorNormalization,
  FeatureCellState,
  FeatureParityEventStatus,
  FeatureParityRunKind,
  FeatureParityRunStatus,
  FeatureParityStage,
  MarketCategory,
  ModelFamily,
  PublicationStatus,
  ResearchJobKind,
  ResearchJobStatus,
  TrainingDatasetStatus,
} from './enums';
import type { ModelPickerSide } from './runtime-config';

/** Sample source for a training-dataset build (mirrors Rust `TrainingSampleSource`). */
export type TrainingSampleSource =
  | 'exit_decision'
  | 'historical_pit'
  | 'live_attribution';

// ── Training datasets ───────────────────────────────────────────────────────

/** Aggregate counts of exclusion reasons for a market selection snapshot. */
export interface SelectionExclusionSummary {
  stale_book_count: number;
  insufficient_liquidity_count: number;
  excluded_by_operator_count: number;
  other_count: number;
}

/** Training-matrix integrity gate for the model-owned input and target contract. */
export interface MatrixCoverageProbe {
  accepted_rows: number;
  rejected_rows: number;
  label_rows: number;
  label_name: string;
  label_horizon_secs: number;
  feature_columns: number;
}

/**
 * `TrainingDatasetView.coverage_json` / research-job coverage mirror — per-sample
 * build accounting (mirrors Rust `DatasetCoverage`).
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
  pit_selection_candidates: number;
  pit_selection_included: number;
  pit_selection_excluded: SelectionExclusionSummary;
  feature_state_counts: {
    missing: number;
    not_applicable: number;
    observed: number;
    substituted: number;
  };
  matrix_probe?: MatrixCoverageProbe | null;
}

/** Exact v2 manifest embedded in Parquet and persisted in the dataset ledger. */
export interface DatasetManifestView {
  factor_schema_hash: string;
  feature_schema_hash: string;
  format_version: number;
  horizons_secs: number[];
  knowledge_lag_secs: number;
  label_schema_hash: string;
  model_spec_id: string;
  purpose: DatasetPurpose;
  runtime_config_version_id: UuidString;
  sample_count: number;
  sample_interval_secs: number;
  semantic_dataset_hash: string;
  source_fingerprint: string;
  training_dataset_id: UuidString;
  window_end: IsoDateTime;
  window_start: IsoDateTime;
}

/** `POST /research/training-datasets/plan` result. */
export interface TrainingDatasetPlanView {
  training_dataset_id: UuidString;
  model_spec_id: string;
  runtime_config_version_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  /**
   * Upper-bound total samples (spine + live attribution + exit decision). The
   * exact eligible count only emerges from the build's coverage.
   */
  planned_samples: number;
  /** Deterministic historical spine size (selection × alive instants). */
  spine_upper_bound: number;
  /** When true the UI must block build and prompt to narrow window/interval. */
  hard_cap_exceeded: boolean;
  /**
   * Estimated samples after point-in-time selection eligibility: the upper bound
   * scaled by the sampled keep-rate (falls back to the upper bound when disabled).
   */
  estimated_eligible_samples: number;
  /**
   * Sampled fraction of candidate markets passing the PIT selection funnel, in
   * `[0, 1]`; `null` when the estimate is disabled or has no candidates.
   */
  keep_rate: null | number;
  /** Number of `(market, slice)` eligibility trials backing `keep_rate`. */
  keep_rate_sample_size: number;
}

/** Heuristic (uncalibrated) return model embedded in a trained artifact. */
export interface HeuristicReturnModelView {
  calibration: 'heuristic';
  max_expected_return_bps: DecimalString;
  max_downside_bps: DecimalString;
}

/** Calibrated return model bound to a model-score calibration artifact. */
export interface CalibratedReturnModelView {
  calibration: 'calibrated';
  calibrator_ref: UuidString;
  downside_source: DownsideSource;
}

/** Return / downside mapping provenance on a trained model version. */
export type ReturnModelView =
  | CalibratedReturnModelView
  | HeuristicReturnModelView;

/** `GET /research/training-datasets/{id}` / build result. */
export interface TrainingDatasetView {
  training_dataset_id: UuidString;
  model_spec_id: string;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  status: TrainingDatasetStatus;
  purpose: DatasetPurpose;
  feature_schema_hash: null | string;
  factor_schema_hash: null | string;
  label_schema_hash: null | string;
  dataset_hash: null | string;
  manifest_hash: null | string;
  manifest: DatasetManifestView | null;
  artifact_bytes_hash: null | string;
  parquet_uri: null | string;
  sample_count: null | number;
  /** Global knowledge lag in seconds (PIT cutoff). */
  knowledge_lag_secs: number;
  /** Deterministic sample grid step in seconds. */
  sample_interval_secs: number;
  /** Forward label horizons frozen into this dataset (seconds). */
  horizons_secs: number[];
  feature_schema_version: null | number;
  sample_sources: null | TrainingSampleSource[];
  coverage_json: DatasetCoverage | null;
  runtime_config_version_id: UuidString;
  failure_detail: null | string;
  completed_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

/**
 * `POST /research/training-datasets/plan|build` governed request body (mirrors
 * Rust `BuildTrainingDatasetRequest`). Plan ignores `training_dataset_id`
 * (mints a fresh id); build passes the id returned by plan for stable polling.
 */
export interface BuildTrainingDatasetRequest {
  model_spec_id: string;
  /**
   * What the materialized examples are used for (Phase 11.3 §4). Defaults to
   * `training` server-side; set `calibration` to build an independent
   * held-out split for `ProbabilityCalibrator` fitting (must be disjoint +
   * embargoed from the target model's own training dataset — enforced at
   * fit time, surfaced live by the Fit Model Calibrator preflight check).
   */
  purpose?: DatasetPurpose;
  runtime_config_version_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  /** Deterministic sample grid step in seconds (`>= 1`). */
  sample_interval_secs: number;
  /** Forward label horizons in seconds (one column per horizon, non-empty). */
  horizons_secs: number[];
  /** Global knowledge lag in seconds (PIT cutoff, `>= 1`). */
  knowledge_lag_secs: number;
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
  purpose?: DatasetPurpose;
  status?: TrainingDatasetStatus;
}

// ── Training-serving feature integrity ─────────────────────────────────────

/** Fail-closed runtime latch opened by an exact parity mismatch. */
export interface FeatureIntegrityLatchView {
  blocking_run_id?: null | UuidString;
  last_acknowledged_at?: IsoDateTime | null;
  open: boolean;
  opened_at?: IsoDateTime | null;
  reason?: null | string;
}

/** One durable exact-replay parity run. */
export interface FeatureParityRunView {
  acting_role: string;
  compared_count: number;
  containment_completed_at?: IsoDateTime | null;
  created_at: IsoDateTime;
  failure_code?: null | string;
  failure_detail?: null | string;
  feature_contract_hash: string;
  finished_at?: IsoDateTime | null;
  kind: FeatureParityRunKind;
  matched_count: number;
  mismatched_count: number;
  model_version_id?: null | UuidString;
  parity_run_id: UuidString;
  pending_since?: IsoDateTime | null;
  pending_materialization_count: number;
  reason: string;
  report_id?: null | UuidString;
  requested_by?: null | string;
  started_at?: IsoDateTime | null;
  status: FeatureParityRunStatus;
  total_count: number;
  transform_hash?: null | string;
  training_dataset_id?: null | UuidString;
  triggered_by: string;
  window_end: IsoDateTime;
  window_start: IsoDateTime;
}

/** Integrity-plane summary shown above run/event ledgers. */
export interface FeatureIntegritySummaryView {
  catalog_coverage_start?: IsoDateTime | null;
  catalog_watermark?: IsoDateTime | null;
  feature_state_counts: Partial<Record<FeatureCellState, number>>;
  last_full_run?: FeatureParityRunView | null;
  last_sampled_run?: FeatureParityRunView | null;
  latch: FeatureIntegrityLatchView;
  parity_age_secs?: null | number;
  rejection_reason_counts: Record<string, number>;
}

/** One side of a deterministic online-vs-replay comparison. */
export interface FeatureParityEvidenceView {
  available_at?: IsoDateTime | null;
  cutoff?: IsoDateTime | null;
  effective_at?: IsoDateTime | null;
  fingerprint: string;
  state?: FeatureCellState | null;
  value?: null | string;
}

/** One stage-level evidence comparison within a parity run. */
export interface FeatureParityEventView {
  created_at: IsoDateTime;
  decision_at: IsoDateTime;
  detail: unknown;
  feature_contract_hash: string;
  feature_name?: null | string;
  market_id?: null | string;
  model_run_id?: null | UuidString;
  model_version_id?: null | UuidString;
  online: FeatureParityEvidenceView;
  parity_event_id: UuidString;
  parity_run_id: UuidString;
  reason?: null | string;
  replay: FeatureParityEvidenceView;
  report_id?: null | UuidString;
  stage: FeatureParityStage;
  status: FeatureParityEventStatus;
  training_dataset_id?: null | UuidString;
  transform_hash?: null | string;
}

/** Filter + pagination for `GET /research/feature-integrity/runs`. */
export interface FeatureParityRunListQuery extends PageQuery, TimeRangeQuery {
  kind?: FeatureParityRunKind;
  model_version_id?: UuidString;
  report_id?: UuidString;
  status?: FeatureParityRunStatus;
  training_dataset_id?: UuidString;
}

/** Filter + pagination for `GET /research/feature-integrity/events`. */
export interface FeatureParityEventListQuery extends PageQuery, TimeRangeQuery {
  feature_name?: string;
  model_version_id?: UuidString;
  parity_run_id?: UuidString;
  reason?: string;
  report_id?: UuidString;
  stage?: FeatureParityStage;
  status?: FeatureParityEventStatus;
  training_dataset_id?: UuidString;
}

/** Governed request to enqueue a full deterministic replay. */
export interface RunFullFeatureParityRequest {
  reason: string;
  window_end?: IsoDateTime;
  window_start?: IsoDateTime;
}

/** Governed latch recovery request; the referenced full run must have passed. */
export interface AcknowledgeFeatureParityLatchRequest {
  parity_run_id: UuidString;
  reason: string;
}

// ── Models ──────────────────────────────────────────────────────────────────

/** Ranking diagnostics (not part of the training loss). */
export interface RankingDiagnosticsMetrics {
  mean_rank_ic: DecimalString;
  mean_ndcg_at_k: DecimalString;
  ndcg_k: number;
  group_count: number;
}

/** Discriminates the physical meaning of `held_out_objective` across families. */
export type HeldOutMetricKind =
  | 'mean_rolling_fold_rank_ic'
  | 'neg_total_ltr_loss';

/** Out-of-sample / held-out validation objective shared by trainer families. */
export interface ModelValidationMetrics {
  held_out_objective: DecimalString;
  /** Weighted LTR: `-total_loss`; classical: mean rolling fold Rank IC. */
  held_out_metric?: HeldOutMetricKind;
  held_out_components?: null | ObjectiveComponentMetrics;
  held_out_diagnostics?: null | RankingDiagnosticsMetrics;
  fold_objectives: DecimalString[];
  fold_components?: ObjectiveComponentMetrics[];
  sample_count: number;
  dropped_singleton_groups?: number;
  dropped_singleton_rows?: number;
}

/** Rank loss optimized by the governed weighted trainer (simplex surrogates). */
export type RankLossKind = 'pairwise_ranknet' | 'rank_ic_weighted_ranknet';

/** Optimizer policy for weighted-model simplex training. */
export type TrainingOptimizerKind = 'argmin' | 'coordinate_search';

/** Frozen training-objective provenance on a model version. */
export interface TrainingObjectiveView {
  rank_loss: RankLossKind;
  optimizer: TrainingOptimizerKind;
  lambda_tail: DecimalString;
  tail_fraction: DecimalString;
  lambda_turnover: DecimalString;
  lambda_l2: DecimalString;
  ndcg_k: number;
  pseudo_top_n: number;
  kind?: string;
  note?: string;
}

/** Component-level objective breakdown emitted by LTR trainers. */
export interface ObjectiveComponentMetrics {
  rank_loss: DecimalString;
  tail_penalty: DecimalString;
  turnover_penalty: DecimalString;
  l2_penalty: DecimalString;
  total_loss: DecimalString;
  group_count: number;
  rank_loss_group_count?: number;
  pair_count: number;
}

/** Weighted-factor / sell-scorer trainer metrics. */
export interface WeightedFactorModelMetrics {
  objective?: Record<string, unknown> | TrainingObjectiveView;
  in_sample: {
    components?: ObjectiveComponentMetrics;
    diagnostics?: RankingDiagnosticsMetrics;
    objective_value: DecimalString;
    summary: string;
  };
  validation: ModelValidationMetrics;
}

/** Classical (feature-matrix) trainer metrics (`ml-classical` feature). */
export interface ClassicalModelMetrics {
  kind: string;
  objective?: Record<string, unknown>;
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

export interface FittedInputStateRatesView {
  missing: DecimalString;
  not_applicable: DecimalString;
  observed: DecimalString;
  substituted: DecimalString;
}

export interface FittedInputColumnView {
  category_vocabulary: string[];
  feature: string;
  mean: DecimalString | null;
  median: DecimalString | null;
  required: boolean;
  state_rates: FittedInputStateRatesView;
  std: DecimalString | null;
  unit: string;
  value_kind: string;
}

export interface EncodedModelColumnView {
  kind: string;
  name: string;
  source_feature: string;
}

export interface ModelArtifactDiagnosticsView {
  factor_inputs?: string[];
  format_version: number;
  input_contract?: ModelInputContract;
  input_contract_hash?: string;
  input_transform?: {
    encoded_columns: EncodedModelColumnView[];
    inputs: FittedInputColumnView[];
  };
  input_transform_hash?: string;
  raw_inputs?: Array<ModelInputSpec | string>;
  serialization_format?: string;
  serialized_model_hash?: string;
  serialized_model_uri?: string;
  training_dataset_hash: string;
  training_input_hash: string;
  transform_kind: 'factor_native' | 'fitted_feature_matrix';
}

/** `GET /research/models/{id}` / train result. */
export interface TrainedModelView {
  model_version_id: UuidString;
  model_spec_id: string;
  version: number;
  artifact_hash: string;
  /** Immutable trade policy binding carried by artifact format v3. */
  trade_policy_artifact_id: null | UuidString;
  trade_policy_hash: null | string;
  training_dataset_id: null | UuidString;
  /** CPCV path set bound for publish gates (`undefined` until bound). */
  publish_path_set_id?: null | UuidString;
  publication_status: PublicationStatus;
  metrics: ModelMetrics;
  /** Frozen objective provenance; classical/imported models use explicit non-LTR records. */
  training_objective: Record<string, unknown> | TrainingObjectiveView;
  created_at: IsoDateTime;
  /** Present on `POST .../train` only — materialization run id for WS hints. */
  model_run_id?: UuidString;
  /** Return-model provenance when exposed by the registry projection. */
  return_model?: ReturnModelView;
  /** Spec family wire label (repository JOIN on owning model spec). */
  model_family: ModelFamily | string;
}

/** `POST /research/models/train` governed request body (mirrors Rust `TrainModelRequest`). */
export interface TrainModelRequest {
  /** Frozen training dataset to train on (must be `ready`). */
  training_dataset_id: UuidString;
  reason: string;
}

/** Model family taxonomy (canonical wire labels of `qp_model_family`). */
export type { ModelFamily } from './enums';

export type ModelInputRequiredness = 'optional' | 'required';

/** One governed raw feature consumed by a model, before fitted transforms. */
export interface ModelInputSpec {
  feature_name: string;
  requiredness: ModelInputRequiredness;
}

/** Ordered source-feature graph owned by one model specification. */
export interface ModelInputContract {
  inputs: ModelInputSpec[];
}

export const EMPTY_MODEL_INPUT_CONTRACT: ModelInputContract = { inputs: [] };

/** Frozen target and fold policy owned by a model spec, never a train override. */
export interface ModelTrainingContract {
  target_label_horizon_secs: number;
  target_label_name: string;
  validation_folds: number;
}

export type FeatureContractFamily =
  | 'domain'
  | 'market_metadata'
  | 'microstructure'
  | 'price_book'
  | 'structural'
  | 'time_series';

export type FeatureContractValueKind =
  | 'bool'
  | 'bps'
  | 'category'
  | 'count'
  | 'decimal'
  | 'probability'
  | 'usd';

export type FeatureContractUnit =
  | 'bps'
  | 'count'
  | 'milliseconds'
  | 'none'
  | 'per_second'
  | 'probability'
  | 'ratio'
  | 'seconds'
  | 'shares'
  | 'usd';

export type FeatureContractSource =
  | 'domain_observation_window'
  | 'gamma_metadata'
  | 'microstructure_window'
  | 'neg_risk_sibling_legs'
  | 'published_l2_book'
  | 'resolved_linkage'
  | 'trade_tape_window';

export type FeatureContractPointInTimeRule =
  | 'book_version_at_or_before_source_cutoff'
  | 'fact_at_or_before_source_cutoff'
  | 'linkage_version_at_or_before_source_cutoff'
  | 'metadata_version_at_or_before_source_cutoff';

export type FeatureContractStalenessPolicy =
  | 'max_book_age'
  | 'max_domain_observation_age'
  | 'max_feature_bucket_age'
  | 'max_trade_tape_age'
  | 'none';

export interface FeatureNullPolicyView {
  policy: 'neutral_value' | 'optional' | 'penalize' | 'reject_market';
  value?: DecimalString;
}

/** One raw feature exposed by the active governed FeatureSchema. */
export interface FeatureContractEntryView {
  compute_revision: number;
  family: FeatureContractFamily;
  name: string;
  null_policy: FeatureNullPolicyView;
  point_in_time_rule: FeatureContractPointInTimeRule;
  source: FeatureContractSource;
  staleness_policy: FeatureContractStalenessPolicy;
  unit: FeatureContractUnit;
  value_kind: FeatureContractValueKind;
}

/** `GET /research/feature-contract` active feature catalog. */
export interface FeatureContractView {
  feature_schema_hash: string;
  feature_schema_version: number;
  features: FeatureContractEntryView[];
}

/** Model-spec catalog projection (the dataset/training selector source). */
export interface QuantModelSpecView {
  model_spec_id: string;
  name: string;
  model_family: string;
  prediction_horizon_secs: number;
  feature_schema_version: number;
  label_schema_version: number;
  spec_json: unknown;
  input_contract: ModelInputContract;
  training_contract: ModelTrainingContract;
  status: PublicationStatus;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** `POST /research/model-specs` governed request body (mirrors Rust `CreateModelSpecRequest`). */
export interface CreateModelSpecRequest {
  name: string;
  model_family: ModelFamily;
  prediction_horizon_secs: number;
  feature_schema_version?: number;
  label_schema_version?: number;
  spec_json?: unknown;
  input_contract: ModelInputContract;
  training_contract: ModelTrainingContract;
  reason: string;
}

/** Filter + pagination for `GET /research/model-specs`. */
export interface ModelSpecListQuery extends PageQuery {
  model_family?: ModelFamily;
  status?: PublicationStatus;
}

/** Filter + pagination for `GET /research/models`. */
export interface ModelVersionListQuery extends PageQuery, TimeRangeQuery {
  model_spec_id?: string;
  publication_status?: PublicationStatus;
}

/** Query for `GET /research/models/published-catalog` (the governed
 * `ModelVersionSelect` picker source, 11.2.2 remediation R8). */
export interface ModelPublishedCatalogQuery {
  category?: MarketCategory;
  side: ModelPickerSide;
}

/** One `Published` model version offered by the picker widget. */
export interface PublishedModelOptionView {
  model_version_id: UuidString;
  model_spec_id: string;
  spec_name: string;
  version: number;
  model_family: string;
  /** The artifact's own declared scope (`null` = generic cross-category). */
  category_scope: MarketCategory | null;
  published_at: IsoDateTime | null;
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

/** `POST /research/models/{id}/bind-publish-path-set` governed request body. */
export interface BindPublishPathSetRequest {
  path_set_id: UuidString;
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
  sharpe: DecimalString;
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

/** Sharpe ratio distribution across CPCV φ paths. */
export interface SharpeDistribution {
  min: DecimalString;
  p25: DecimalString;
  median: DecimalString;
  p75: DecimalString;
  max: DecimalString;
  /** Sell CPCV: median calendarized max drawdown across φ paths. */
  median_max_drawdown?: DecimalString | null;
  /** Sell CPCV: median calendarized tail loss (fractional return). */
  median_tail_loss?: DecimalString | null;
  /** Sell CPCV: median model calendar return − exit-at-first baseline. */
  baseline_uplift?: DecimalString | null;
}

/** One reconstructed CPCV backtest path. */
export interface BacktestPathView {
  path_index: number;
  sharpe: DecimalString;
  rank_ic: DecimalString;
  max_drawdown: DecimalString;
  tail_loss: DecimalString;
}

/** `GET /research/backtest-path-sets/{id}` CPCV validation result. */
export interface BacktestPathSetView {
  path_set_id: UuidString;
  model_version_id: UuidString;
  model_run_id: UuidString;
  training_dataset_id: UuidString;
  runtime_config_version_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  path_count: number;
  combination_count: number;
  median_rank_ic: DecimalString;
  sharpe_distribution: SharpeDistribution;
  paths: BacktestPathView[];
  deflated_sharpe: DecimalString;
  dsr_benchmark_sharpe: DecimalString;
  pbo: DecimalString;
  min_track_record_length_secs: null | number;
  /** DSR multiple-testing N (= trial_grid_count). Same population as V. */
  trial_count: number;
  trial_grid_count: number;
  /** Audit-only production coord-search effort (not included in DSR N). */
  coord_search_effective_n: number;
  /** Content hash of the persisted path-set payload (audit / replay). */
  path_set_hash: string;
  created_at: IsoDateTime;
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
  /** Pre-assigned candidate report id on async enqueue; omit on direct calls. */
  backtest_report_id?: UuidString;
}

/** `POST /research/models/{id}/cpcv-backtest` governed request body. */
export interface RunCpcvBacktestRequest {
  /** The exact frozen dataset linked to the model version. */
  training_dataset_id: UuidString;
  /** Governed CPCV/trial-grid runtime policy. */
  runtime_config_version_id: UuidString;
  reason: string;
  path_set_id?: UuidString;
}

/** Filter + pagination for `GET /research/backtest-reports`. */
export interface BacktestReportListQuery extends PageQuery, TimeRangeQuery {
  model_version_id?: UuidString;
}

/** Filter + pagination for `GET /research/backtest-path-sets`. */
export interface BacktestPathSetListQuery extends PageQuery, TimeRangeQuery {
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
  | 'calibration_required'
  | 'category_concentration'
  | 'cpcv_required'
  | 'deflated_sharpe'
  | 'hit_rate'
  | 'label_coverage'
  | 'liquidity_exit_feasible'
  | 'materialization_coverage'
  | 'max_drawdown'
  | 'min_track_record_length'
  | 'no_pit_leakage'
  | 'pbo'
  | 'rank_ic'
  | 'sample_count'
  | 'sell_baseline_uplift'
  | 'sell_fallback_ratio'
  | 'sell_l2_book_fidelity'
  | 'shadow_overlap_stability'
  | 'tail_loss_budget'
  | 'turnover_budget';

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

// ── Research jobs (async long-task engine) ──────────────────────────────────

/** Live progress snapshot (phase + processed/total). */
export interface ResearchJobProgress {
  phase: string;
  processed: number;
  total?: null | number;
}

/** Stable machine code recorded on a research job's failure (mirrors Rust `ResearchJobErrorCode`). */
export type ResearchJobErrorCode =
  | 'cancelled'
  | 'execution_failed'
  | 'interrupted_by_restart'
  | 'interrupted_exceeded_attempts';

/** Structured failure payload recorded on a terminal `failed` job. */
export interface ResearchJobError {
  code: ResearchJobErrorCode;
  message: string;
}

/** `GET /research/jobs/{id}` / enqueue result — one durable research job. */
export interface ResearchJobView {
  job_id: UuidString;
  kind: ResearchJobKind;
  status: ResearchJobStatus;
  model_spec_id?: null | string;
  runtime_config_version_id?: null | UuidString;
  /** Frozen request body (detail drawer / retry preview). */
  params: Record<string, unknown>;
  progress?: null | ResearchJobProgress;
  /** Completion fraction in `[0, 1]` when a positive total is known. */
  progress_pct?: null | number;
  /** Terminal result id (dataset / model version / backtest report). */
  result_ref?: null | UuidString;
  error?: null | ResearchJobError;
  coverage_json?: DatasetCoverage | null;
  requested_by?: null | string;
  acting_role: string;
  parent_job_id?: null | UuidString;
  /** Automatic crash-recovery re-queues so far. */
  recovery_attempt: number;
  max_recovery_attempts: number;
  lease_expires_at?: IsoDateTime | null;
  started_at?: IsoDateTime | null;
  finished_at?: IsoDateTime | null;
  heartbeat_at?: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Filter + pagination for `GET /research/jobs`. */
export interface ResearchJobListQuery extends PageQuery, TimeRangeQuery {
  kind?: ResearchJobKind;
  status?: ResearchJobStatus;
  model_spec_id?: string;
  result_ref?: UuidString;
}

/** `POST /research/jobs/{id}/cancel` governed request body. */
export interface CancelResearchJobRequest {
  reason: string;
}

/** `POST /research/jobs/{id}/retry` governed request body. */
export interface RetryResearchJobRequest {
  reason: string;
}

// ── Factor definitions ──────────────────────────────────────────────────────

/** Factor definition governance projection. */
export interface FactorDefinitionView {
  factor_definition_id: UuidString;
  definition_hash: string;
  feature_contract_hash: string;
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

/** `POST /research/factors/register` governed request body. */
export interface RegisterFactorDefinitionsRequest {
  reason: string;
}

/** `POST /research/factors/publish-batch` governed request body. */
export interface PublishFactorsBatchRequest {
  factor_definition_ids: UuidString[];
  reason: string;
}
