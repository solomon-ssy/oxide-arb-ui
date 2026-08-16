import type {
  BpsString,
  DecimalString,
  IsoDateTime,
  UsdString,
} from './common';
import type { MarketCategory } from './enums';

/** Immutable identity carried by every research and execution artifact. */
export interface ResearchProfileRef {
  content_hash: string;
  id: string;
  version: number;
}

export type ResearchEvaluationTrack = 'research_only' | 'semi_auto_candidate';

export type ResearchInformationRegime =
  | 'crypto_price'
  | 'pooled_binary_market'
  | 'weather_forecast';

export type ResearchDecisionTrigger =
  | 'every_five_minutes'
  | 'hourly'
  | 'hourly_latest_complete_gefs_cycle';

export type ResearchPolicyFitter = 'weather_forecast';

export type ResearchProfileDataSource =
  | 'aviation_weather'
  | 'binance_market_data'
  | 'catalog_ledger'
  | 'clob_l2'
  | 'clob_market_info'
  | 'execution_participant'
  | 'gamma_market_identity'
  | 'gefs_ensemble'
  | 'ghcnh_calibration'
  | 'market_execution'
  | 'polymarket_resolution'
  | 'polymarket_rtds';

export type ResearchFeatureContract =
  | 'full_l2'
  | 'full_l2_crypto'
  | 'full_l2_weather'
  | 'trade_bootstrap'
  | 'trade_bootstrap_crypto'
  | 'trade_bootstrap_weather';

export type ResearchLabelContract = 'final_token_payout_ratio';

export type ResearchCohortContract =
  | 'all_eligible'
  | 'crypto_resolved'
  | 'weather_resolved';

export type ResearchAvailabilityPolicy =
  | { basis: 'finalized_block_confirmation'; confirmation_blocks: number }
  | { basis: 'ingestion_observed' };

export type ServingAuthority =
  | 'execution_eligible'
  | 'report_only_with_live_l2';

export interface ResearchProfileQualityGate {
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
  min_eligible_market_coverage: DecimalString;
}

export interface ResearchFeedbackPolicy {
  comparison_block_length: number;
  comparison_bootstrap_repetitions: number;
  comparison_bootstrap_seed: number;
  comparison_minimum_observations: number;
  concept_rank_ic_drop: DecimalString;
  data_drift_ks_p_value: DecimalString;
  data_drift_psi_threshold: DecimalString;
  effect_confidence: DecimalString;
  evaluation_window_days: number;
  feedback_cadence_secs: number;
  label_js_divergence: DecimalString;
  max_challengers: number;
  minimum_coverage: DecimalString;
  minimum_effect_bps: BpsString;
  minimum_mature_labels: number;
  minimum_new_mature_labels: number;
  retraining_cooldown_secs: number;
  shadow_minimum_observations: number;
}

export interface ResearchProfileArtifact {
  governance_reason: string;
  profile_ref: ResearchProfileRef;
  published_at: IsoDateTime;
  published_by: string;
  spec: {
    activation_eligibility: ResearchEvaluationTrack;
    allowed_cash_budget_tiers: UsdString[];
    availability_policy: ResearchAvailabilityPolicy;
    category: MarketCategory | null;
    cohort_contract: ResearchCohortContract;
    decision_cadence_secs: number;
    decision_trigger: ResearchDecisionTrigger;
    exit_heartbeat_secs: number;
    feature_contract: ResearchFeatureContract;
    feedback_policy: ResearchFeedbackPolicy;
    fit_span_days: number;
    information_regime: ResearchInformationRegime;
    label_contract: ResearchLabelContract;
    max_feature_lookback_secs: number;
    max_holding_secs: number;
    policy_fitter: null | ResearchPolicyFitter;
    purge_embargo_secs: number;
    quality_gate: ResearchProfileQualityGate;
    serving_authority: ServingAuthority;
    target_horizon_secs: number;
  };
}

/** Content-addressed reference to a verified Source Slice v1 manifest. */
export interface SourceSliceManifestRef {
  manifest_hash: string;
  manifest_uri: string;
}
