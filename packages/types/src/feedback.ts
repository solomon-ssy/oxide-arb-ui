import type { DecimalString, IsoDateTime, PageQuery } from './common';
import type { DatasetPurpose, MarketCategory, QuantRuntimeMode } from './enums';
import type { DatasetCohortCounts } from './research';
import type {
  ResearchEvaluationTrack,
  ResearchProfileRef,
} from './research-profile';

export type FeedbackCycleStatus =
  | 'cancelled'
  | 'failed'
  | 'queued'
  | 'running'
  | 'succeeded';

export type FeedbackDecision =
  | 'candidate_ready'
  | 'challenger_rejected'
  | 'no_action'
  | 'promoted';

export type FeedbackTriggerFamily = 'manual' | 'scheduled';

export type FeedbackCoverageDecision = 'advance' | 'no_action';

export type FeedbackStage =
  | 'calibration'
  | 'comparison'
  | 'coverage'
  | 'cpcv'
  | 'dataset_seal'
  | 'decision'
  | 'drift'
  | 'shadow_replay'
  | 'training'
  | 'trigger';

export type FeedbackStageEventKind =
  | 'cancellation_requested'
  | 'cancelled'
  | 'failed'
  | 'job_linked'
  | 'lease_recovered'
  | 'started'
  | 'succeeded'
  | 'triggered';

export type FeedbackDriftKind = 'concept' | 'data' | 'label';

export type FeedbackDriftMetric =
  | 'jensen_shannon_divergence'
  | 'kolmogorov_smirnov_p_value'
  | 'population_stability_index'
  | 'rank_ic_drop';

export type FeedbackDriftAssessment =
  | 'insufficient_evidence'
  | 'threshold_exceeded'
  | 'within_threshold';

export type FeedbackEvaluationPurpose = 'promotion_comparison';

export interface FeedbackCycleListQuery extends PageQuery {
  profile_id?: string;
  status?: FeedbackCycleStatus;
  trigger_family?: FeedbackTriggerFamily;
}

export type PromotionPermitStatus = 'active' | 'expired' | 'revoked';

export interface TriggerFeedbackCycleRequest {
  profile_id: string;
  reason: string;
}

export interface CancelFeedbackCycleRequest {
  reason: string;
}

export interface PromotionPermitListQuery extends PageQuery {
  category?: MarketCategory;
  profile_id?: string;
  status?: PromotionPermitStatus;
}

export interface IssuePromotionPermitRequest {
  allowed_runtime_modes: QuantRuntimeMode[];
  expires_at: IsoDateTime;
  feedback_cycle_id: string;
  idempotency_key: string;
  reason: string;
}

export interface RevokePromotionPermitRequest {
  expected_revision: number;
  reason: string;
}

