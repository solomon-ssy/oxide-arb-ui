import type {
  BpsString,
  IsoDateTime,
  PageQuery,
  ProbabilityString,
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
  RejectionReason,
  ReportFactDeliveryStatus,
  ReportKind,
  ReportRunStatus,
  ReportRunTerminalReason,
  ReportScheduleGapReason,
  ReportTriggerKind,
} from './enums';
import type {
  ExecutionEligibility,
  FactorBreakdownEntry,
  RecommendationTradePlan,
} from './quant-recommendation';
import type { ResearchProfileRef } from './research-profile';

/** Report header row (`GET /quant/reports`). */
export interface QuantReportView {
  recommendation_report_id: UuidString;
  profile_id: string;
  profile_ref: ResearchProfileRef;
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

export interface ConfidenceSummary {
  mean_confidence: ProbabilityString;
  min_confidence: ProbabilityString;
  max_confidence: ProbabilityString;
}

export interface DataQualitySummary {
  fresh_count: number;
  acceptable_count: number;
  degraded_count: number;
  stale_count: number;
  insufficient_count: number;
}

export interface RejectionReasonCount {
  reason: RejectionReason;
  count: number;
}

export interface EligibilitySummary {
  eligible_report_only: number;
  eligible_semi_auto: number;
  eligible_auto_execution: number;
}

/** Aggregated report summary embedded in {@link QuantReportDetailView}. */
export interface ReportSummary {
  market_selection_count: number;
  candidate_count: number;
  rejected_count: number;
  published_recommendation_count: number;
  total_suggested_usd: UsdString;
  max_single_recommendation_usd: UsdString;
  /**
   * The aggregate-exposure hard cap actually enforced by the LP
   * (`capital_base_usd × portfolio.kelly_safety.max_aggregate_exposure_pct`),
   * frozen from the exact account and decision-policy snapshot this report solved
   * against. `null` when the cap is disabled or the capital base is
   * non-positive — never re-derive this client-side.
   */
  aggregate_exposure_cap_usd?: null | UsdString;
  category_allocation: Partial<Record<MarketCategory, UsdString>>;
  event_allocation: Record<string, UsdString>;
  average_score: ProbabilityString;
  min_score: ProbabilityString;
  model_confidence_summary: ConfidenceSummary;
  data_quality_summary: DataQualitySummary;
  top_rejection_reasons: RejectionReasonCount[];
  execution_eligibility_summary: EligibilitySummary;
  empty_reason: EmptyReportReason | null;
  warnings: string[];
}

/** Report detail (`GET /quant/reports/{id}`). */
export interface QuantReportDetailView extends QuantReportView {
  horizon_secs: number;
  account_snapshot_ref: UuidString;
  decision_policy_snapshot_id: UuidString;
  /** Exact serving run; absent only when an empty report stopped before inference. */
  model_run_id: null | UuidString;
  model_version_id: UuidString;
  market_selection_id: UuidString;
  summary: ReportSummary;
  fact_delivery: null | ReportFactDeliveryView;
  run: null | ReportRunView;
  predecessor_report_id: null | UuidString;
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
  profile_id: string;
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

/** Durable serving diagnostics for one report. */
export type ReportDiagnosticsSubject = 'model_run' | 'pre_inference_report';

export interface QuantReportDiagnosticsView {
  decision_boundary: DecisionBoundaryEvidenceView | null;
  decision_capture_count: null | number;
  evidence_complete: boolean;
  feature_cell_count: null | number;
  feature_state_counts: null | Record<string, number>;
  feature_vector_count: null | number;
  model_input_count: null | number;
  model_input_state_counts: null | Record<string, number>;
  model_route: ModelRouteEvidenceView | null;
  selection_count: number;
  stage_ceiling: FeatureParityStage;
  subject: ReportDiagnosticsSubject;
}

export type ReportFunnelStage =
  | 'business_eligible'
  | 'catalog_visible'
  | 'executable_data_eligible'
  | 'feature_ready'
  | 'model_gate_passed'
  | 'model_scored'
  | 'portfolio_funded'
  | 'published'
  | 'sizing_eligible';

export type ReportFunnelReason =
  | 'aggregate_exposure_cap_exhausted'
  | 'available_cash_exhausted'
  | 'below_min_size'
  | 'beyond_top_n'
  | 'budget_exhausted'
  | 'category_cap_exhausted'
  | 'category_disabled'
  | 'correlation_cap_exhausted'
  | 'event_cap_exhausted'
  | 'feature_data_quality_rejected'
  | 'ingest_lag_exceeded'
  | 'insufficient_liquidity'
  | 'invalid_edge_inputs'
  | 'liquidity_infeasible'
  | 'low_confidence'
  | 'manually_blocked'
  | 'market_cap_exhausted'
  | 'missing_model_output'
  | 'model_feature_unavailable'
  | 'no_positive_signal'
  | 'not_open'
  | 'published'
  | 'resolution_ambiguous'
  | 'return_model_uncalibrated'
  | 'score_below_floor'
  | 'spread_too_wide'
  | 'stale_book'
  | 'system_degraded'
  | 'trade_policy_unavailable';

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
  model_run_id: null | UuidString;
  model_version_id: UuidString;
  primary_reason: ReportFunnelReason;
  profile_ref: ResearchProfileRef;
  recommendation_id: null | UuidString;
  recommendation_report_id: UuidString;
  row_hash: string;
  decision_policy_snapshot_id: UuidString;
  primary_token_id: string;
  secondary_diagnostics: Record<string, unknown>;
  signal_candidate_id: null | UuidString;
  terminal_stage: ReportFunnelStage;
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
  | 'composite_score'
  | 'confidence'
  | 'downside'
  | 'eligibility'
  | 'entry'
  | 'exit'
  | 'expected_return'
  | 'factor_breakdown'
  | 'rank'
  | 'risk_adjusted_score'
  | 'sizing'
  | 'trade_plan_availability'
  | 'validity';

export interface RecommendationDiffSnapshotView {
  recommendation_id: UuidString;
  rank: number;
  composite_score: ProbabilityString;
  risk_adjusted_score: ProbabilityString;
  confidence: ProbabilityString;
  expected_return_bps: BpsString;
  downside_bps: BpsString;
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
  profile_id?: string;
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
