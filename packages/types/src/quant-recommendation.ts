import type {
  BpsString,
  DecimalString,
  IsoDateTime,
  PriceString,
  ProbabilityString,
  SharesString,
  UsdString,
  UuidString,
} from './common';
import type {
  DecisionBoundaryEvidenceView,
  FeatureCellEvidenceView,
  ModelInputEvidenceView,
} from './decision-evidence';
import type { EntryConditionPlan } from './entry-condition';
import type {
  ExitSettlementMode,
  FactorDirection,
  FactorFamily,
  FactorIndeterminateReason,
  FactorValueState,
  FillRequirement,
  IneligibilityReason,
  MarketCategory,
  MarketStatus,
  NormalizationSource,
  OutcomeSide,
  QuantRuntimeMode,
  RecommendationReportStatus,
  RecommendationStatus,
  RedeemPolicy,
  TickSize,
} from './enums';
import type {
  OpportunisticExitPolicy,
  ScaleOutTarget,
  ThesisInvalidationPolicy,
  TrailingStopPolicy,
} from './exit-plan';
import type { BuyModelRoute } from './feedback';
import type { ResearchProfileRef } from './research-profile';

export interface RecommendationIdentity {
  category: MarketCategory;
  question: string;
  outcome_name: string;
}

export interface MarketContext {
  best_bid: null | PriceString;
  best_ask: null | PriceString;
  mid_price: null | PriceString;
  spread_bps: BpsString | null;
  depth_usd: UsdString;
  volume_24h_usd: null | UsdString;
  book_age_ms: number;
  time_to_resolution_secs: null | number;
  market_status: MarketStatus;
  neg_risk: boolean;
  tick_size: TickSize;
  fee_rate: DecimalString | null;
}

export interface EntryPlan {
  condition: EntryConditionPlan;
  order_policy: EntryOrderPolicy;
  max_slippage_bps: BpsString;
  valid_from: IsoDateTime;
  valid_until: IsoDateTime;
  min_depth_usd: UsdString;
  max_book_age_ms: number;
  cancel_if_not_triggered: boolean;
  entry_reason: string;
}

export type EntryOrderPolicy =
  | {
      fill_requirement: FillRequirement;
      kind: 'aggressive';
      worst_price: PriceString;
    }
  | { kind: 'passive'; limit_price: PriceString; post_only: boolean };

export interface SizingPlan {
  economic_tier_id: UuidString;
  suggested_usd: UsdString;
  suggested_shares: SharesString;
  entry_vwap: PriceString;
  portfolio_weight_pct: DecimalString;
  market_exposure_after_usd: UsdString;
  event_exposure_after_usd: UsdString;
  category_exposure_after_usd: UsdString;
  route_exposure_after_usd: UsdString;
  capital_occupancy_usd_hours: DecimalString;
  sizing_reason: string;
}

export interface ExitPlan {
  take_profit_price: null | PriceString;
  take_profit_pct: DecimalString | null;
  stop_loss_price: null | PriceString;
  stop_loss_pct: DecimalString | null;
  time_exit_at: IsoDateTime | null;
  max_hold_secs: null | number;
  scale_out_targets: ScaleOutTarget[];
  trailing_stop: null | TrailingStopPolicy;
  thesis_invalidation: ThesisInvalidationPolicy;
  opportunistic_exit: OpportunisticExitPolicy;
  settlement_mode: ExitSettlementMode;
  redeem_policy: RedeemPolicy;
  manual_review_at: IsoDateTime | null;
  exit_reason: string;
}

export interface TradePolicyCohortProvenance {
  artifact_id: UuidString;
  artifact_hash: string;
  cohort_index: number;
  cohort_key: {
    cash_budget_tier: UsdString;
    category: MarketCategory;
    entry_price_max: PriceString;
    entry_price_min: PriceString;
    horizon_secs: number;
    liquidity: TradePolicyCohortDimension;
    profile_ref: ResearchProfileRef;
    volatility: TradePolicyCohortDimension;
  };
}

export interface TradePolicyCohortDimension {
  bucket_id: string;
  methodology_hash: string;
  methodology_id: string;
}

export interface RecommendationTradePlan {
  entry: EntryPlan;
  exit: ExitPlan;
  policy: TradePolicyCohortProvenance;
  risk_envelope: RiskEnvelope;
  sizing: SizingPlan;
}

