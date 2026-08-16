import type { IsoDateTime } from './common';
import type {
  KillSwitchState,
  QuantRuntimeMode,
  SettlementWritePolicy,
  TrainingDatasetStatus,
} from './enums';
import type { ExecutionRecoverySummary } from './execution-recovery';
import type { BuyModelRoute } from './generated/config-api';
import type { ReconciliationView } from './reconciliation';

/**
 * Market-catalog warmup state (internally tagged on `state`). Ingest is gated
 * off while `warming`; the control plane stays available.
 */
export type CatalogState =
  | { markets: number; state: 'ready'; synced_at: IsoDateTime }
  | { state: 'warming' };

/** Why the runtime is in the `degraded` operational phase. */
export type OperationalDegradeReason =
  | 'breaker_half_open'
  | 'breaker_open'
  | 'market_data_coverage_degraded'
  | 'market_data_stale'
  | { kill_switch_tightened: { state: KillSwitchState } }
  | { subsystem_unhealthy: { name: string } };

/** Authoritative operator lifecycle (header UI + execution gate). */
export type OperationalPhase =
  | { phase: 'catalog_warming' }
  | { phase: 'degraded'; reasons: OperationalDegradeReason[] }
  | { phase: 'halted' }
  | { phase: 'market_data_connecting' }
  | { phase: 'operational' };

/** Aggregated per-shard websocket connection counters (display only). */
export interface WsShardConnectivity {
  total: number;
  disconnected: number;
  oldest_disconnected_secs: null | number;
  connected_ratio_bps: number;
}

/** CLOB websocket market-data readiness snapshot. */
export interface MarketDataConnectivity {
  ready: boolean;
  last_message_age_ms: null | number;
  ws_shards: WsShardConnectivity;
}

/** Operational kill-switch snapshot (mirrors Rust `KillSwitchView`). */
export interface KillSwitchView {
  state: KillSwitchState;
  requires_operator_ack: boolean;
  revision: number;
  last_reason: string;
  changed_by: string;
  changed_at: IsoDateTime;
}

/** `GET /system/execution-recovery` — recovery detail with blocking rows. */
export interface ExecutionRecoveryView {
  summary: ExecutionRecoverySummary;
  blocking_reconciliations: ReconciliationView[];
  kill_switch: KillSwitchView;
}

export type ExchangeHistoryStage =
  | 'activation_ready'
  | 'attesting'
  | 'extracting'
  | 'identity_sync'
  | 'projecting'
  | 'quarantined'
  | 'startup_probe';

export type ColdStartSloStatus =
  | 'on_track'
  | 'violation'
  | 'warming_up'
  | 'warning';

export interface ExchangeHistoryFrontierProgress {
  stage: ExchangeHistoryStage;
  slo_status: ColdStartSloStatus;
  started_at: IsoDateTime;
  activation_from_block: null | number;
  accepted_through_block: null | number;
  target_block: null | number;
  retention_from_block: null | number;
  retention_accepted_from_block: null | number;
  retention_through_block: null | number;
  crypto_required_from_block: null | number;
  weather_required_from_block: null | number;
  blocks_processed: number;
  logs_accepted: number;
  block_rate_milli: number;
  hypersync_retry_count: number;
  attestor_retry_count: number;
  unresolved_count: number;
  quarantine_count: number;
  projected_completion_at: IsoDateTime | null;
  updated_at: IsoDateTime;
}

export type FreshBootStage =
  | 'awaiting_source_coverage'
  | 'bootstrap_committed'
  | 'bootstrap_preflight'
  | 'calibration_dataset_queued'
  | 'calibration_dataset_ready'
  | 'calibration_dataset_running'
  | 'calibration_queued'
  | 'calibration_ready'
  | 'calibration_running'
  | 'cpcv_queued'
  | 'cpcv_ready'
  | 'cpcv_running'
  | 'dataset_queued'
  | 'dataset_ready'
  | 'dataset_running'
  | 'first_report_published'
  | 'first_report_queued'
  | 'parity_ready'
  | 'scenario_ready'
  | 'training_queued'
  | 'training_ready'
  | 'training_running';

export type FreshBootStatus =
  | 'blocked_terminal'
  | 'retry_scheduled'
  | 'running'
  | 'succeeded'
  | 'superseded'
  | 'waiting_evidence';

export type FreshBootRetryReason =
  | 'dependency_unavailable'
  | 'job_retry_scheduled'
  | 'preflight_stale'
  | 'provider_unavailable'
  | 'report_pending'
  | 'source_coverage_incomplete'
  | 'storage_transient';

