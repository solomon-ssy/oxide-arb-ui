import type { DecimalString, IsoDateTime, PageQuery } from './common';
import type { DatasetPurpose, MarketCategory, ModelFamily } from './enums';
import type { BuyModelRoute } from './generated/config-api';
import type { ExecutionAuthorityCeiling } from './generated/quant-operator-api';
import type { DatasetCohortCounts, QualityGateReportView } from './research';
import type {
  ResearchEvaluationTrack,
  ResearchProfileRef,
} from './research-profile';

export type FeedbackCycleStatus =
  | 'cancelled'
  | 'failed'
  | 'quarantined'
  | 'queued'
  | 'running'
  | 'succeeded';

export type FeedbackDecision =
  | 'candidate_ready'
  | 'challenger_rejected'
  | 'no_action'
  | 'promoted';

export type FeedbackTriggerFamily = 'manual' | 'scheduled';

export type FeedbackEvaluationMode = 'conditional' | 'forced_retraining';

export type FeedbackCoverageDecision = 'advance' | 'no_action';

export type FeedbackStage =
  | 'attribution'
  | 'calibration'
  | 'comparison'
  | 'coverage'
  | 'cpcv'
  | 'dataset_seal'
  | 'decision'
  | 'drift'
  | 'recipe_plan'
  | 'shadow'
  | 'shadow_bind'
  | 'training'
  | 'trigger'
  | 'truth_freeze'
  | 'validation';

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
  | 'target_rank_ic_drop';

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

export interface DriftReportListQuery extends PageQuery {
  feedback_cycle_id?: string;
  profile_id?: string;
  kind?: FeedbackDriftKind;
  metric?: FeedbackDriftMetric;
}

export type PromotionPermitStatus = 'active' | 'expired' | 'revoked';

export type ShadowBindingStatus =
  | 'active'
  | 'cancelled'
  | 'promoted'
  | 'rejected';

export interface FeedbackCycleTriggerRequest {
  evaluation_mode: FeedbackEvaluationMode;
  idempotency_key: string;
  parent_cycle_id: null | string;
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
  feedback_cycle_id: string;
  idempotency_key: string;
  note: string;
  reason_code: string;
  ttl_secs: number;
}

export interface RevokePromotionPermitRequest {
  expected_revision: number;
  note: string;
  reason_code: string;
}

export interface FeedbackSchedulerControlRequest {
  expected_pause_revision: number;
  note: string;
  reason_code: string;
}

export interface ActivateModelRouteRequest {
  expected_policy_generation: number;
  expected_runtime_control_revision: number;
  feedback_cycle_id: string;
  idempotency_key: string;
  note: string;
  promotion_permit_id: string;
  reason_code: string;
}

export interface RejectShadowBindingRequest {
  expected_binding_generation: number;
  expected_policy_generation: number;
  idempotency_key: string;
  note: string;
  reason_code: string;
}

export type ResolutionProjectionStatus =
  | 'delivering'
  | 'excluded'
  | 'mapping_blocked'
  | 'pending'
  | 'quarantined'
  | 'retry_scheduled'
  | 'verified';

export type ResolutionProjectionErrorCode =
  | 'catalog_mapping_unavailable'
  | 'external_dependency_unavailable'
  | 'invalid_observation'
  | 'persistence_unavailable'
  | 'unexpected_transient';

export type ResolutionRemediationAction = 'exclude' | 'requeue';

export interface RemediateResolutionProjectionRequest {
  action: ResolutionRemediationAction;
  expected_revision: number;
  idempotency_key: string;
  operator_note: string;
  reason_code: string;
}

export interface BootstrapModelRouteRequest {
  expected_policy_generation: number;
  expected_runtime_control_revision: number;
  idempotency_key: string;
  model_version_id: string;
  note: string;
  reason_code: string;
}

