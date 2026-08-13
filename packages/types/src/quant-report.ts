import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type {
  DecisionBoundaryEvidenceView,
  ModelRouteEvidenceView,
} from './decision-evidence';
import type {
  AccountSource,
  EmptyReportReason,
  FeatureParityStage,
  MarketCategory,
  OutcomeSide,
  QuantRuntimeMode,
  RecommendationReportStatus,
  ReportFactDeliveryStatus,
  ReportKind,
  ReportRunStatus,
  ReportRunTerminalReason,
  ReportScheduleGapReason,
  ReportTriggerKind,
} from './enums';
import type { BuyModelRoute } from './feedback';
import type {
  ExecutionEligibility,
  FactorBreakdownEntry,
  RecommendationEconomics,
  RecommendationTradePlan,
} from './quant-recommendation';
import type { ResearchProfileRef } from './research-profile';

export interface RepresentedRouteSet {
  routes: BuyModelRoute[];
  digest: string;
}

/** Report header row (`GET /quant/reports`). */
export interface QuantReportView {
  recommendation_report_id: UuidString;
  represented_routes: RepresentedRouteSet;
  scenario_artifact_id: null | UuidString;
  report_kind: ReportKind;
  status: RecommendationReportStatus;
  runtime_mode: QuantRuntimeMode;
  decision_at: IsoDateTime;
  top_n: number;
  account_source: AccountSource;
  capital_base_usd: UsdString;
  published_recommendation_count: number;
  total_suggested_usd: UsdString;
  empty_reason: EmptyReportReason | null;
  published_at: IsoDateTime | null;
  valid_until: IsoDateTime | null;
  successor_report_id: null | UuidString;
  superseded_at: IsoDateTime | null;
  obsoleted_at: IsoDateTime | null;
  revoked_at: IsoDateTime | null;
  expired_at: IsoDateTime | null;
  status_reason: null | string;
  created_at: IsoDateTime;
}

export interface DataQualitySummary {
  fresh_count: number;
  acceptable_count: number;
  degraded_count: number;
  stale_count: number;
  insufficient_count: number;
}

export interface RejectionReasonCount {
  reason: PortfolioRejectionReason;
  count: number;
}

/** Stable global-portfolio admission/selection reason returned by report summaries. */
export type PortfolioRejectionReason =
  | 'existing_structural_conflict'
  | 'liquidity_buffer'
  | 'nominal_expected_net_floor'
  | 'not_selected_by_global_optimum'
  | 'probability_interval_width'
  | 'profit_probability_floor'
  | 'robust_expected_net_floor'
  | 'scenario_exit_capacity'
  | 'single_recommendation_exposure';

export interface EligibilitySummary {
  eligible_report_only: number;
  eligible_semi_auto: number;
  eligible_auto_execution: number;
}

/** Aggregated report summary embedded in {@link QuantReportDetailView}. */
export interface ReportSummary {
  market_selection_count: number;
  represented_route_count: number;
  candidate_count: number;
  rejected_tier_count: number;
  published_recommendation_count: number;
  total_suggested_usd: UsdString;
  max_single_recommendation_usd: UsdString;
  robust_expected_net_usd: UsdString;
  nominal_expected_net_usd: UsdString;
  cvar_usd: UsdString;
  maximum_scenario_loss_usd: UsdString;
  capital_occupancy_usd_hours: DecimalString;
  category_allocation: Partial<Record<MarketCategory, UsdString>>;
  event_allocation: Record<string, UsdString>;
  route_allocation: Partial<Record<BuyModelRoute, UsdString>>;
  data_quality_summary: DataQualitySummary;
  top_rejection_reasons: RejectionReasonCount[];
  execution_eligibility_summary: EligibilitySummary;
  empty_reason: EmptyReportReason | null;
  warnings: string[];
}

export interface PortfolioObjectiveEvidence {
  robust_expected_net_usd: UsdString;
  nominal_expected_net_usd: UsdString;
  cvar_usd: UsdString;
  capital_occupancy_usd_hours: DecimalString;
  stable_tie_break_stages: number;
}

export interface PortfolioConstraintEvidence {
  available_cash_used_usd: UsdString;
  open_capital_usd: UsdString;
  selected_recommendation_count: number;
  maximum_scenario_loss_usd: UsdString;
  checked_constraint_count: number;
  evidence_hash: string;
}

