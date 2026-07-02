import type {
  IsoDateTime,
  PageQuery,
  ProbabilityString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type {
  AccountSource,
  EmptyReportReason,
  MarketCategory,
  OutcomeSide,
  QuantRuntimeMode,
  RecommendationReportStatus,
  RejectionReason,
  ReportKind,
  ReportTriggerKind,
} from './enums';

/** Report header row (`GET /quant/reports`, `.../latest`). */
export interface QuantReportView {
  recommendation_report_id: UuidString;
  report_kind: ReportKind;
  trigger_kind: ReportTriggerKind;
  status: RecommendationReportStatus;
  runtime_mode: QuantRuntimeMode;
  as_of: IsoDateTime;
  top_n: number;
  account_source: AccountSource;
  capital_base_usd: UsdString;
  published_recommendation_count: number;
  total_suggested_usd: UsdString;
  empty_reason: EmptyReportReason | null;
  published_at: IsoDateTime | null;
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

/** Report detail (`GET /quant/reports/{id}`, `.../latest`). */
export interface QuantReportDetailView extends QuantReportView {
  trigger_key: string;
  trigger_time: IsoDateTime;
  source_delay_secs: number;
  horizon_secs: number;
  account_snapshot_ref: UuidString;
  runtime_config_version_id: UuidString;
  model_version_id: UuidString;
  market_selection_id: UuidString;
  summary: ReportSummary;
}

/** One recommendation delta between two reports. */
export interface RecommendationDeltaView {
  market_id: string;
  outcome_side: OutcomeSide;
  base_recommendation_id: null | UuidString;
  compare_recommendation_id: null | UuidString;
  base_rank: null | number;
  compare_rank: null | number;
  base_suggested_usd: null | UsdString;
  compare_suggested_usd: null | UsdString;
  suggested_usd_delta: UsdString;
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
  kind?: ReportKind;
  status?: RecommendationReportStatus;
  trigger_kind?: ReportTriggerKind;
  runtime_mode?: QuantRuntimeMode;
}

/** `POST /quant/reports/run` governed request body. */
export interface RunReportRequest {
  reason: string;
  request_id?: string;
  top_n?: number;
  source_delay_secs?: number;
}

/** `POST /quant/reports/run` accepted (202) response. */
export interface RunReportAccepted {
  request_id: string;
  trigger_key: string;
}

/** `POST /quant/reports/{id}/revoke` governed request body. */
export interface RevokeReportRequest {
  reason: string;
}
