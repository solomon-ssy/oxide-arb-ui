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
  BindingConstraint,
  ExitReason,
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
  RecommendationAttributionOutcome,
  RecommendationOutcome,
  RecommendationReportStatus,
  RecommendationStatus,
  RedeemPolicy,
  SizingModelKind,
  TickSize,
} from './enums';
import type {
  ScaleOutTarget,
  ThesisInvalidationPolicy,
  TrailingStopPolicy,
} from './exit-plan';

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
  suggested_usd: UsdString;
  max_usd: UsdString;
  min_usd: UsdString;
  market_exposure_after_usd: UsdString;
  event_exposure_after_usd: UsdString;
  category_exposure_after_usd: UsdString;
  suggested_shares: SharesString;
  portfolio_weight_pct: DecimalString;
  /** The merged product of every stage below — not the config constant (see `kelly_fraction_config_applied`). */
  kelly_fraction_applied: DecimalString | null;
  edge_uncertainty_shrink_applied?: DecimalString | null;
  correlation_shrink_applied?: DecimalString | null;
  binding_constraint: BindingConstraint;
  sizing_reason: string;
  sizing_model: SizingModelKind;
  edge_bps: BpsString | null;
  /** Sizing waterfall provenance (Phase 11.3 §10) — the raw full-Kelly fraction. */
  f_star_applied?: DecimalString | null;
  /** The governed static fractional-Kelly constant (e.g. 0.5 for half-Kelly). */
  kelly_fraction_config_applied?: DecimalString | null;
  confidence_shrink_applied?: DecimalString | null;
  drawdown_shrink_applied?: DecimalString | null;
  /** Fraction before the per-position equity cap. */
  raw_fraction_applied?: DecimalString | null;
  /** The per-position equity cap (`portfolio.sizing.max_position_pct`). */
  position_cap_fraction_applied?: DecimalString | null;
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
    category: MarketCategory;
    entry_price_max: PriceString;
    entry_price_min: PriceString;
    horizon_secs: number;
    liquidity: TradePolicyCohortDimension;
    notional_tier: UsdString;
    volatility: TradePolicyCohortDimension;
  };
}

export interface TradePolicyCohortDimension {
  bucket_id: string;
  methodology_hash: string;
  methodology_id: string;
}

export type TradePlanBlocker =
  | 'artifact_format_unsupported'
  | 'artifact_hash_mismatch'
  | 'artifact_not_found'
  | 'artifact_not_published'
  | 'cohort_coverage_insufficient'
  | 'cohort_not_found'
  | 'liquidity_insufficient'
  | 'model_policy_binding_missing'
  | 'notional_tier_unavailable'
  | 'price_outside_venue_range'
  | 'return_model_uncalibrated'
  | 'tick_mismatch';

export type RecommendationTradePlan =
  | { blockers: TradePlanBlocker[]; kind: 'unavailable' }
  | {
      entry: EntryPlan;
      exit: ExitPlan;
      kind: 'frozen';
      policy: TradePolicyCohortProvenance;
      risk_envelope: RiskEnvelope;
      sizing: SizingPlan;
    };

export interface RiskEnvelope {
  max_loss_usd: UsdString;
  max_position_usd: UsdString;
  max_market_exposure_usd: UsdString;
  max_event_exposure_usd: UsdString;
  max_category_exposure_usd: UsdString;
  max_slippage_bps: BpsString;
  requires_approval: boolean;
  auto_execution_allowed: boolean;
  risk_notes: string[];
  envelope_hash: string;
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
  uncalibrated_watermark: boolean;
}

/** `GET /quant/recommendations/{id}` — a single scored recommendation. */
export interface QuantRecommendationView {
  recommendation_id: UuidString;
  recommendation_report_id: UuidString;
  rank: number;
  market_id: string;
  event_id: string;
  token_id: string;
  outcome_side: OutcomeSide;
  composite_score: ProbabilityString;
  risk_adjusted_score: ProbabilityString;
  confidence: ProbabilityString;
  expected_return_bps: BpsString;
  downside_bps: BpsString;
  identity: RecommendationIdentity;
  market_context: MarketContext;
  rank_before_portfolio: number;
  liquidity_score: ProbabilityString;
  data_quality_score: ProbabilityString;
  model_score_percentile: ProbabilityString;
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
  runtime_config_version_id: string;
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

/** Realized entry execution against the venue (`attribution.entry_outcome`). */
export interface EntryOutcome {
  entry_filled: boolean;
  fill_price: null | PriceString;
  fill_shares: null | SharesString;
  entry_slippage_bps: BpsString | null;
  filled_at: IsoDateTime | null;
}

/** Realized exit / settlement resolution (`attribution.exit_outcome`). */
export interface ExitOutcome {
  exit_price: null | PriceString;
  exit_shares: null | SharesString;
  exit_trigger: ExitReason | null;
  exit_compliance: boolean;
  settlement_outcome: null | RecommendationOutcome;
  exited_at: IsoDateTime | null;
}

/** Post-hoc attribution comparing realized behaviour to the thesis. */
export interface AttributionDetail {
  hit_stop_loss: boolean;
  hit_take_profit: boolean;
  liquidity_exit_possible: boolean;
  notes: string[];
}

/** `GET /quant/recommendations/{id}/attribution` — realized outcome. */
export interface RecommendationAttributionView {
  recommendation_id: UuidString;
  outcome: RecommendationAttributionOutcome;
  realized_pnl_usd: null | UsdString;
  max_adverse_excursion_bps: DecimalString | null;
  max_favorable_excursion_bps: DecimalString | null;
  label_available_at: IsoDateTime | null;
  entry_outcome: EntryOutcome;
  exit_outcome: ExitOutcome;
  attribution: AttributionDetail;
  created_at: IsoDateTime;
}
