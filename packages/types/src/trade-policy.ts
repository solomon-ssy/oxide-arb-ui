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
  ExitReason,
  ExitSettlementMode,
  FillRequirement,
  MarketCategory,
  RedeemPolicy,
} from './enums';
import type { OpportunisticExitPolicy } from './exit-plan';

export type TradePolicyStatus = 'draft' | 'published' | 'retired' | 'validated';
export type TradePolicyGovernanceAction = 'publish' | 'retire' | 'validate';
export type VerticalActivationTarget = 'auto_execution' | 'semi_auto';
export type VerticalGateKind =
  | 'crypto_binance_continuity'
  | 'crypto_chainlink_resolution'
  | 'weather_noaa_proxy';

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

export type TradePolicyPassivePlacement =
  | { kind: 'improve_best_bid_by_ticks'; ticks: number }
  | { kind: 'join_best_bid' };

export type TradePolicyEntryOrderTemplate =
  | {
      fill_requirement: FillRequirement;
      kind: 'aggressive';
      max_book_age_ms: number;
      max_slippage_bps: BpsString;
    }
  | {
      good_til_secs: number;
      kind: 'passive_post_only';
      max_book_age_ms: number;
      placement: TradePolicyPassivePlacement;
    };

export type TradePolicyResidualSharePolicy =
  | 'hold_to_settlement'
  | 'redeem_after_resolution'
  | 'retry_until_vertical';

export interface TradePolicyExitExecutionTemplate {
  fill_requirement: FillRequirement;
  max_attempts: number;
  max_slippage_bps: BpsString;
  reason: ExitReason;
  residual_share_policy: TradePolicyResidualSharePolicy;
  retry_cadence_ms: number;
}

export interface TradePolicyScaleOutTemplate {
  target_cumulative_exit_pct: DecimalString;
  target_id: string;
  trigger_return_bps: BpsString;
}

export interface TradePolicyTrailingStopTemplate {
  activation_return_bps: BpsString;
  trail_bps: BpsString;
}

export interface TradePolicyExitTemplate {
  lower_barrier_bps: BpsString;
  min_expected_return_bps: BpsString;
  min_score_retention: DecimalString;
  opportunistic_exit: OpportunisticExitPolicy;
  reason_execution: TradePolicyExitExecutionTemplate[];
  redeem_policy: RedeemPolicy;
  require_execution_eligibility: boolean;
  scale_out_targets: TradePolicyScaleOutTemplate[];
  settlement_mode: ExitSettlementMode;
  trailing_stop: null | TradePolicyTrailingStopTemplate;
  upper_barrier_bps: BpsString;
  vertical_barrier_secs: number;
}

/** A complete candidate; the server never expands a partial Cartesian grid. */
export interface TradePolicyCandidateSpec {
  candidate_id: string;
  entry_condition: TradePolicyEntryConditionTemplate;
  entry_execution: TradePolicyEntryOrderTemplate;
  exit: TradePolicyExitTemplate;
}

export interface TradePolicyParameterSource {
  relaxed_dimensions: Array<
    'category' | 'entry_price' | 'liquidity' | 'volatility'
  >;
  source_effective_sample_size: DecimalString;
  source_sample_count: number;
  source_selector_hash: string;
}

export interface TradePolicyCohortView {
  ambiguous_touch_rate: DecimalString;
  common_candidate_support: DecimalString;
  cpcv_path_count: number;
  deflated_sharpe_ratio: DecimalString;
  depth_failure_rate: DecimalString;
  effective_sample_size: DecimalString;
  entry_condition: TradePolicyEntryConditionTemplate;
  entry_order: TradePolicyEntryOrderTemplate;
  executable_coverage: DecimalString;
  executable_sample_count: number;
  fee_catalog_coverage: DecimalString;
  full_l2_coverage: DecimalString;
  key: TradePolicyCohortKey;
  lower_barrier_bps: BpsString;
  lower_confidence_utility_bps: BpsString | null;
  max_book_age_ms: number;
  max_slippage_bps: BpsString;
  min_expected_return_bps: BpsString;
  min_score_retention: DecimalString;
  opportunistic_exit: OpportunisticExitPolicy;
  parameter_source: TradePolicyParameterSource;
  passive_reconciled_trade_coverage: DecimalString | null;
  probability_of_backtest_overfitting: DecimalString;
  redeem_policy: RedeemPolicy;
  require_execution_eligibility: boolean;
  sample_count: number;
  scale_out_targets: TradePolicyScaleOutTemplate[];
  selected_candidate_id: string;
  settlement_mode: ExitSettlementMode;
  trailing_stop: null | TradePolicyTrailingStopTemplate;
  trial_count: number;
  upper_barrier_bps: BpsString;
  vertical_barrier_secs: number;
}

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
  min_common_candidate_support: DecimalString;
  min_cpcv_paths: number;
  min_deflated_sharpe_ratio: DecimalString;
  min_effective_sample_size: number;
  min_fee_catalog_coverage: DecimalString;
  min_full_l2_coverage: DecimalString;
  min_lower_confidence_utility_bps: BpsString;
  min_passive_reconciled_trade_coverage: DecimalString;
  min_universe_coverage: DecimalString;
}

export interface TradePolicyFitContract {
  fit_window_end: IsoDateTime;
  fit_window_start: IsoDateTime;
  horizon_secs: number;
  latency_profile_hash: string;
  methodology_hash: string;
  notional_tiers: UsdString[];
  pit_cutoff: IsoDateTime;
  quality_gate: TradePolicyQualityGate;
  runtime_config_version_id: UuidString;
  source_dataset_id: UuidString;
}

