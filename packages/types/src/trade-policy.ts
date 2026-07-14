import type {
  BpsString,
  DecimalString,
  IsoDateTime,
  PageQuery,
  PriceString,
  UsdString,
  UuidString,
} from './common';
import type {
  ExitSettlementMode,
  FillRequirement,
  MarketCategory,
  RedeemPolicy,
} from './enums';

export type TradePolicyStatus = 'draft' | 'published' | 'retired' | 'validated';
export type TradePolicyGovernanceAction = 'publish' | 'retire' | 'validate';

export interface TradePolicyListQuery extends PageQuery {
  source_dataset_id?: UuidString;
  status?: TradePolicyStatus;
}

export type TradePolicyAuditListQuery = PageQuery;

export interface TradePolicySummaryView {
  artifact_id: UuidString;
  cohort_count: number;
  content_hash: string;
  created_at: IsoDateTime;
  executable_coverage: DecimalString | null;
  publication_blocker_count: number;
  publishable: boolean;
  source_dataset_id: UuidString;
  status: TradePolicyStatus;
  updated_at: IsoDateTime;
}

export interface TradePolicyStructuralDimension {
  bucket_id: string;
  methodology_hash: string;
  methodology_id: string;
}

export interface TradePolicyCohortKey {
  category: MarketCategory;
  entry_price_max: PriceString;
  entry_price_min: PriceString;
  horizon_secs: number;
  liquidity: TradePolicyStructuralDimension;
  notional_tier: UsdString;
  volatility: TradePolicyStructuralDimension;
}

export interface TradePolicyCohortView {
  effective_sample_size: DecimalString;
  entry_order:
    | { fill_requirement: FillRequirement; kind: 'aggressive' }
    | { kind: 'passive'; post_only: boolean };
  entry_condition: TradePolicyEntryConditionTemplate;
  executable_coverage: DecimalString;
  executable_sample_count: number;
  key: TradePolicyCohortKey;
  lower_barrier_bps: BpsString;
  lower_confidence_utility_bps: BpsString | null;
  max_book_age_ms: number;
  max_slippage_bps: BpsString;
  min_expected_return_bps: BpsString;
  min_score_retention: DecimalString;
  redeem_policy: RedeemPolicy;
  require_execution_eligibility: boolean;
  sample_count: number;
  scale_out_targets: Array<{
    target_cumulative_exit_pct: DecimalString;
    target_id: string;
    trigger_return_bps: BpsString;
  }>;
  settlement_mode: ExitSettlementMode;
  shrink_path: Array<{
    parent_cohort_index: number;
    relaxed_dimension: 'category' | 'entry_price' | 'liquidity' | 'volatility';
  }>;
  trailing_stop: null | {
    activation_return_bps: BpsString;
    trail_bps: BpsString;
  };
  upper_barrier_bps: BpsString;
  vertical_barrier_secs: number;
}

export type TradePolicyEntryConditionTemplate =
  | {
      confirmation_ms: number;
      kind: 'conditional';
      max_observation_gap_ms: number;
      root: TradePolicyConditionTemplateNodeV1;
    }
  | { kind: 'immediate' };

/** Recommendation-relative research AST. Runtime bindings are materialized by the server. */
export type TradePolicyConditionTemplateNodeV1 =
  | {
      anchor: 'market_end' | 'market_start' | 'recommendation_decision';
      kind: 'clock';
      offset_ms: number;
    }
  | {
      children: TradePolicyConditionTemplateNodeV1[];
      kind: 'all' | 'any';
    }
  | {
      comparison: 'at_or_above' | 'at_or_below';
      definition_hash: string;
      definition_id: UuidString;
      kind: 'factor';
      max_input_age_ms: number;
      measure: 'normalized' | 'raw';
      minimum_confidence: DecimalString;
      threshold: DecimalString;
    }
  | {
      comparison: 'at_or_above' | 'at_or_below';
      kind: 'price';
      max_input_age_ms: number;
      threshold: PriceString;
    }
  | {
      event:
        | {
            kind: 'crypto_subject_predicate_entered';
            max_input_age_ms: number;
          }
        | {
            kind: 'weather_daily_high_predicate';
            max_input_age_ms: number;
          };
      kind: 'market_event';
    };

export interface TradePolicyConditionCandidate {
  candidate_id: string;
  condition: TradePolicyEntryConditionTemplate;
}

export type VerticalActivationTarget = 'auto_execution' | 'semi_auto';
export type VerticalGateKind =
  | 'crypto_binance_continuity'
  | 'crypto_chainlink_resolution'
  | 'weather_noaa_proxy';

export interface VerticalGateEvidence {
  agreement_wilson_lower_bound: DecimalString;
  availability: DecimalString;
  distinct_local_dates: number;
  distinct_subject_count: number;
  evidence_window_end: IsoDateTime;
  evidence_window_start: IsoDateTime;
  gaps_recovered: boolean;
  gate: VerticalGateKind;
  methodology_hash: string;
  sample_count: number;
  target: VerticalActivationTarget;
  target_subject_sample_count: null | number;
  target_subject_wilson_lower_bound: DecimalString | null;
  unresolved_mismatch_count: number;
}

export interface TradePolicyQualityGate {
  max_ambiguous_touch_rate: DecimalString;
  max_depth_failure_rate: DecimalString;
  max_probability_of_backtest_overfitting: DecimalString;
  min_cohort_samples: number;
  min_cpcv_paths: number;
  min_deflated_sharpe_ratio: DecimalString;
  min_executable_coverage: DecimalString;
  min_full_l2_coverage: DecimalString;
  min_lower_confidence_utility_bps: BpsString;
}

