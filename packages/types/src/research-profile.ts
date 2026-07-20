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
  | 'pooled_binary_market'
  | 'weather_forecast';

export type ResearchMarketSelector =
  | 'all_eligible'
  | 'weather_airport_daily_high';

export type ResearchDecisionTrigger =
  | 'hourly'
  | 'hourly_latest_complete_gefs_cycle';

export type ResearchPolicyFitter = 'weather_forecast';

export type ResearchProfileDataSource =
  | 'aviation_weather'
  | 'catalog_ledger'
  | 'clob_l2'
  | 'clob_market_info'
  | 'gefs_ensemble'
  | 'ghcnh_calibration'
  | 'polymarket_resolution'
  | 'trade_tape';

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

export interface ResearchProfileArtifact {
  governance_reason: string;
  profile_ref: ResearchProfileRef;
  published_at: IsoDateTime;
  published_by: string;
  spec: {
    activation_eligibility: ResearchEvaluationTrack;
    allowed_cash_budget_tiers: UsdString[];
    category: MarketCategory | null;
    decision_cadence_secs: number;
    decision_trigger: ResearchDecisionTrigger;
    exit_heartbeat_secs: number;
    fit_span_days: number;
    information_regime: ResearchInformationRegime;
    market_selector: ResearchMarketSelector;
    max_feature_lookback_secs: number;
    max_holding_secs: number;
    policy_fitter: null | ResearchPolicyFitter;
    purge_embargo_secs: number;
    quality_gate: ResearchProfileQualityGate;
    required_sources: ResearchProfileDataSource[];
    target_horizon_secs: number;
  };
}

/** Content-addressed reference to a verified Source Slice v1 manifest. */
export interface SourceSliceManifestRef {
  manifest_hash: string;
  manifest_uri: string;
}