export interface TradePolicyFitSelection {
  fit_window_end: IsoDateTime;
  fit_window_start: IsoDateTime;
  notional_tiers: UsdString[];
  pit_cutoff: IsoDateTime;
  quality_gate: null | TradePolicyQualityGate;
  source_dataset_id: UuidString;
}

export type TradePolicyPublicationBlocker =
  | { actual: number; kind: 'unsupported_format' }
  | {
      cohort_index: number;
      kind:
        | 'cohort_ambiguity_above_gate'
        | 'cohort_deflated_sharpe_ratio_below_gate'
        | 'cohort_depth_failure_above_gate'
        | 'cohort_pbo_above_gate'
        | 'insufficient_cohort_common_support'
        | 'insufficient_cohort_coverage'
        | 'insufficient_cohort_cpcv_paths'
        | 'insufficient_cohort_effective_sample_size'
        | 'insufficient_cohort_fee_coverage'
        | 'insufficient_cohort_full_l2_coverage'
        | 'insufficient_passive_trade_coverage'
        | 'invalid_parameter_source'
        | 'missing_utility_lower_bound'
        | 'utility_lower_bound_below_gate';
    }
  | { detail: string; kind: 'invalid_condition_candidates' }
  | { detail: string; kind: 'invalid_fit_contract' }
  | { detail: string; kind: 'invalid_vertical_gate_evidence' }
  | { gate: VerticalGateKind; kind: 'missing_vertical_gate_evidence' }
  | { gate: VerticalGateKind; kind: 'vertical_gate_failed' }
  | {
      kind:
        | 'ambiguous_touch_rate_above_gate'
        | 'condition_candidate_set_hash_mismatch'
        | 'deflated_sharpe_ratio_below_gate'
        | 'depth_failure_rate_above_gate'
        | 'empty_cohorts'
        | 'evidence_bundle_identity_mismatch'
        | 'insufficient_common_candidate_support'
        | 'insufficient_cpcv_paths'
        | 'insufficient_fee_catalog_coverage'
        | 'insufficient_full_l2_coverage'
        | 'insufficient_universe_coverage'
        | 'missing_ambiguous_touch_rate'
        | 'missing_common_candidate_support'
        | 'missing_cpcv_path_count'
        | 'missing_deflated_sharpe_ratio'
        | 'missing_depth_failure_rate'
        | 'missing_evidence_bundle'
        | 'missing_fee_catalog_coverage'
        | 'missing_fee_model'
        | 'missing_full_l2_coverage'
        | 'missing_full_l2_entry_basis'
        | 'missing_full_l2_exit_basis'
        | 'missing_pit_cutoff_evidence'
        | 'missing_probability_of_backtest_overfitting'
        | 'missing_trial_ledger'
        | 'missing_universe_coverage'
        | 'probability_of_backtest_overfitting_above_gate';
    };

export interface TradePolicyDetailView {
  allowed_governance_actions: TradePolicyGovernanceAction[];
  artifact_id: UuidString;
  content_hash: string;
  created_at: IsoDateTime;
  payload: {
    activation_target: VerticalActivationTarget;
    candidate_set_hash: string;
    candidates: TradePolicyCandidateSpec[];
    cohorts: TradePolicyCohortView[];
    embargo_secs: number;
    evidence_bundle: null | {
      archive_manifest_set_hash: string;
      catalog_ledger_hash: string;
      code_hash: string;
      latency_profile_hash: string;
      manifest_hash: string;
      manifest_uri: string;
      methodology_hash: string;
      simulator_hash: string;
      trial_ledger_hash: string;
    };
    execution_evidence: {
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
      attempted_candidate_count: null | number;
      common_candidate_support: DecimalString | null;
      cpcv_path_count: null | number;
      deflated_sharpe_ratio: DecimalString | null;
      depth_failure_rate: DecimalString | null;
      effective_sample_size: DecimalString | null;
      fee_catalog_coverage: DecimalString | null;
      probability_of_backtest_overfitting: DecimalString | null;
      trial_ledger_cutoff: IsoDateTime | null;
      trial_ledger_hash: null | string;
      universe_coverage: DecimalString | null;
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
  candidates: TradePolicyCandidateSpec[];
  reason: string;
  selection: TradePolicyFitSelection;
}

export interface TradePolicyFitPreflightRequest {
  activation_target: VerticalActivationTarget;
  candidates: TradePolicyCandidateSpec[];
  selection: TradePolicyFitSelection;
}

export type TradePolicyPreflightCheckStatus = 'fail' | 'pass';

export interface TradePolicyFitPreflightView {
  candidate_set_hash: null | string;
  canonical_candidates: null | TradePolicyCandidateSpec[];
  contract_valid: TradePolicyPreflightCheckStatus;
  fee_model_present: TradePolicyPreflightCheckStatus;
  fit_window_contained: TradePolicyPreflightCheckStatus;
  full_l2_trajectory_present: TradePolicyPreflightCheckStatus;
  labels_excluded_after_cutoff: number;
  labels_matured_by_cutoff: number;
  latency_profile_present: TradePolicyPreflightCheckStatus;
  messages: string[];
  methodology_hash: null | string;
  pit_cutoff_valid: TradePolicyPreflightCheckStatus;
  publishable_input: TradePolicyPreflightCheckStatus;
  raw_trajectory_labels_present: TradePolicyPreflightCheckStatus;
  requested_gate_tight_enough: TradePolicyPreflightCheckStatus;
  runtime_config_version_id: null | UuidString;
  runtime_quality_gate: null | TradePolicyQualityGate;
  source_dataset_policy_fit: TradePolicyPreflightCheckStatus;
  source_dataset_ready: TradePolicyPreflightCheckStatus;
}

export interface TradePolicyGovernanceRequest {
  reason: string;
}