export interface TradePolicyFitContract {
  embargo_secs: number;
  fit_window_end: IsoDateTime;
  fit_window_start: IsoDateTime;
  maximum_scale_out_targets: number;
  notional_tiers: UsdString[];
  pit_cutoff: IsoDateTime;
  quality_gate: TradePolicyQualityGate;
  runtime_config_version_id: UuidString;
  source_dataset_id: UuidString;
}

export type TradePolicyPublicationBlocker =
  | { actual: number; kind: 'unsupported_format' }
  | {
      cohort_index: number;
      kind:
        | 'insufficient_cohort_coverage'
        | 'insufficient_cohort_samples'
        | 'invalid_parent_provenance'
        | 'missing_utility_lower_bound'
        | 'utility_lower_bound_below_gate';
    }
  | { detail: string; kind: 'invalid_condition_candidates' }
  | { detail: string; kind: 'invalid_fit_contract' }
  | { detail: string; kind: 'invalid_vertical_gate_evidence' }
  | { gate: VerticalGateKind; kind: 'missing_vertical_gate_evidence' }
  | { gate: VerticalGateKind; kind: 'vertical_gate_failed' }
  | { kind: 'condition_candidate_set_hash_mismatch' }
  | {
      kind:
        | 'ambiguous_touch_rate_above_gate'
        | 'deflated_sharpe_ratio_below_gate'
        | 'depth_failure_rate_above_gate'
        | 'empty_cohorts'
        | 'insufficient_cpcv_paths'
        | 'insufficient_full_l2_coverage'
        | 'missing_ambiguous_touch_rate'
        | 'missing_cpcv_path_count'
        | 'missing_deflated_sharpe_ratio'
        | 'missing_depth_failure_rate'
        | 'missing_fee_model'
        | 'missing_full_l2_coverage'
        | 'missing_full_l2_entry_basis'
        | 'missing_full_l2_exit_basis'
        | 'missing_pit_cutoff_evidence'
        | 'missing_probability_of_backtest_overfitting'
        | 'missing_trial_ledger'
        | 'probability_of_backtest_overfitting_above_gate';
    };

export interface TradePolicyDetailView {
  allowed_governance_actions: TradePolicyGovernanceAction[];
  artifact_id: UuidString;
  content_hash: string;
  created_at: IsoDateTime;
  payload: {
    activation_target: VerticalActivationTarget;
    cohorts: TradePolicyCohortView[];
    condition_candidate_set_hash: string;
    condition_candidates: TradePolicyConditionCandidate[];
    execution_evidence: {
      degraded_top_of_book_sample_count: number;
      entry_basis: 'full_l2_vwap' | null;
      exit_basis: 'full_l2_vwap' | null;
      fee_model_hash: null | string;
      full_l2_coverage: DecimalString | null;
      full_l2_sample_count: number;
      gaps: string[];
    };
    feature_schema_hash: string;
    fill_simulator_version: string;
    fit_contract: TradePolicyFitContract;
    format_version: number;
    label_schema_hash: string;
    pit_cutoff_evidence: null | {
      filtered_sample_count: number;
      filtered_sample_hash: string;
      labels_excluded_after_cutoff: number;
      labels_matured_by_cutoff: number;
    };
    source_dataset_hash: string;
    validation: {
      ambiguous_touch_rate: DecimalString | null;
      cpcv_path_count: null | number;
      deflated_sharpe_ratio: DecimalString | null;
      depth_failure_rate: DecimalString | null;
      effective_sample_size: DecimalString | null;
      probability_of_backtest_overfitting: DecimalString | null;
      trial_ledger_hash: null | string;
    };
    vertical_gate_evidence: VerticalGateEvidence[];
  };
  publication_blockers: TradePolicyPublicationBlocker[];
  source_dataset_id: UuidString;
  status: TradePolicyStatus;
  updated_at: IsoDateTime;
}

export interface TradePolicyGovernanceAuditView {
  action: TradePolicyGovernanceAction;
  actor_id: UuidString;
  artifact_id: UuidString;
  audit_id: UuidString;
  content_hash: string;
  created_at: IsoDateTime;
  from_status: TradePolicyStatus;
  reason: string;
  to_status: TradePolicyStatus;
}

export interface FitTradePolicyRequest {
  activation_target: VerticalActivationTarget;
  condition_candidates: TradePolicyConditionCandidate[];
  contract: TradePolicyFitContract;
  reason: string;
}

export interface TradePolicyFitPreflightRequest {
  activation_target: VerticalActivationTarget;
  condition_candidates: TradePolicyConditionCandidate[];
  contract: TradePolicyFitContract;
}

export type TradePolicyPreflightCheckStatus = 'fail' | 'pass';

export interface TradePolicyFitPreflightView {
  canonical_condition_candidates: null | TradePolicyConditionCandidate[];
  condition_candidate_set_hash: null | string;
  contract_valid: TradePolicyPreflightCheckStatus;
  fee_model_present: TradePolicyPreflightCheckStatus;
  fit_window_contained: TradePolicyPreflightCheckStatus;
  full_l2_trajectory_present: TradePolicyPreflightCheckStatus;
  labels_excluded_after_cutoff: number;
  labels_matured_by_cutoff: number;
  messages: string[];
  pit_cutoff_valid: TradePolicyPreflightCheckStatus;
  publishable_input: TradePolicyPreflightCheckStatus;
  raw_trajectory_labels_present: TradePolicyPreflightCheckStatus;
  runtime_config_matches: TradePolicyPreflightCheckStatus;
  source_dataset_ready: TradePolicyPreflightCheckStatus;
}

export interface TradePolicyGovernanceRequest {
  reason: string;
}