export type FreshBootBlockedReason =
  | 'bootstrap_conflict'
  | 'calibration_failed'
  | 'cpcv_failed'
  | 'dataset_build_failed'
  | 'decode_failure'
  | 'history_quarantined'
  | 'insufficient_mature_labels'
  | 'model_training_failed'
  | 'parity_failed'
  | 'policy_unavailable'
  | 'provider_mismatch'
  | 'quality_gate_failed'
  | 'report_enqueue_failed'
  | 'report_publication_failed'
  | 'retry_budget_exhausted'
  | 'scenario_binding_failed'
  | 'source_coverage_invalid'
  | 'source_slice_mismatch'
  | 'unknown_token';

export type ResearchReadinessSource =
  | 'aviation_weather'
  | 'binance_market_data'
  | 'catalog_ledger'
  | 'clob_l2'
  | 'clob_market_info'
  | 'domain_observation'
  | 'execution_participant'
  | 'gamma_market_identity'
  | 'gefs_ensemble'
  | 'ghcnh_calibration'
  | 'market_execution'
  | 'polymarket_resolution'
  | 'polymarket_rtds';

export interface FreshBootSourceCoverage {
  source: ResearchReadinessSource;
  object: string;
  earliest_event_time: IsoDateTime;
  latest_event_time: IsoDateTime;
  row_count: number;
}

export interface FreshBootSourceCoverageManifest {
  history_plan_id: string;
  history_policy_hash: string;
  availability_policy_hash: string;
  fit_seal_id: string;
  fit_seal_hash: string;
  readiness_evidence_id: string;
  source_registry_hash: string;
  window_start: IsoDateTime;
  window_end: IsoDateTime;
  pit_cutoff: IsoDateTime;
  history_from_block: number;
  history_through_block: number;
  requirements: FreshBootSourceCoverage[];
  sealed_at: IsoDateTime;
}

export type FreshBootRecommendedAction =
  | 'inspect_running_job'
  | 'resolve_and_supersede'
  | 'retry_now'
  | 'view_first_report'
  | 'wait_for_evidence';

export type FreshBootBlockerScope =
  | 'bootstrap_governance'
  | 'report_publication'
  | 'research_job'
  | 'source_coverage';

export type FreshBootBlockerCode =
  | { code: FreshBootBlockedReason; kind: 'terminal' }
  | { code: FreshBootRetryReason; kind: 'retryable' };

export interface FreshBootBlockerView {
  code: FreshBootBlockerCode;
  scope: FreshBootBlockerScope;
  evidence_ref: null | string;
  retryable: boolean;
  next_retry_at: IsoDateTime | null;
  detail: string;
  recommended_action: FreshBootRecommendedAction;
}

export interface FreshBootRunProgressView {
  run_id: string;
  supersedes_run_id: null | string;
  research_profile_artifact_id: string;
  profile_hash: string;
  route: BuyModelRoute;
  stage: FreshBootStage;
  status: FreshBootStatus;
  source_coverage_manifest: FreshBootSourceCoverageManifest | null;
  source_coverage_hash: null | string;
  source_slice_id: null | string;
  source_slice_hash: null | string;
  decision_policy_snapshot_id: string;
  model_spec_id: null | string;
  training_dataset_id: null | string;
  calibration_dataset_id: null | string;
  source_model_version_id: null | string;
  model_version_id: null | string;
  path_set_id: null | string;
  calibration_id: null | string;
  parity_run_id: null | string;
  scenario_artifact_id: null | string;
  scenario_artifact_hash: null | string;
  bootstrap_preflight_hash: null | string;
  active_job_id: null | string;
  last_job_id: null | string;
  bootstrap_policy_activation_id: null | string;
  first_report_run_id: null | string;
  first_report_id: null | string;
  next_scheduled_report_at: IsoDateTime | null;
  blocker: FreshBootBlockerView | null;
  retry_count: number;
  next_attempt_at: IsoDateTime | null;
  revision: number;
  stage_entered_at: IsoDateTime;
  started_at: IsoDateTime;
  completed_at: IsoDateTime | null;
  updated_at: IsoDateTime;
}

