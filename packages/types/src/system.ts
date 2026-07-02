import type { IsoDateTime } from './common';
import type { KillSwitchState, QuantRuntimeMode } from './enums';
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
  | 'market_data_coverage_degraded'
  | 'market_data_stale'
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

/** Next-step hint the recovery coordinator surfaces to operators. */
export type ExecutionRecoveryStep = string;

/** Execution-recovery rollup embedded in {@link SystemStatus}. */
export interface ExecutionRecoverySummary {
  has_unresolvable_reconciliation: boolean;
  unresolvable_count: number;
  kill_switch_requires_ack: boolean;
  kill_switch_state: KillSwitchState;
  quant_runtime_mode: QuantRuntimeMode;
  auto_execution_blocked: boolean;
  next_steps: ExecutionRecoveryStep[];
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

/** `GET /system/quant-mode` — the current runtime mode. */
export interface QuantModeView {
  mode: QuantRuntimeMode;
}

/** `POST /system/quant-mode` result (governed mode hot-swap). */
export interface QuantModeTransitionReport {
  from: QuantRuntimeMode;
  to: QuantRuntimeMode;
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

/** `GET /system/deploy-config` — credential-masked deploy config snapshot. */
export type DeployConfigView = Record<string, unknown>;
