import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  Paginated,
  ProbabilityString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type {
  CohortCensorReason,
  CohortExclusionReason,
  DatasetPurpose,
  DownsideSource,
  FactorDefinitionScope,
  FactorFamily,
  FactorNormalization,
  FeatureCellState,
  FeatureParityEventStatus,
  FeatureParityRunKind,
  FeatureParityRunStatus,
  FeatureParityStage,
  FeedbackCohort,
  MarketCategory,
  ModelFamily,
  ResearchJobKind,
  ResearchJobResultKind,
  ResearchJobStatus,
  TrainingDatasetStatus,
} from './enums';
import type {
  ModelInputContract,
  ModelInputSpec,
  ModelSpecThesis,
} from './generated/research-model-api';
import type { PortfolioRejectionReason } from './quant-report';
import type {
  ResearchProfileRef,
  SourceSliceManifestRef,
} from './research-profile';

/** Buy-side ranker or Sell-side exit model picker scope. */
export type ModelPickerSide = 'buy' | 'sell';

/** Sample source for a training-dataset build (mirrors Rust `TrainingSampleSource`). */
export type TrainingSampleSource = 'exit_decision' | 'historical_pit';

// ── Training datasets ───────────────────────────────────────────────────────

/** Immutable factor-definition document embedded in a serving plane. */
export interface FactorServingDefinitionDocument {
  computation: {
    semantic_key: string;
    semantic_version: number;
  };
  family: FactorFamily;
  input_features: string[];
  name: string;
  normalization: FactorNormalization;
  output: FactorOutputSemantics;
  owner: string;
  required: boolean;
}

/** Exact immutable factor revision embedded in a serving plane. */
export interface FactorServingDefinitionRef {
  definition: FactorServingDefinitionDocument;
  definition_hash: string;
  factor_definition_id: UuidString;
  feature_contract_hash: string;
  input_schema_version: number;
  output_schema_version: number;
  revision_version: number;
}

/** Complete content-addressed factor revision plane. */
export interface FactorServingPlane {
  definitions: FactorServingDefinitionRef[];
  factor_schema_hash: string;
  format_version: number;
}

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
 * `TrainingDatasetView.coverage` / research-job coverage mirror — per-sample
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

/** Exact server-derived Source Slice lineage frozen before materialization. */
export interface DatasetSourceLineage {
  capability_registry_hashes: string[];
  decision_policy_snapshot_id: UuidString;
  format_version: number;
  pit_cutoff: IsoDateTime;
  reader_contract_version: string;
  research_profile_artifact_id: string;
  research_program_hash: string;
  runtime_config_hash: string;
  schema_contract_version: string;
  source_schema_hash: string;
  source_slice: SourceSliceManifestRef;
  source_slice_id: UuidString;
  source_slice_identity_hash: string;
  source_window_end: IsoDateTime;
  source_window_start: IsoDateTime;
}

/** Exact profile and time bounds frozen before a feedback scan. */
export interface DatasetCohortWindow {
  cutoff: IsoDateTime;
  profile_ref: ResearchProfileRef;
  window_start: IsoDateTime;
}

/** One canonical non-zero exclusion bucket. */
export interface DatasetCohortExclusionCount {
  count: number;
  reason: CohortExclusionReason;
}

/** One canonical non-zero censor bucket. */
export interface DatasetCohortCensorCount {
  count: number;
  reason: CohortCensorReason;
}

/** Reconciled candidate-classification counts for a frozen cohort. */
export interface DatasetCohortCounts {
  candidate_count: number;
  censor_counts: DatasetCohortCensorCount[];
  eligible_count: number;
  exclusion_counts: DatasetCohortExclusionCount[];
  included_count: number;
}

/** Content-addressed sealed cohort rows consumed by one dataset. */
export interface DatasetCohortArtifactRef {
  bytes_hash: string;
  row_count: number;
  schema_hash: string;
  source_hash: string;
  uri: string;
}

/** Immutable cohort definition and reconciliation evidence. */
export interface DatasetCohortManifest {
  artifact: DatasetCohortArtifactRef;
  capability_registry_hashes: string[];
  cohort: FeedbackCohort;
  counts: DatasetCohortCounts;
  format_version: number;
  window: DatasetCohortWindow;
}