export interface RiskEnvelope {
  max_loss_usd: UsdString;
  max_position_usd: UsdString;
  max_market_exposure_usd: UsdString;
  max_event_exposure_usd: UsdString;
  max_category_exposure_usd: UsdString;
  max_route_exposure_usd: UsdString;
  cvar_contribution_usd: UsdString;
  portfolio_cvar_cap_usd: UsdString;
  maximum_scenario_loss_cap_usd: UsdString;
  max_slippage_bps: BpsString;
  requires_approval: boolean;
  auto_execution_allowed: boolean;
  risk_notes: string[];
  envelope_hash: string;
}

export interface EntryEconomics {
  notional_usd: UsdString;
  entry_vwap: PriceString;
  fee_usd: UsdString;
  slippage_usd: UsdString;
  visible_liquidity_usd: UsdString;
}

export interface ScenarioCashflow {
  scenario_index: number;
  discounted_net_usd: UsdString;
}

export interface CapitalOccupancyBucket {
  end_secs: number;
  locked_usd: UsdString;
}

export interface RecommendationEconomics {
  profit_probability_bps: BpsString;
  nominal_expected_net_usd: UsdString;
  robust_expected_net_usd: UsdString;
  max_loss_usd: UsdString;
  cvar_contribution_usd: UsdString;
  capital_occupancy_usd_hours: DecimalString;
  marginal_portfolio_value_usd: UsdString;
}

export interface ExecutableEconomicTier {
  economic_tier_id: UuidString;
  report_route_run_id: UuidString;
  candidate_id: UuidString;
  tier_ordinal: number;
  route: BuyModelRoute;
  market_id: string;
  event_id: string;
  category: MarketCategory;
  token_id: string;
  outcome_side: OutcomeSide;
  shares: SharesString;
  entry: EntryEconomics;
  profit_probability_lower_bps: number;
  probability_interval_width_bps: number;
  scenario_cashflows: ScenarioCashflow[];
  capital_occupancy: CapitalOccupancyBucket[];
  economics: RecommendationEconomics;
  lineage_hash: string;
}

export interface FactorBreakdownEntry {
  factor_name: string;
  family: FactorFamily;
  /** Authoritative outcome state — orthogonal to `indeterminate_reason`. */
  value_state: FactorValueState;
  raw_value: DecimalString | null;
  /** `null` when the factor was missing-input, not-applicable, or indeterminate. */
  normalized_score: null | ProbabilityString;
  /** How the score was derived; `null` when missing / indeterminate. */
  normalization_source: NormalizationSource | null;
  /** Why the factor was indeterminate; `null` when scored / missing. */
  indeterminate_reason: FactorIndeterminateReason | null;
  confidence: ProbabilityString;
  weight: DecimalString;
  contribution: DecimalString;
  direction: FactorDirection;
  explanation: string;
  source_refs: string[];
}

export interface ExecutionEligibility {
  eligible_modes: QuantRuntimeMode[];
  ineligibility_reasons: IneligibilityReason[];
  approval_required: boolean;
  auto_policy_id: null | string;
}

/** `GET /quant/recommendations/{id}` — a single scored recommendation. */
export interface QuantRecommendationView {
  recommendation_id: UuidString;
  recommendation_report_id: UuidString;
  report_route_run_id: UuidString;
  portfolio_plan_id: UuidString;
  economic_tier_id: UuidString;
  rank: number;
  route: BuyModelRoute;
  market_id: string;
  event_id: string;
  token_id: string;
  outcome_side: OutcomeSide;
  economics: RecommendationEconomics;
  economic_tier: ExecutableEconomicTier;
  identity: RecommendationIdentity;
  market_context: MarketContext;
  trade_plan: RecommendationTradePlan;
  factor_breakdown: FactorBreakdownEntry[];
  execution_eligibility: ExecutionEligibility;
  valid_from: IsoDateTime;
  valid_until: IsoDateTime;
  status: RecommendationStatus;
  created_at: IsoDateTime;
  /** Current lifecycle state of the parent report (authoritative). */
  report_status: RecommendationReportStatus;
  /** Id of the blocking pre-submission order intent, when one already exists. */
  active_order_intent_id: null | UuidString;
}

/** `GET /quant/recommendations/{id}/evidence` — replay-handle references. */
export interface QuantEvidenceView {
  recommendation_id: UuidString;
  signal_candidate_id: string;
  feature_vector_id: string;
  model_run_id: string;
  market_selection_id: string;
  book_snapshot_ref: string;
  decision_policy_snapshot_id: string;
  model_version_id: string;
  factor_definition_versions: string[];
  data_quality_snapshot_ref: string;
  decision_boundary: DecisionBoundaryEvidenceView | null;
  evidence_complete: boolean;
  feature_cells: FeatureCellEvidenceView[];
  feature_hash: null | string;
  feature_schema_hash: null | string;
  model_inputs: ModelInputEvidenceView[];
}