export interface SolverEvidence {
  backend: string;
  lexicographic_model_build_count: number;
  lexicographic_solve_count: number;
  tie_break_proof_count: number;
  lexicographic_warm_start_count: number;
  marginal_model_build_count: number;
  marginal_solve_count: number;
  marginal_model_reuse_count: number;
  configured_deadline_secs: number;
  deterministic_threads: number;
  coefficient_scale: number;
  bound_scale_exponent: number;
  optimal: boolean;
}

export interface ExactVerificationEvidence {
  passed: boolean;
  selected_tier_digest: string;
  recomputed_economics_hash: string;
}

export interface GlobalPortfolioPlan {
  portfolio_plan_id: UuidString;
  selected_tier_ids: UuidString[];
  objectives: PortfolioObjectiveEvidence;
  constraints: PortfolioConstraintEvidence;
  solver: SolverEvidence;
  exact_verification: ExactVerificationEvidence;
  content_hash: string;
}

export type PortfolioDecisionResult =
  | {
      evidence_hash: string;
      outcome: 'zero_candidates';
      rejected_tier_count: number;
    }
  | {
      outcome: 'optimized';
      plan: GlobalPortfolioPlan;
    };

/** Report detail (`GET /quant/reports/{id}`). */
export interface QuantReportDetailView {
  recommendation_report_id: UuidString;
  report_run_id: UuidString;
  report_kind: ReportKind;
  decision_at: IsoDateTime;
  runtime_mode: QuantRuntimeMode;
  top_n: number;
  status: RecommendationReportStatus;
  account_source: AccountSource;
  capital_base_usd: UsdString;
  account_snapshot_ref: UuidString;
  decision_policy_snapshot_id: UuidString;
  market_selection_id: UuidString;
  portfolio_plan_id: UuidString;
  portfolio_decision: PortfolioDecisionResult;
  represented_routes: RepresentedRouteSet;
  scenario_artifact_id: null | UuidString;
  scenario_artifact_hash: null | string;
  summary: ReportSummary;
  fact_delivery: null | ReportFactDeliveryView;
  run: null | ReportRunView;
  published_at: IsoDateTime | null;
  valid_until: IsoDateTime | null;
  successor_report_id: null | UuidString;
  predecessor_report_id: null | UuidString;
  superseded_at: IsoDateTime | null;
  obsoleted_at: IsoDateTime | null;
  revoked_at: IsoDateTime | null;
  expired_at: IsoDateTime | null;
  status_reason: null | string;
  created_at: IsoDateTime;
}

export interface ReportFactDeliveryView {
  status: ReportFactDeliveryStatus;
  bundle_hash: string;
  recommendation_row_count: number;
  recommendation_row_chain_hash: string;
  funnel_row_count: number;
  funnel_row_chain_hash: string;
  attempt_count: number;
  next_attempt_at: IsoDateTime | null;
  last_error: null | string;
  verified_at: IsoDateTime | null;
  announced_at: IsoDateTime | null;
}

export interface ReportRunView {
  report_run_id: UuidString;
  trigger_kind: ReportTriggerKind;
  trigger_key: string;
  schedule_id: null | string;
  request_id: null | string;
  retry_of_run_id: null | UuidString;
  scheduled_for: IsoDateTime | null;
  requested_at: IsoDateTime;
  status: ReportRunStatus;
  started_at: IsoDateTime | null;
  decision_at: IsoDateTime | null;
  heartbeat_at: IsoDateTime | null;
  lease_expires_at: IsoDateTime | null;
  lease_owner: null | UuidString;
  finished_at: IsoDateTime | null;
  decision_policy_snapshot_id: null | UuidString;
  top_n: null | number;
  knowledge_lag_secs: null | number;
  output_report_id: null | UuidString;
  terminal_reason: null | ReportRunTerminalReason;
  error_code: null | string;
  error_summary: null | string;
}

export interface ReportRunListQuery extends PageQuery, TimeRangeQuery {
  status?: ReportRunStatus;
  trigger_kind?: ReportTriggerKind;
  schedule_id?: string;
}

export interface ReportScheduleStateView {
  schedule_id: string;
  decision_policy_snapshot_id: UuidString;
  spec_hash: string;
  next_scheduled_for: IsoDateTime;
  last_materialized_for: IsoDateTime | null;
  enabled: boolean;
  updated_at: IsoDateTime;
}