/** `FeedbackCycleView` wire contract. All backend field names stay snake_case. */
export interface FeedbackCycleView {
  feedback_cycle_id: string;
  idempotency_hash: string;
  trigger_family: FeedbackTriggerFamily;
  profile_ref: ResearchProfileRef;
  research_profile_artifact_id: string;
  feedback_policy_hash: string;
  label_cutoff: IsoDateTime;
  capability_registry_hashes: string[];
  champion_model_version_id: string;
  champion_serving_contract_hash: string;
  /**
   * Immutable server-owned recipe document. UI01 treats it as opaque evidence;
   * later detail surfaces consume only typed API projections, never reinterpret
   * this JSON into client-owned execution semantics.
   */
  candidate_family: unknown;
  candidate_family_hash: string;
  status: FeedbackCycleStatus;
  decision: FeedbackDecision | null;
  terminal_reason_code: null | string;
  generation: number;
  lease_expires_at: IsoDateTime | null;
  cancel_requested_at: IsoDateTime | null;
  started_at: IsoDateTime | null;
  completed_at: IsoDateTime | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

export interface FeedbackCycleMutationView {
  cycle: FeedbackCycleView;
  replayed: boolean;
}

/** Server-derived promotion authority. No route or model mutation is exposed. */
export interface PromotionPermitView {
  promotion_permit_id: string;
  idempotency_key: string;
  scope_hash: string;
  issuance_hash: string;
  profile_ref: ResearchProfileRef;
  research_profile_artifact_id: string;
  category: MarketCategory;
  expected_policy_generation: number;
  expected_decision_policy_snapshot_id: string;
  expected_snapshot_hash: string;
  champion_model_version_id: string;
  champion_serving_contract_hash: string;
  allowed_runtime_modes: QuantRuntimeMode[];
  non_route_policy_hash: string;
  serving_constraints_hash: string;
  preflight_hash: string;
  issued_by_user_id: string;
  issued_by_username: string;
  issued_by_role: string;
  issuance_reason: string;
  expires_at: IsoDateTime;
  revoked_by_user_id: null | string;
  revoked_by_username: null | string;
  revoked_by_role: null | string;
  revocation_reason: null | string;
  revoked_at: IsoDateTime | null;
  revision: number;
  issued_at: IsoDateTime;
  updated_at: IsoDateTime;
  status: PromotionPermitStatus;
  observed_at: IsoDateTime;
}

export interface PromotionPermitMutationView {
  permit: PromotionPermitView;
  replayed: boolean;
}

export interface FeedbackStageEventView {
  feedback_stage_event_id: string;
  feedback_cycle_id: string;
  event_sequence: number;
  stage: FeedbackStage;
  event_kind: FeedbackStageEventKind;
  research_job_id: null | string;
  actor: null | string;
  reason_code: null | string;
  evidence_uri: null | string;
  evidence_hash: null | string;
  occurred_at: IsoDateTime;
  event_hash: string;
  created_at: IsoDateTime;
}

export interface DriftReportView {
  drift_report_id: string;
  feedback_cycle_id: string;
  kind: FeedbackDriftKind;
  metric: FeedbackDriftMetric;
  assessment: FeedbackDriftAssessment;
  baseline_window_start: IsoDateTime;
  baseline_window_end: IsoDateTime;
  evaluation_window_start: IsoDateTime;
  evaluation_window_end: IsoDateTime;
  label_cutoff: IsoDateTime;
  observed_value: DecimalString | null;
  threshold: DecimalString;
  sample_count: number;
  detail_uri: string;
  detail_hash: string;
  observed_at: IsoDateTime;
  report_hash: string;
  created_at: IsoDateTime;
}

export interface FeedbackEvaluationUseView {
  feedback_evaluation_use_id: string;
  feedback_cycle_id: string;
  purpose: FeedbackEvaluationPurpose;
  dataset_purpose: DatasetPurpose;
  profile_ref: ResearchProfileRef;
  research_profile_artifact_id: string;
  evaluation_dataset_id: string;
  evaluation_dataset_hash: string;
  evaluation_artifact_bytes_hash: string;
  cohort_manifest_hash: string;
  evaluation_window_start: IsoDateTime;
  evaluation_window_end: IsoDateTime;
  label_cutoff: IsoDateTime;
  champion_model_version_id: string;
  champion_serving_contract_hash: string;
  candidate_family_hash: string;
  comparison_contract_hash: string;
  semantic_use_hash: string;
  cpcv_artifact_uri: string;
  cpcv_artifact_hash: string;
  evaluation_use_hash: string;
  reserved_at: IsoDateTime;
  created_at: IsoDateTime;
}

export interface FeedbackCoverageView {
  artifact_id: string;
  artifact_uri: string;
  artifact_hash: string;
  evaluation_window_start: IsoDateTime;
  label_cutoff: IsoDateTime;
  policy_evaluation_count: number;
  mature_label_count: number;
  new_mature_label_count: number;
  minimum_mature_labels: number;
  minimum_new_mature_labels: number;
  minimum_coverage: DecimalString;
  coverage: DecimalString;
  decision: FeedbackCoverageDecision;
  reason_code: null | string;
  model_learning: DatasetCohortCounts;
  execution_learning: DatasetCohortCounts;
  policy_evaluation: DatasetCohortCounts;
}

/** Authoritative `GET /research/feedback-cycles/{cycle_id}` snapshot. */
export interface FeedbackCycleDetailView {
  cycle: FeedbackCycleView;
  timeline: FeedbackStageEventView[];
  coverage: FeedbackCoverageView | null;
  drift_reports: DriftReportView[];
  evaluation_uses: FeedbackEvaluationUseView[];
}

export interface FeedbackQueueView {
  queued: number;
  running: number;
  pending_outbox: number;
  oldest_queued_at: IsoDateTime | null;
  oldest_running_at: IsoDateTime | null;
}

export interface FeedbackReadinessView {
  observed_at: IsoDateTime;
  required_history_days: number;
  observed_history_days: null | number;
  retention_ready: boolean;
  latency_ready: boolean;
}

export interface FeedbackProfileOverviewView {
  profile_ref: ResearchProfileRef;
  category: MarketCategory | null;
  activation_eligibility: ResearchEvaluationTrack;
  feedback_policy_hash: string;
  evaluation_window_days: number;
  feedback_cadence_secs: number;
  minimum_mature_labels: number;
  minimum_new_mature_labels: number;
  retraining_cooldown_secs: number;
  minimum_coverage: DecimalString;
  latest_cycle: FeedbackCycleView | null;
  latest_coverage: FeedbackCoverageView | null;
}

/** Authoritative `GET /research/feedback-overview` snapshot. */
export interface FeedbackOverviewView {
  revision: number;
  generated_at: IsoDateTime;
  queue: FeedbackQueueView;
  readiness: FeedbackReadinessView | null;
  profiles: FeedbackProfileOverviewView[];
}
