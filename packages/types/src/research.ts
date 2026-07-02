import type {
  DecimalString,
  IsoDateTime,
  ProbabilityString,
  UsdString,
  UuidString,
} from './common';

// ── Training datasets ───────────────────────────────────────────────────────

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
  status: string;
  feature_schema_hash: string;
  factor_schema_hash: string;
  label_schema_hash: string;
  dataset_hash: string;
  parquet_uri: string;
  sample_count: number;
  coverage_json: unknown;
  runtime_config_version_id: UuidString;
  created_at: IsoDateTime;
}

/** `POST /research/training-datasets/plan|build` governed request body. */
export interface BuildTrainingDatasetRequest {
  reason: string;
  model_spec_id: string;
  runtime_config_version_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  training_dataset_id?: UuidString;
}

// ── Models ──────────────────────────────────────────────────────────────────

/** `GET /research/models/{id}` / train result. */
export interface TrainedModelView {
  model_version_id: UuidString;
  model_spec_id: string;
  version: number;
  artifact_hash: string;
  training_dataset_id: null | UuidString;
  publication_status: string;
  metrics: unknown;
  created_at: IsoDateTime;
}

/** `POST /research/models/train` governed request body. */
export interface TrainModelRequest {
  reason: string;
  model_spec_id: string;
  training_dataset_id: UuidString;
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
  expected_vs_realized: unknown;
  max_drawdown: DecimalString;
  turnover: DecimalString;
  tail_loss: DecimalString;
  liquidity_feasibility: ProbabilityString;
  category_breakdown: unknown;
  report_pnl_simulation: unknown;
  report_hash: string;
  parquet_uri: null | string;
  created_at: IsoDateTime;
  comparison_report_id: null | UuidString;
}

/** `POST /research/models/{id}/backtest` governed request body. */
export interface RunBacktestRequest {
  reason: string;
  runtime_config_version_id: UuidString;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
}

/** `GET /research/comparison-reports/{id}`. */
export interface ModelComparisonReportView {
  comparison_report_id: UuidString;
  baseline_model_version_id: UuidString;
  candidate_model_version_id: UuidString;
  rank_ic_delta: DecimalString;
  hit_rate_delta: DecimalString;
  realized_pnl_delta: UsdString;
  score_correlation: DecimalString;
  side_disagreement_rate: DecimalString;
  common_samples: number;
  category_breakdown_diff: unknown;
  comparison_hash: string;
  created_at: IsoDateTime;
}

// ── Factor definitions ──────────────────────────────────────────────────────

/** Factor definition governance projection. */
export interface FactorDefinitionView {
  factor_definition_id: UuidString;
  name: string;
  factor_family: string;
  scope: string;
  input_schema_version: string;
  output_schema_version: string;
  status: string;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** `POST /research/factors/{id}/publish` governed request body. */
export interface PublishFactorRequest {
  reason: string;
}

/** `POST /research/factors/{id}/retire` governed request body. */
export interface RetireFactorRequest {
  reason: string;
}