export type FreshBootEventKind =
  | 'bootstrap_committed'
  | 'bootstrap_prepared'
  | 'calibration_completed'
  | 'calibration_dataset_completed'
  | 'calibration_dataset_enqueued'
  | 'calibration_dataset_started'
  | 'calibration_enqueued'
  | 'calibration_started'
  | 'cpcv_completed'
  | 'cpcv_enqueued'
  | 'cpcv_started'
  | 'dataset_completed'
  | 'dataset_started'
  | 'evidence_wait_scheduled'
  | 'parity_verified'
  | 'preflight_refreshed'
  | 'report_enabled'
  | 'report_published'
  | 'report_retried'
  | 'retry_accelerated'
  | 'retry_scheduled'
  | 'retry_started'
  | 'run_created'
  | 'scenario_bound'
  | 'source_coverage_satisfied'
  | 'superseded'
  | 'terminal_blocked'
  | 'training_completed'
  | 'training_enqueued'
  | 'training_started';

export interface FreshBootRunEventView {
  event_id: string;
  sequence: number;
  from_stage: FreshBootStage;
  to_stage: FreshBootStage;
  from_status: FreshBootStatus;
  to_status: FreshBootStatus;
  event: FreshBootEventKind;
  research_job_id: null | string;
  result_ref: null | string;
  evidence_ref: null | string;
  attempt: number;
  actor: string;
  detail: null | string;
  occurred_at: IsoDateTime;
}

export interface FreshBootRunDetailView {
  run: FreshBootRunProgressView;
  events: FreshBootRunEventView[];
}

export interface RetryFreshBootRunRequest {
  expected_revision: number;
  reason: string;
}

export interface SupersedeFreshBootRunRequest {
  expected_revision: number;
  reason: string;
}

export interface FreshBootProfileProgressView {
  run: FreshBootRunProgressView;
  last_event: FreshBootRunEventView | null;
  training_dataset_status: null | TrainingDatasetStatus;
  training_sample_count: null | number;
  calibration_dataset_status: null | TrainingDatasetStatus;
  calibration_sample_count: null | number;
}

export type FreshBootCapabilityState =
  | 'all_routes_ready'
  | 'awaiting_history'
  | 'blocked'
  | 'bootstrapping'
  | 'first_report_queued'
  | 'first_report_ready'
  | 'partial_blocked';

export interface FreshBootCapabilitySummary {
  state: FreshBootCapabilityState;
  pooled_first_report_id: null | string;
  first_report_ready: boolean;
  all_routes_ready: boolean;
  blocked_routes: BuyModelRoute[];
}

/** `GET /system/fresh-boot` — L2-free activation and first-report progress. */
export interface FreshBootProgressView {
  observed_at: IsoDateTime;
  exchange_history: ExchangeHistoryFrontierProgress;
  capability: FreshBootCapabilitySummary;
  profiles: FreshBootProfileProgressView[];
}

export type ExchangeHistoryFrontier = 'activation' | 'retention';

export type ExchangeHistoryQuarantineStatus = 'active' | 'all' | 'resolved';

export type ExchangeHistoryQuarantineKind =
  | 'archive_probe_failure'
  | 'continuity_mismatch'
  | 'contract_mismatch'
  | 'decode_failure'
  | 'missing_correlation'
  | 'parent_hash_mismatch'
  | 'provider_mismatch'
  | 'unknown_token';

export type ExchangeHistoryQuarantineEvidence =
  | {
      actual: string;
      block_number: number;
      kind: 'archive_probe_failure';
      provider_id: string;
    }
  | {
      actual: string;
      contract_address: null | string;
      expected: null | string;
      kind: 'projection_failure';
      log_index: null | number;
      token_id: null | string;
      transaction_hash: null | string;
      version: null | string;
    }
  | {
      actual: string;
      expected: string;
      from_block: number;
      kind: 'continuity_mismatch';
      to_block: number;
    }
  | {
      attestor_count: number;
      attestor_digest: string;
      extractor_count: number;
      extractor_digest: string;
      kind: 'provider_mismatch';
    };

export type ExchangeHistoryQuarantineDisposition =
  | 'accepted_replacement'
  | 'canonical_supersession';

export interface ExchangeHistoryQuarantineResolutionView {
  resolution_id: string;
  disposition: ExchangeHistoryQuarantineDisposition;
  replacement_chunk_id: string;
  evidence_hash: string;
  actor: string;
  resolved_at: IsoDateTime;
}

export interface ExchangeHistoryQuarantineView {
  quarantine_id: string;
  chunk_id: string;
  frontier: ExchangeHistoryFrontier;
  from_block: number;
  to_block: number;
  kind: ExchangeHistoryQuarantineKind;
  evidence: ExchangeHistoryQuarantineEvidence;
  evidence_hash: string;
  quarantined_at: IsoDateTime;
  resolution: ExchangeHistoryQuarantineResolutionView | null;
}

