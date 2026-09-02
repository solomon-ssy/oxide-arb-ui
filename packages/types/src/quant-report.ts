import type {
  IsoDateTime,
  PageQuery,
  TimeRangeQuery,
  UuidString,
} from './common';
import type {
  DecisionBoundaryEvidenceView,
  ModelRouteEvidenceView,
} from './decision-evidence';
import type {
  FeatureParityStage,
  RecommendationReportStatus,
  ReportKind,
  ReportRunStatus,
  ReportScheduleGapReason,
  ReportTriggerKind,
} from './enums';
import type { BuyModelRoute } from './generated/config-api';
import type {
  MissingFeatureDiagnostic,
  NullReason,
  QuantReportFunnelView,
  ReportFunnelDiagnostics,
  ReportFunnelMarketView,
  ReportFunnelReason,
  ReportFunnelStage,
  ReportFunnelStageView,
  ReportRunView,
} from './generated/quant-operator-api';
import type { ResearchProfileRef } from './research-profile';

export type {
  MissingFeatureDiagnostic,
  NullReason,
  QuantReportFunnelView,
  ReportFunnelDiagnostics,
  ReportFunnelMarketView,
  ReportFunnelReason,
  ReportFunnelStage,
  ReportFunnelStageView,
};

/** Stable global-portfolio admission and selection reason. */
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

export interface ReportRunListQuery extends PageQuery, TimeRangeQuery {
  schedule_id?: string;
  status?: ReportRunStatus;
  trigger_kind?: ReportTriggerKind;
}

export interface ReportScheduleStateView {
  decision_policy_snapshot_id: UuidString;
  enabled: boolean;
  last_materialized_for: IsoDateTime | null;
  next_scheduled_for: IsoDateTime;
  schedule_id: string;
  spec_hash: string;
  updated_at: IsoDateTime;
}

export interface ReportScheduleHealthView {
  active_run: null | ReportRunView;
  current_reports: ReportCurrentHealthView[];
  failed_run_count_24h: number;
  gap_count_24h: number;
  missed_occurrence_count_24h: number;
  observed_at: IsoDateTime;
  prepared_report_count: number;
  queued_run_count: number;
  schedules: ReportScheduleStateView[];
}

export interface ReportCurrentHealthView {
  published_at: IsoDateTime | null;
  recommendation_report_id: UuidString;
  report_kind: ReportKind;
  valid_until: IsoDateTime | null;
}

export interface ReportScheduleGapView {
  decision_policy_snapshot_id: UuidString;
  detail: null | string;
  detected_at: IsoDateTime;
  first_scheduled_for: IsoDateTime;
  gap_id: UuidString;
  last_scheduled_for: IsoDateTime;
  missed_count: number;
  reason: ReportScheduleGapReason;
  schedule_id: string;
}

export interface ReportScheduleGapListQuery extends PageQuery, TimeRangeQuery {
  reason?: ReportScheduleGapReason;
  schedule_id?: string;
}

export interface ReportEvidenceDiagnosticsView {
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
}

export type RouteRunOutcome = 'failed' | 'ready' | 'zero_candidates';

export interface RouteModelLineage {
  calibration_artifact_id: UuidString;
  feature_contract_digest: string;
  model_run_id: null | UuidString;
  model_version_id: UuidString;
  pit_lineage_digest: string;
  prediction_horizon_secs: number;
  research_profile_artifact_id: string;
  research_profile_ref: ResearchProfileRef;
  serving_contract_digest: string;
  trade_policy_artifact_id: UuidString;
}

export interface RouteCandidateFunnel {
  admitted_economic_tiers: number;
  calibrated_candidates: number;
  eligible_markets: number;
  feature_complete_markets: number;
  selected_recommendations: number;
}

export interface ReportRouteDiagnosticsView {
  evidence: ReportEvidenceDiagnosticsView;
  funnel: RouteCandidateFunnel;
  lineage: null | RouteModelLineage;
  outcome: RouteRunOutcome;
  report_route_run_id: UuidString;
  route: BuyModelRoute;
}

export interface QuantReportDiagnosticsView {
  decision_boundary: DecisionBoundaryEvidenceView;
  global: ReportEvidenceDiagnosticsView;
  routes: ReportRouteDiagnosticsView[];
}

export interface ReportFunnelMarketListQuery extends PageQuery {
  primary_reason?: ReportFunnelReason;
  terminal_stage?: ReportFunnelStage;
}

export interface QuantReportListQuery extends PageQuery, TimeRangeQuery {
  kind?: ReportKind;
  route?: BuyModelRoute;
  status?: RecommendationReportStatus;
}

export interface RunReportRequest {
  knowledge_lag_secs?: number;
  reason: string;
  request_id: string;
  top_n?: number;
}

export interface RevokeReportRequest {
  reason: string;
}

export interface RetryReportRequest {
  reason: string;
  request_id: string;
}
