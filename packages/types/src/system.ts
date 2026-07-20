import type { IsoDateTime } from './common';
import type { KillSwitchState, QuantRuntimeMode } from './enums';
import type { ExecutionRecoverySummary } from './execution-recovery';
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

export type BootstrapPhase =
  | 'active'
  | 'awaiting_activation'
  | 'collecting_baseline'
  | 'initializing';

export type CapabilityReason =
  | 'bootstrap_initializing'
  | 'bootstrap_not_active'
  | 'bootstrap_not_collecting'
  | 'catalog_baseline_missing'
  | 'control_plane_not_ready'
  | 'kill_switch_blocks_entries'
  | 'no_serving_evidence'
  | 'operational_phase_blocks_reports'
  | 'operational_phase_blocks_submission'
  | 'runtime_mode_report_only';

export interface BootstrapView {
  bootstrap_contract_version: number;
  phase: BootstrapPhase;
  state_revision: number;
}

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
  bootstrap: BootstrapView;
  capabilities: SystemCapabilities;
}

export interface ActivateBootstrapRequest {
  bootstrap_contract_version: number;
  expected_state_revision: number;
  reason: string;
  report_only_forced_ack: boolean;
}

/** `GET /system/quant-mode` — the current runtime mode. */
export interface QuantModeView {
  mode: QuantRuntimeMode;
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
  mode: QuantRuntimeMode;
  reason: string;
}

/** `POST /system/kill-switch` request body (`ack` clears `emergency_halted`). */
export interface SetKillSwitchRequest {
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