/** `FeedbackCycleView` wire contract. All backend field names stay snake_case. */
export interface FeedbackCycleView {
  feedback_cycle_id: string;
  idempotency_hash: string;
  profile_ref: ResearchProfileRef;
  research_profile_artifact_id: string;
  feedback_policy_hash: string;
  label_cutoff: IsoDateTime;
  champion_model_version_id: string;
  champion_serving_contract_hash: string;
  champion_model_spec_id: string;
  champion_model_spec_definition_hash: string;
  champion_model_family: ModelFamily;
  route: BuyModelRoute;
  decision_policy_snapshot_id: string;
  decision_policy_snapshot_hash: string;
  policy_bundle_generation: number;
  route_generation: number;
  evaluation_mode: FeedbackEvaluationMode;
  parent_cycle_id: null | string;
  forced_idempotency_key: null | string;
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

export interface FeedbackCycleTriggerView {
  cycle: FeedbackCycleView;
  cycle_reused: boolean;
  trigger_replayed: boolean;
}

/** Server-derived promotion authority. No route or model mutation is exposed. */
export interface PromotionPermitView {
  promotion_permit_id: string;
  idempotency_key: string;
  scope_hash: string;
  issuance_hash: string;
  feedback_cycle_id: string;
  profile_ref: ResearchProfileRef;
  research_profile_artifact_id: string;
  category: MarketCategory;
  expected_policy_generation: number;
  expected_runtime_control_revision: number;
  expected_decision_policy_snapshot_id: string;
  expected_snapshot_hash: string;
  expected_route_generation: number;
  champion_model_version_id: string;
  champion_serving_contract_hash: string;
  candidate_model_version_id: string;
  candidate_manifest_id: string;
  candidate_manifest_hash: string;
  promotion_gate_hash: string;
  maximum_execution_authority: ExecutionAuthorityCeiling;
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

export interface ModelRouteRollbackTargetView {
  activated_model_version_id: string;
  restored_model_version_id: string;
  rollback_target_revision_hash: string;
  rollback_target_revision_id: string;
  route: BuyModelRoute;
  shadow_cleared: boolean;
}

export interface ModelRouteActivationReceiptView {
  activated_by_role: string;
  activated_by_user_id: string;
  activated_by_username: string;
  activated_model_routing_revision_id: string;
  activated_model_version_id: string;
  activated_route_generation: number;
  audit_event_id: string;
  execution_authority_unchanged: boolean;
  feedback_cycle_id: string;
  model_governance_audit_id: string;
  outbox_event_id: string;
  permit_issued_by_role: string;
  permit_issued_by_user_id: string;
  permit_issued_by_username: string;
  policy_activation_id: string;
  previous_model_version_id: string;
  previous_route_generation: number;
  promotion_permit_id: string;
  rollback_target: ModelRouteRollbackTargetView;
  route: BuyModelRoute;
  server_timestamp: IsoDateTime;
  transaction_hash: string;
}

export interface ModelRouteActivationMutationView {
  receipt: ModelRouteActivationReceiptView;
  replayed: boolean;
}

export interface ShadowBindingRejectionReceipt {
  audit_event_id: string;
  binding_id: string;
  champion_model_version_id: string;
  cleared_route_generation: number;
  committed_model_routing_revision_id: string;
  committed_policy_generation: number;
  committed_snapshot_hash: string;
  committed_snapshot_id: string;
  feedback_cycle_id: string;
  idempotency_key: string;
  note: string;
  policy_activation_id: string;
  previous_binding_generation: number;
  previous_model_routing_revision_id: string;
  previous_policy_generation: number;
  reason_code: string;
  rejected_at: IsoDateTime;
  rejected_by_role: string;
  rejected_by_user_id: string;
  rejected_by_username: string;
  rejected_model_version_id: string;
  request_hash: string;
  route: BuyModelRoute;
}

export interface ShadowBindingRejectionReceiptView {
  outbox_event_id: string;
  receipt: ShadowBindingRejectionReceipt;
  replayed: boolean;
}

export interface ResolutionObservationInboxInfo {
  available_at: IsoDateTime;
  block_hash: string;
  block_number: number;
  created_at: IsoDateTime;
  denominator: string;
  instrument_key: string;
  log_index: number;
  market_id: string;
  no_numerator: string;
  no_payout_ratio: DecimalString;
  oracle: string;
  provider_revision: string;
  question_id: string;
  raw_payload_hash: string;
  raw_uri: string;
  resolution_observation_id: string;
  resolved_at: IsoDateTime;
  source_checkpoint_hash: string;
  source_id: string;
  transaction_hash: string;
  yes_numerator: string;
  yes_payout_ratio: DecimalString;
}

export interface ResolutionObservationProjectionInfo {
  attempt_count: number;
  canonical_fact_hash: null | string;
  claim_owner: null | string;
  created_at: IsoDateTime;
  last_error: null | string;
  last_error_code: null | ResolutionProjectionErrorCode;
  lease_expires_at: IsoDateTime | null;
  next_attempt_at: IsoDateTime | null;
  resolution_observation_id: string;
  revision: number;
  source_checkpoint_hash: string;
  status: ResolutionProjectionStatus;
  updated_at: IsoDateTime;
  verified_at: IsoDateTime | null;
}

export interface ResolutionProjectionRemediationInfo {
  action: ResolutionRemediationAction;
  actor_role: string;
  actor_user_id: string;
  actor_username: string;
  committed_revision: number;
  created_at: IsoDateTime;
  expected_revision: number;
  idempotency_key: string;
  operator_note: string;
  prior_error: string;
  prior_error_code: ResolutionProjectionErrorCode;
  prior_status: ResolutionProjectionStatus;
  reason_code: string;
  remediation_id: string;
  request_hash: string;
  resolution_observation_id: string;
  resulting_status: ResolutionProjectionStatus;
}

export interface ResolutionProjectionAttentionItem {
  observation: ResolutionObservationInboxInfo;
  projection: ResolutionObservationProjectionInfo;
  remediations: ResolutionProjectionRemediationInfo[];
}

export interface ResolutionProjectionRemediationView {
  projection: ResolutionObservationProjectionInfo;
  remediation: ResolutionProjectionRemediationInfo;
  replayed: boolean;
}

export interface ModelRouteBootstrapReceiptView {
  activated_by_role: string;
  activated_by_user_id: string;
  activated_by_username: string;
  activated_model_version_id: string;
  activated_route_generation: number;
  audit_event_id: string;
  category: MarketCategory;
  execution_authority_unchanged: boolean;
  model_governance_audit_id: string;
  outbox_event_id: string;
  policy_activation_id: string;
  previous_route_generation: number;
  replayed: boolean;
  server_timestamp: IsoDateTime;
  transaction_hash: string;
}

export type FeedbackSchedulerFailureKind = 'materialization' | 'settlement';

export interface FeedbackSchedulerStateView {
  attempt: number;
  cadence_secs: number;
  coalesced_gap_count: number;
  cooldown_secs: number;
  cooldown_until: IsoDateTime | null;
  created_at: IsoDateTime;
  feedback_policy_hash: string;
  last_coalesced_from: IsoDateTime | null;
  last_coalesced_to: IsoDateTime | null;
  last_cutoff: IsoDateTime | null;
  last_cycle_id: null | string;
  last_error: null | string;
  last_failure_kind: FeedbackSchedulerFailureKind | null;
  last_settlement_error: null | string;
  last_settlement_failed_at: IsoDateTime | null;
  lease_expires_at: IsoDateTime | null;
  lease_owner: null | string;
  next_due_at: IsoDateTime;
  pending_cutoff: IsoDateTime | null;
  pending_started_at: IsoDateTime | null;
  pause_note: null | string;
  pause_reason_code: null | string;
  pause_revision: number;
  paused: boolean;
  profile_hash: string;
  research_profile_artifact_id: string;
  research_profile_id: string;
  retry_at: IsoDateTime | null;
  revision: number;
  settlement_failure_count: number;
  updated_at: IsoDateTime;
}

export interface FeedbackSchedulerListView {
  items: FeedbackSchedulerStateView[];
  observed_at: IsoDateTime;
}

export interface FeedbackSchedulerMutationView {
  observed_at: IsoDateTime;
  state: FeedbackSchedulerStateView;
}

export interface FeedbackTriggerEventView {
  actor_label: string;
  actor_role: null | string;
  actor_user_id: null | string;
  event_hash: string;
  feedback_cycle_id: string;
  feedback_trigger_event_id: string;
  occurred_at: IsoDateTime;
  reason_code: string;
  trigger_family: FeedbackTriggerFamily;
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
  model_learning_candidate_count: number;
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

export interface FeedbackCandidateComparisonView {
  observation_count: number;
  effect_bps: DecimalString;
  simultaneous_lower_bound_bps: DecimalString;
  adjusted_p_value: DecimalString;
  confidence: DecimalString;
}

export interface FeedbackCandidateShadowView {
  observed: number;
  required: number;
  served_window_secs: number;
  required_window_secs: number;
  mean_topn_decision_overlap: DecimalString;
  minimum_topn_decision_overlap: DecimalString;
  any_hard_divergence: boolean;
}

export interface FeedbackAttributionSummaryView {
  prior_cycle_use_count: number;
  prediction_explanation_count: number;
  decision_intervention_replay_count: number;
  resolution_outcome_association_count: number;
  execution_outcome_association_count: number;
  execution_trajectory_count: number;
  policy_counterfactual_count: number;
  use_set_hash: string;
  produced_set_hash: string;
}

export interface FeedbackRouteDiffView {
  route: BuyModelRoute;
  shadow_binding_id: string;
  shadow_bound_at: IsoDateTime;
  shadow_binding_generation: number;
  shadow_binding_status: ShadowBindingStatus;
  shadow_lifecycle_generation: number;
  shadow_terminated_at: IsoDateTime | null;
  shadow_termination_policy_activation_id: null | string;
  shadow_termination_reason_code: null | string;
  current_policy_generation: number;
  current_route_generation: number;
  proposed_route_generation: number;
  champion_model_version_id: string;
  candidate_model_version_id: string;
  execution_authority_unchanged: boolean;
}

export interface FeedbackCandidateReadyView {
  quality_gate: QualityGateReportView;
  comparison: FeedbackCandidateComparisonView;
  shadow: FeedbackCandidateShadowView;
  attribution: FeedbackAttributionSummaryView;
  route_diff: FeedbackRouteDiffView;
  blockers: string[];
}

/** Authoritative `GET /research/feedback-cycles/{cycle_id}` snapshot. */
export interface FeedbackCycleDetailView {
  activation_receipt: ModelRouteActivationReceiptView | null;
  cycle: FeedbackCycleView;
  coverage: FeedbackCoverageView | null;
  candidate_ready: FeedbackCandidateReadyView | null;
  drift_reports: DriftReportView[];
  evaluation_uses: FeedbackEvaluationUseView[];
  timeline: FeedbackStageEventView[];
  triggers: FeedbackTriggerEventView[];
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

export interface FeedbackTruthOperationsView {
  execution_attempt_sealed_through: IsoDateTime;
  execution_attempt_unsealed_count: number;
  observed_at: IsoDateTime;
  recommendation_rollup_sealed_through: IsoDateTime;
  recommendation_rollup_unsealed_count: number;
  resolution_attention: ResolutionProjectionAttentionItem[];
  resolution_excluded_count: number;
  resolution_mapping_blocked_count: number;
  resolution_oldest_unresolved_at: IsoDateTime | null;
  resolution_quarantined_count: number;
  resolution_terminal_through: IsoDateTime;
  resolution_unresolved_count: number;
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
  truth_operations: FeedbackTruthOperationsView;
  readiness: FeedbackReadinessView | null;
  profiles: FeedbackProfileOverviewView[];
}