export interface ExchangeHistoryQuarantinePageView {
  items: ExchangeHistoryQuarantineView[];
  next_after: null | string;
}

export interface ExchangeHistoryQuarantineQuery {
  after?: string;
  frontier?: ExchangeHistoryFrontier;
  kind?: ExchangeHistoryQuarantineKind;
  limit?: number;
  status?: ExchangeHistoryQuarantineStatus;
}

/** `GET /system/status` — the operator system snapshot. */
export interface SystemStatus {
  quant_runtime_mode: QuantRuntimeMode;
  uptime_secs: number;
  active_markets: number;
  catalog: CatalogState;
  operational_phase: OperationalPhase;
  market_data: MarketDataConnectivity;
  kill_switch: KillSwitchView;
  execution_recovery: ExecutionRecoverySummary;
  checked_at: IsoDateTime;
}

export type CapabilityReason =
  | 'catalog_baseline_missing'
  | 'control_plane_not_ready'
  | 'kill_switch_blocks_entries'
  | 'no_serving_evidence'
  | 'operational_phase_blocks_reports'
  | 'operational_phase_blocks_submission'
  | 'runtime_mode_report_only';

export interface CapabilityView {
  enabled: boolean;
  reasons: CapabilityReason[];
}

export interface SystemCapabilities {
  revision: number;
  control_plane_ready: CapabilityView;
  catalog_baseline_ready: CapabilityView;
  research_capture_enabled: CapabilityView;
  report_generation_eligible: CapabilityView;
  entry_admission_eligible: CapabilityView;
  order_submission_eligible: CapabilityView;
  automatic_parity_eligible: CapabilityView;
}

export interface ActionEligibilityDecision {
  enabled: boolean;
  permission_granted: boolean;
  capability: CapabilityView;
}

/** User-scoped RBAC and runtime-capability decisions for consequential actions. */
export interface ActionEligibilityView {
  capability_revision: number;
  report_generation: ActionEligibilityDecision;
  entry_admission: ActionEligibilityDecision;
  order_submission: ActionEligibilityDecision;
}

/** Authenticated `GET /system/status` control-plane snapshot. */
export interface SystemControlPlaneStatus extends SystemStatus {
  capabilities: SystemCapabilities;
}

/** Coherent singleton returned by `GET /system/runtime-controls`. */
export interface RuntimeControlSnapshot {
  quant_runtime_mode: QuantRuntimeMode;
  settlement_write_policy: SettlementWritePolicy;
  kill_switch_state: KillSwitchState;
  kill_switch_requires_ack: boolean;
  revision: number;
  changed_by: string;
  reason: string;
  changed_at: IsoDateTime;
}

/** One preflight check outcome (mirrors Rust `PreflightCheck`). */
export interface PreflightCheck {
  /** Stable check identifier (e.g. `"credentials_loaded"`). */
  name: string;
  /** Whether failing this check blocks the transition. */
  hard: boolean;
  passed: boolean;
  /** Human-readable evidence for operators and the audit trail. */
  detail: string;
}

/** Preflight evidence for an upgrade mode transition. */
export interface PreflightReport {
  target: QuantRuntimeMode;
  checks: PreflightCheck[];
  /** `true` when every hard check passed (the transition may proceed). */
  passed: boolean;
}

/**
 * `POST /system/quant-mode` result (governed mode hot-swap). `preflight` is
 * `null` for no-ops and downgrades, which skip business preflight.
 */
export interface QuantModeTransitionReport {
  from: QuantRuntimeMode;
  to: QuantRuntimeMode;
  preflight: null | PreflightReport;
}

/** `POST /system/quant-mode` request body. */
export interface SwitchQuantModeRequest {
  expected_revision: number;
  mode: QuantRuntimeMode;
  reason: string;
}

export interface SwitchSettlementWritePolicyRequest {
  expected_revision: number;
  policy: SettlementWritePolicy;
  reason: string;
}

/** Kill-switch request body (`ack` clears a latched state). */
export interface SetKillSwitchRequest {
  expected_revision: number;
  state: KillSwitchState;
  reason: string;
  ack?: boolean;
}

export type SubsystemCheckStatus =
  | { reason: string; status: 'skipped' }
  | { status: 'healthy' }
  | { status: 'unhealthy' };

export interface SubsystemHealth {
  name: string;
  status: SubsystemCheckStatus;
  latency_ms: null | number;
  detail: null | string;
}

/** `GET /system/health` — per-subsystem health report. */
export interface HealthReport {
  overall_healthy: boolean;
  checks: SubsystemHealth[];
  checked_at: IsoDateTime;
}