export interface ReportScheduleHealthView {
  observed_at: IsoDateTime;
  active_run: null | ReportRunView;
  queued_run_count: number;
  failed_run_count_24h: number;
  gap_count_24h: number;
  missed_occurrence_count_24h: number;
  prepared_report_count: number;
  current_reports: ReportCurrentHealthView[];
  schedules: ReportScheduleStateView[];
}

export interface ReportCurrentHealthView {
  recommendation_report_id: UuidString;
  report_kind: ReportKind;
  published_at: IsoDateTime | null;
  valid_until: IsoDateTime | null;
}

export interface ReportScheduleGapView {
  gap_id: UuidString;
  schedule_id: string;
  decision_policy_snapshot_id: UuidString;
  reason: ReportScheduleGapReason;
  first_scheduled_for: IsoDateTime;
  last_scheduled_for: IsoDateTime;
  missed_count: number;
  detected_at: IsoDateTime;
  detail: null | string;
}

export interface ReportScheduleGapListQuery extends PageQuery, TimeRangeQuery {
  schedule_id?: string;
  reason?: ReportScheduleGapReason;
}

export interface ReportEvidenceDiagnosticsView {
  stage_ceiling: FeatureParityStage;
  evidence_complete: boolean;
  model_route: ModelRouteEvidenceView | null;
  selection_count: number;
  decision_capture_count: null | number;
  feature_vector_count: null | number;
  feature_state_counts: null | Record<string, number>;
  feature_cell_count: null | number;
  model_input_state_counts: null | Record<string, number>;
  model_input_count: null | number;
}

export type RouteRunOutcome = 'failed' | 'ready' | 'zero_candidates';

export interface RouteModelLineage {
  model_version_id: UuidString;
  model_run_id: null | UuidString;
  calibration_artifact_id: UuidString;
  trade_policy_artifact_id: UuidString;
  research_profile_artifact_id: string;
  research_profile_ref: ResearchProfileRef;
  prediction_horizon_secs: number;
  feature_contract_digest: string;
  pit_lineage_digest: string;
  serving_contract_digest: string;
}

export interface RouteCandidateFunnel {
  eligible_markets: number;
  feature_complete_markets: number;
  calibrated_candidates: number;
  admitted_economic_tiers: number;
  selected_recommendations: number;
}

export interface ReportRouteDiagnosticsView {
  report_route_run_id: UuidString;
  route: BuyModelRoute;
  outcome: RouteRunOutcome;
  lineage: null | RouteModelLineage;
  funnel: RouteCandidateFunnel;
  evidence: ReportEvidenceDiagnosticsView;
}

export interface QuantReportDiagnosticsView {
  decision_boundary: DecisionBoundaryEvidenceView;
  global: ReportEvidenceDiagnosticsView;
  routes: ReportRouteDiagnosticsView[];
}

export type ReportFunnelStage =
  | 'business_eligible'
  | 'catalog_visible'
  | 'executable_data_eligible'
  | 'feature_ready'
  | 'model_gate_passed'
  | 'model_scored'
  | 'policy_ready'
  | 'portfolio_funded'
  | 'published'
  | 'sizing_eligible';

export type ReportFunnelReason =
  | 'category_disabled'
  | 'executable_entry_unavailable'
  | 'existing_structural_conflict'
  | 'feature_data_quality_rejected'
  | 'ingest_lag_exceeded'
  | 'insufficient_liquidity'
  | 'liquidity_buffer_insufficient'
  | 'low_confidence'
  | 'manually_blocked'
  | 'missing_model_output'
  | 'model_feature_unavailable'
  | 'no_positive_signal'
  | 'nominal_expected_net_below_floor'
  | 'not_open'
  | 'not_selected_by_global_optimum'
  | 'probability_interval_too_wide'
  | 'profit_probability_below_floor'
  | 'published'
  | 'resolution_ambiguous'
  | 'robust_expected_net_below_floor'
  | 'scenario_exit_capacity_insufficient'
  | 'score_below_floor'
  | 'single_recommendation_exposure_exceeded'
  | 'spread_too_wide'
  | 'stale_book';

export interface ReportFunnelStageView {
  excluded_count: number;
  input_count: number;
  output_count: number;
  stage: ReportFunnelStage;
}