/** Exact v3 manifest embedded in Parquet and persisted in the dataset ledger. */
export interface DatasetManifestView {
  cohort_manifest: DatasetCohortManifest | null;
  factor_serving_plane: FactorServingPlane;
  feature_schema_hash: string;
  feature_schema_version: number;
  format_version: number;
  horizons_secs: number[];
  knowledge_lag_secs: number;
  label_schema_hash: string;
  model_family: ModelFamily;
  model_spec_id: string;
  model_spec_definition_hash: string;
  purpose: DatasetPurpose;
  sample_count: number;
  sample_interval_secs: number;
  semantic_dataset_hash: string;
  source_lineage: DatasetSourceLineage;
  source_fingerprint: string;
  trade_policy_artifact_id: null | UuidString;
  trade_policy_hash: null | string;
  training_dataset_id: UuidString;
  window_end: IsoDateTime;
  window_start: IsoDateTime;
}

/** `POST /research/training-datasets/plan` result. */
export interface TrainingDatasetPlanView {
  training_dataset_id: UuidString;
  model_spec_id: string;
  model_spec_definition_hash: string;
  decision_policy_snapshot_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  /**
   * Upper-bound total samples (spine + exit decision). The
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
  model_family: ModelFamily;
  model_spec_definition_hash: string;
  factor_serving_plane: FactorServingPlane;
  research_profile_artifact_id: string;
  source_slice_id: UuidString;
  pit_cutoff: IsoDateTime;
  source_lineage: DatasetSourceLineage;
  feedback_cohort: FeedbackCohort | null;
  cohort_manifest: DatasetCohortManifest | null;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  status: TrainingDatasetStatus;
  purpose: DatasetPurpose;
  feature_schema_hash: string;
  factor_schema_hash: string;
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
  feature_schema_version: number;
  sample_sources: null | TrainingSampleSource[];
  coverage: DatasetCoverage | null;
  decision_policy_snapshot_id: UuidString;
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
  profile_ref: ResearchProfileRef;
  /**
   * What the materialized examples are used for. Defaults to `training`
   * server-side; set `calibration` to build an independent
   * held-out split for `ProbabilityCalibrator` fitting (must be disjoint +
   * embargoed from the target model's own training dataset — enforced at
   * fit time, surfaced live by the Fit Model Calibrator preflight check).
   */
  purpose?: DatasetPurpose;
  decision_policy_snapshot_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  /** Frozen information cutoff; server derives every source identity and object. */
  pit_cutoff: IsoDateTime;
  /** Deterministic sample grid step in seconds (`>= 1`). */
  sample_interval_secs: number;
  /** Forward label horizons in seconds (one column per horizon, non-empty). */
  horizons_secs: number[];
  /** Global knowledge lag in seconds (PIT cutoff, `>= 1`). */
  knowledge_lag_secs: number;
  /** Feature schema version to materialize (defaults to 1 server-side). */
  feature_schema_version?: number;
  /** Sample sources frozen by the server-side dataset plan. */
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
  | 'negative_total_learning_to_rank_loss';

/** Out-of-sample / held-out validation objective shared by trainer families. */
export interface ModelValidationMetrics {
  held_out_objective: DecimalString;
  held_out_components: null | ObjectiveComponentMetrics;
  held_out_diagnostics: null | RankingDiagnosticsMetrics;
  fold_objectives: DecimalString[];
  fold_components: ObjectiveComponentMetrics[];
  sample_count: number;
  dropped_singleton_groups: number;
  dropped_singleton_rows: number;
  coordinate_search_effective_trials: number;
  held_out_metric: HeldOutMetricKind;
}

/** Rank loss optimized by the governed weighted trainer (simplex surrogates). */
export type RankLossKind = 'pairwise_ranknet' | 'rank_ic_weighted_ranknet';

/** Optimizer policy for weighted-model simplex training. */
export type TrainingOptimizerKind = 'argmin' | 'coordinate_search';

/** Frozen LTR objective definition. */
export interface TrainingObjectiveSpec {
  rank_loss: RankLossKind;
  optimizer: TrainingOptimizerKind;
  lambda_tail: DecimalString;
  tail_fraction: DecimalString;
  lambda_turnover: DecimalString;
  lambda_l2: DecimalString;
  ndcg_k: number;
  pseudo_top_n: number;
}

export type ClassicalKind =
  | 'elastic_net'
  | 'extra_trees'
  | 'lasso'
  | 'logistic_regression'
  | 'random_forest'
  | 'ridge';

export type ModelTrainingObjectiveDefinition =
  | {
      kind: 'classical_pointwise';
      model_kind: ClassicalKind;
      validation_metric: 'mean_rolling_fold_rank_ic';
    }
  | { kind: 'hand_authored'; rationale: string }
  | { kind: 'learning_to_rank'; spec: TrainingObjectiveSpec };

/** Versioned, closed training-provenance document persisted on a model version. */
export interface ModelTrainingObjective {
  format_version: 1;
  definition: ModelTrainingObjectiveDefinition;
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

export interface LearningToRankInSampleMetrics {
  objective_value: DecimalString;
  components: ObjectiveComponentMetrics;
  diagnostics: null | RankingDiagnosticsMetrics;
  summary: string;
}

export interface ClassicalInSampleMetrics {
  validation_objective: DecimalString;
  train_samples: number;
  feature_count: number;
}

export interface ModelFeatureImportance {
  feature: string;
  importance: DecimalString;
}

export type ModelArtifactTrainingLineage =
  | {
      factor_inputs: string[];
      input_contract_hash: string;
      input_transform_hash: string;
      kind: 'factor_native';
      training_dataset_hash: string;
      training_input_hash: string;
    }
  | {
      input_contract_hash: string;
      input_transform_hash: string;
      kind: 'fitted_feature_matrix';
      model_kind: ClassicalKind;
      serialization_format: 'bincode' | 'json';
      serialized_model_hash: string;
      training_dataset_hash: string;
      training_input_hash: string;
    };

export type ModelVersionMetricsDefinition =
  | {
      artifact_lineage: ModelArtifactTrainingLineage;
      feature_importances: ModelFeatureImportance[];
      in_sample: ClassicalInSampleMetrics;
      kind: 'classical_pointwise';
      model_kind: ClassicalKind;
      validation: ModelValidationMetrics;
    }
  | {
      artifact_lineage: ModelArtifactTrainingLineage;
      in_sample: LearningToRankInSampleMetrics;
      kind: 'learning_to_rank';
      validation: ModelValidationMetrics;
    }
  | { kind: 'not_measured'; rationale: string };

/** Closed, versioned model metrics document; no untyped forward-compat arm. */
export interface ModelVersionMetrics {
  format_version: 1;
  definition: ModelVersionMetricsDefinition;
}

/** `GET /research/models/{id}` / train result. */
export interface TrainedModelView {
  model_version_id: UuidString;
  model_spec_id: string;
  model_spec_name: string;
  model_spec_thesis: ModelSpecThesis;
  model_spec_definition_hash: string;
  version: number;
  artifact_hash: string;
  /** Immutable trade policy binding carried by artifact format v3. */
  trade_policy_artifact_id: null | UuidString;
  trade_policy_hash: null | string;
  training_dataset_id: null | UuidString;
  metrics: ModelVersionMetrics;
  /** Frozen objective provenance; classical/imported models use explicit non-LTR records. */
  training_objective: ModelTrainingObjective;
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

export type {
  CreateModelSpecRequest,
  FeatureContractEntryView,
  FeatureContractView,
  FeatureNullPolicyView,
  ModelInputContract,
  ModelInputSpec,
  ModelSpecThesis,
  ModelTrainingContract,
  QuantModelSpecView,
  RunCpcvBacktestRequest,
} from './generated/research-model-api';

export type ModelInputRequiredness = ModelInputSpec['requiredness'];

export const EMPTY_MODEL_INPUT_CONTRACT: ModelInputContract = { inputs: [] };

/** Filter + pagination for `GET /research/model-specs`. */
export interface ModelSpecListQuery extends PageQuery {
  model_family?: ModelFamily;
}

/** Filter + pagination for `GET /research/models`. */
export interface ModelVersionListQuery extends PageQuery, TimeRangeQuery {
  model_spec_id?: string;
}

/** Query for `GET /research/models/route-candidates`. */
export interface ModelRouteCandidateQuery {
  category?: MarketCategory;
  side: ModelPickerSide;
}

/** One immutable model version offered to route-governance workflows. */
export interface ModelRouteCandidateView {
  model_version_id: UuidString;
  model_spec_id: string;
  spec_name: string;
  version: number;
  artifact_hash: string;
  model_family: ModelFamily;
  /** The artifact's own declared scope (`null` = generic cross-category). */
  category_scope: MarketCategory | null;
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
  decision_at: IsoDateTime;
  cumulative_realized_pnl_usd: UsdString;
}

/** Portfolio-level PnL simulation summary. */
export interface PnlSimulation {
  total_allocated_usd: UsdString;
  realized_pnl_usd: UsdString;
  gross_return: DecimalString;
  pnl_curve: PnlCurvePoint[];
}

/** One canonical economic-tier exclusion tally in an offline replay. */
export interface BacktestTierExclusionCount {
  reason: PortfolioRejectionReason;
  count: number;
}

/** Count-conserving model-candidate → executable-entry replay funnel. */
export interface BacktestPortfolioFunnel {
  schema_version: number;
  decision_tick_count: number;
  emitted_candidate_count: number;
  candidate_without_executable_tier_count: number;
  executable_tier_count: number;
  admission_rejected_tier_count: number;
  admitted_tier_count: number;
  selected_tier_count: number;
  executed_entry_count: number;
  resolved_allocation_count: number;
  no_candidate_tick_count: number;
  no_executable_tier_tick_count: number;
  no_selection_tick_count: number;
  selected_tick_count: number;
  tier_exclusion_reasons: BacktestTierExclusionCount[];
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
  evaluation_dataset_id: UuidString;
  model_run_id: UuidString;
  decision_policy_snapshot_id: UuidString;
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
  portfolio_funnel: BacktestPortfolioFunnel;
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
  /** Median OOS max drawdown across complete CPCV paths. */
  median_max_drawdown?: DecimalString | null;
  /** Median worst-quantile mean OOS return across complete CPCV paths. */
  median_tail_loss?: DecimalString | null;
  /** Median OOS one-sided portfolio turnover across complete CPCV paths. */
  median_turnover?: DecimalString | null;
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
  decision_policy_snapshot_id: UuidString;
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
  /** Conservative DSR N from identified dependence, or raw M for an undefined no-trade pair. */
  dsr_conservative_independent_trial_count: number;
  trial_grid_count: number;
  /** Audit-only production coord-search effort (not included in DSR N). */
  coord_search_effective_n: number;
  /** Content hash of the persisted path-set payload (audit / replay). */
  path_set_hash: string;
  created_at: IsoDateTime;
}

/**
 * `POST /research/models/{id}/backtest` governed request body (mirrors Rust
 * `RunBacktestRequest`). The replay window is defined by the frozen Evaluation
 * dataset, so the request selects the holdout + config (not a window).
 */
export interface RunBacktestRequest {
  /** Frozen, reusable Evaluation holdout to replay the model over. */
  evaluation_dataset_id: UuidString;
  decision_policy_snapshot_id: UuidString;
  /** When set, run pair mode: replay this baseline and persist a comparison. */
  comparison_model_version_id?: UuidString;
  reason: string;
  /** Pre-assigned candidate report id on async enqueue; omit on direct calls. */
  backtest_report_id?: UuidString;
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

// ── Model quality gate ───────────────────────────────────────────────────────

/** Whether a gate blocks the advance (`hard`) or is advisory only (`soft`). */
export type GateClass = 'hard' | 'soft';

/** Evaluated state of one gate against its threshold. */
export type GateStatus = 'fail' | 'not_applicable' | 'pass' | 'warn';

/** Which governed transition a gate preview evaluates. */
export type GatePreviewIntent =
  | 'auto_execution'
  | 'candidate'
  | 'route_activation';

/**
 * Stable gate identity wire name (append-only). The SPA keys its labels off
 * this; an unknown id degrades to the raw string.
 */
export type GateId =
  | 'calibration_required'
  | 'category_concentration'
  | 'cpcv_path_count'
  | 'cpcv_required'
  | 'deflated_sharpe'
  | 'explainability_required'
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
  | 'shadow_decision_overlap'
  | 'tail_loss_budget'
  | 'turnover_budget'
  | 'validation_evidence_required';

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
  | 'execution_retry_exhausted'
  | 'execution_retry_scheduled'
  | 'interrupted_by_restart'
  | 'interrupted_exceeded_attempts';

/** Structured terminal failure or active retry diagnostic. */
export interface ResearchJobError {
  code: ResearchJobErrorCode;
  message: string;
}

/** Namespace-tagged terminal artifact reference produced by a research job. */
export interface ResearchJobResultRef {
  id: UuidString;
  kind: ResearchJobResultKind;
}

/** `GET /research/jobs/{id}` / enqueue result — one durable research job. */
export interface ResearchJobView {
  job_id: UuidString;
  kind: ResearchJobKind;
  status: ResearchJobStatus;
  model_spec_id?: null | string;
  decision_policy_snapshot_id?: null | UuidString;
  /** Frozen request body (detail drawer / retry preview). */
  params: Record<string, unknown>;
  progress?: null | ResearchJobProgress;
  /** Completion fraction in `[0, 1]` when a positive total is known. */
  progress_pct?: null | number;
  /** Namespace-tagged terminal artifact reference. */
  result?: null | ResearchJobResultRef;
  error?: null | ResearchJobError;
  coverage_json?: DatasetCoverage | null;
  requested_by?: null | string;
  acting_role: string;
  parent_job_id?: null | UuidString;
  /** Automatic interruption/transient-execution retries so far. */
  recovery_attempt: number;
  max_recovery_attempts: number;
  next_attempt_at?: IsoDateTime | null;
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
  result_kind?: ResearchJobResultKind;
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

export type FactorOutputSemantics =
  | {
      effect: 'higher_is_supportive' | 'lower_is_supportive';
      output_kind: 'context';
    }
  | {
      orientation: 'canonical_yes' | 'feature_token';
      output_kind: 'outcome_alpha';
    }
  | {
      output_kind: 'diagnostic';
    };

/** Immutable factor definition catalog projection. */
export interface FactorDefinitionView {
  factor_definition_id: UuidString;
  definition_hash: string;
  feature_contract_hash: string;
  name: string;
  factor_family: FactorFamily;
  scope: FactorDefinitionScope;
  input_schema_version: string;
  output_schema_version: string;
  /** Normalization method projected from the governed definition. */
  normalization: FactorNormalization;
  /** Executable outcome-alpha or side-neutral context projection. */
  output: FactorOutputSemantics;
  /** Stable feature names this factor consumes. */
  input_features: string[];
  /** Whether missing/indeterminate output rejects the market. */
  required: boolean;
  created_at: IsoDateTime;
}

/** One verified model-serving contract that consumes this immutable factor. */
export interface FactorServingUsageView {
  model_version_id: UuidString;
  model_spec_id: string;
  model_spec_name: string;
  model_family: ModelFamily;
  version: number;
  category_scope: MarketCategory | null;
  profile_ref: ResearchProfileRef;
  artifact_hash: string;
  serving_contract_version: number;
  serving_contract_hash: string;
  created_at: IsoDateTime;
}

/** Immutable definition plus independently paginated serving usages. */
export interface FactorDefinitionDetailView {
  definition: FactorDefinitionView;
  serving_usage: Paginated<FactorServingUsageView>;
}

export type FactorDefinitionDetailQuery = PageQuery;

/** Filter + pagination for `GET /research/factors`. */
export interface FactorDefinitionListQuery extends PageQuery {
  factor_family?: FactorFamily;
  scope?: FactorDefinitionScope;
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
