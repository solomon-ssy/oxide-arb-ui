import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  PriceString,
  UsdString,
  UuidString,
} from './common';
import type { FillRequirement, MarketCategory, PriceComparison } from './enums';

export type TradePolicyStatus = 'draft' | 'published' | 'retired' | 'validated';

export interface TradePolicyListQuery extends PageQuery {
  source_dataset_id?: UuidString;
  status?: TradePolicyStatus;
}

export interface TradePolicySummaryView {
  artifact_id: UuidString;
  content_hash: string;
  status: TradePolicyStatus;
  source_dataset_id: UuidString;
  cohort_count: number;
  executable_coverage: DecimalString;
  validation_passed: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface TradePolicyCohortView {
  key: {
    category: MarketCategory;
    entry_price_max: PriceString;
    entry_price_min: PriceString;
    horizon_secs: number;
    liquidity_tier: string;
    notional_tier: UsdString;
    volatility_regime: string;
  };
  entry_trigger:
    | {
        comparison: PriceComparison;
        confirmation_secs: number;
        kind: 'price_offset';
        max_observation_gap_ms: number;
        threshold_offset_bps: DecimalString;
      }
    | { kind: 'immediate' };
  entry_order:
    | { fill_requirement: FillRequirement; kind: 'aggressive' }
    | { kind: 'passive'; post_only: boolean };
  upper_barrier_bps: DecimalString;
  lower_barrier_bps: DecimalString;
  vertical_barrier_secs: number;
  sample_count: number;
  executable_sample_count: number;
  executable_coverage: DecimalString;
  lower_confidence_utility_bps: DecimalString;
}

export interface TradePolicyDetailView {
  artifact_id: UuidString;
  content_hash: string;
  status: TradePolicyStatus;
  source_dataset_id: UuidString;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  payload: {
    cohorts: TradePolicyCohortView[];
    execution_evidence: {
      degradation_reasons: string[];
      degraded_top_of_book_sample_count: number;
      entry_basis: string;
      exit_basis: string;
      fees_included: boolean;
      full_l2_coverage: DecimalString;
      full_l2_sample_count: number;
    };
    feature_schema_hash: string;
    fee_model_hash: string;
    fill_simulator_version: string;
    fit_contract: {
      embargo_secs: number;
      fit_window_end: IsoDateTime;
      fit_window_start: IsoDateTime;
      maximum_scale_out_targets: number;
      minimum_executable_coverage: DecimalString;
      notional_tiers: UsdString[];
      runtime_config_version_id: UuidString;
      source_dataset_id: UuidString;
    };
    format_version: number;
    label_schema_hash: string;
    source_dataset_hash: string;
    validation: {
      cpcv_path_count: number;
      deflated_sharpe_ratio: DecimalString;
      executable_coverage: DecimalString;
      failure_reasons: string[];
      passed: boolean;
      probability_of_backtest_overfitting: DecimalString;
    };
  };
}

export interface TradePolicyFitContract {
  source_dataset_id: UuidString;
  runtime_config_version_id: UuidString;
  fit_window_start: IsoDateTime;
  fit_window_end: IsoDateTime;
  embargo_secs: number;
  notional_tiers: UsdString[];
  maximum_scale_out_targets: number;
  minimum_executable_coverage: DecimalString;
}

export interface FitTradePolicyRequest {
  contract: TradePolicyFitContract;
  reason: string;
}

export interface TradePolicyFitPreflightRequest {
  contract: TradePolicyFitContract;
}

export type TradePolicyPreflightCheckStatus = 'fail' | 'pass';

export interface TradePolicyFitPreflightView {
  contract_valid: TradePolicyPreflightCheckStatus;
  source_dataset_ready: TradePolicyPreflightCheckStatus;
  raw_trajectory_labels_present: TradePolicyPreflightCheckStatus;
  fit_window_contained: TradePolicyPreflightCheckStatus;
  runtime_config_matches: TradePolicyPreflightCheckStatus;
  full_l2_trajectory_present: TradePolicyPreflightCheckStatus;
  fee_model_present: TradePolicyPreflightCheckStatus;
  publishable_input: TradePolicyPreflightCheckStatus;
  messages: string[];
}

export interface TradePolicyGovernanceRequest {
  reason: string;
}