export interface QuantReportFunnelView {
  catalog_visible_count: number;
  conserved: boolean;
  published_count: number;
  recommendation_report_id: UuidString;
  stages: ReportFunnelStageView[];
}

export interface ReportFunnelMarketView {
  event_id: string;
  feature_vector_id: null | UuidString;
  market_id: string;
  market_selection_id: UuidString;
  report_route_run_id: null | UuidString;
  route: BuyModelRoute | null;
  model_run_id: null | UuidString;
  model_version_id: null | UuidString;
  primary_reason: ReportFunnelReason;
  recommendation_id: null | UuidString;
  recommendation_report_id: UuidString;
  row_hash: string;
  decision_policy_snapshot_id: UuidString;
  primary_token_id: string;
  secondary_diagnostics: ReportFunnelDiagnostics;
  signal_candidate_id: null | UuidString;
  terminal_stage: ReportFunnelStage;
}

export type NullReason =
  | 'domain_source_unavailable'
  | 'insufficient_history'
  | 'insufficient_role_coverage'
  | 'insufficient_trade_tape'
  | 'leg_book_missing'
  | 'linkage_unresolved'
  | 'not_applicable'
  | 'out_of_valid_range'
  | 'source_unavailable'
  | 'stale_beyond_policy'
  | 'trade_tape_unavailable';

export type ReportFunnelDiagnostics =
  | { detail: string; kind: 'planner_rejection' }
  | { features: string[]; kind: 'missing_model_features' }
  | { kind: 'feature_data_quality'; missing: MissingFeatureDiagnostic[] }
  | { kind: 'none' };

export interface MissingFeatureDiagnostic {
  feature_name: string;
  reason: NullReason;
}

export interface ReportFunnelMarketListQuery extends PageQuery {
  primary_reason?: ReportFunnelReason;
  terminal_stage?: ReportFunnelStage;
}

/** One recommendation delta between two reports. */
export interface RecommendationDeltaView {
  market_id: string;
  outcome_side: OutcomeSide;
  base: null | RecommendationDiffSnapshotView;
  compare: null | RecommendationDiffSnapshotView;
  changed_fields: RecommendationChangedField[];
  suggested_usd_delta: UsdString;
}

export type RecommendationChangedField =
  | 'capital_occupancy_usd_hours'
  | 'cvar_contribution_usd'
  | 'eligibility'
  | 'entry'
  | 'exit'
  | 'factor_breakdown'
  | 'marginal_portfolio_value_usd'
  | 'maximum_loss_usd'
  | 'nominal_expected_net_usd'
  | 'profit_probability'
  | 'rank'
  | 'robust_expected_net_usd'
  | 'sizing'
  | 'trade_plan_availability'
  | 'validity';

export interface RecommendationDiffSnapshotView {
  recommendation_id: UuidString;
  rank: number;
  economics: RecommendationEconomics;
  valid_from: IsoDateTime;
  valid_until: IsoDateTime;
  execution_eligibility: ExecutionEligibility;
  trade_plan: RecommendationTradePlan;
  factor_breakdown: FactorBreakdownEntry[];
}

/** `GET /quant/reports/{id}/diff/{other_id}` response. */
export interface ReportDiffView {
  base_report_id: UuidString;
  compare_report_id: UuidString;
  added: RecommendationDeltaView[];
  removed: RecommendationDeltaView[];
  retained: RecommendationDeltaView[];
  base_total_suggested_usd: UsdString;
  compare_total_suggested_usd: UsdString;
  total_suggested_usd_delta: UsdString;
  base_eligibility: EligibilitySummary;
  compare_eligibility: EligibilitySummary;
}

/** Filter + pagination for `GET /quant/reports`. */
export interface QuantReportListQuery extends PageQuery, TimeRangeQuery {
  route?: BuyModelRoute;
  kind?: ReportKind;
  status?: RecommendationReportStatus;
  runtime_mode?: QuantRuntimeMode;
}

/** `POST /quant/reports/run` governed request body. */
export interface RunReportRequest {
  reason: string;
  /** Caller idempotency key (`ad_hoc:{request_id}` trigger key on the server). */
  request_id: string;
  top_n?: number;
  knowledge_lag_secs?: number;
}

/** `POST /quant/reports/{id}/revoke` governed request body. */
export interface RevokeReportRequest {
  reason: string;
}

export interface RetryReportRequest {
  request_id: string;
  reason: string;
}
