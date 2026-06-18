import type { IsoDateTime, UsdString } from './common';
import type {
  BreakerStateName,
  ExecutionMode,
  MaterializationRunStatus,
} from './enums';

/**
 * Market-catalog warmup state (internally tagged on `state`). Detection is
 * gated off while `warming`; the control plane stays available.
 */
export type CatalogState =
  | { markets: number; state: 'ready'; synced_at: IsoDateTime }
  | { state: 'warming' };

/** Why the runtime is in the `degraded` operational phase. */
export type OperationalDegradeReason =
  | 'breaker_half_open'
  | 'breaker_open'
  | 'control_factor_live_warn'
  | 'control_factor_snapshot_expired'
  | 'market_data_coverage_degraded'
  | 'market_data_stale'
  | { subsystem_unhealthy: { name: string } };

/** Authoritative operator lifecycle (header UI + Live gate). */
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
}

/** CLOB websocket market-data readiness snapshot. */
export interface MarketDataConnectivity {
  ready: boolean;
  last_message_age_ms: null | number;
  ws_shards: WsShardConnectivity;
}

/** Execution kill-switch class on operator dashboards. */
export type ExecutionEmergencyClassView =
  | 'persistence_fault'
  | 'reservation_fault'
  | 'venue_fault';

/** Global execution kill-switch snapshot (distinct from risk circuit breaker). */
export interface ExecutionEmergencyView {
  active: boolean;
  class: ExecutionEmergencyClassView;
  requires_operator_ack: boolean;
  last_reason: null | string;
}

export const IDLE_EXECUTION_EMERGENCY: ExecutionEmergencyView = {
  active: false,
  class: 'venue_fault',
  last_reason: null,
  requires_operator_ack: false,
};

export interface SystemStatus {
  execution_mode: ExecutionMode;
  breaker_state: BreakerStateName;
  uptime_secs: number;
  active_markets: number;
  open_positions: number;
  pending_reservations: number;
  total_exposure: UsdString;
  daily_pnl: UsdString;
  catalog: CatalogState;
  operational_phase: OperationalPhase;
  market_data: MarketDataConnectivity;
  control_factor_publication_id: null | string;
  control_factor_snapshot_expired: boolean;
  control_factor_live_warn: boolean;
  execution_emergency: ExecutionEmergencyView;
  checked_at: IsoDateTime;
}

export type SystemBalanceSource =
  | 'authoritative_clob'
  | 'non_authoritative'
  | 'simulated_dry_run'
  | 'simulated_paper';

export type ExposureBindingLimit =
  | 'absolute_market'
  | 'absolute_total'
  | 'bankroll_cap'
  | 'percent_of_cash'
  | 'reservation_backend';

export interface SystemBalanceView {
  execution_mode: ExecutionMode;
  source: SystemBalanceSource;
  cash_balance_usd: UsdString;
  position_mark_value_usd: UsdString;
  equity_usd: UsdString;
  bankroll_cap_usd: UsdString;
  reserve_balance_usd: UsdString;
  reserved_usd: UsdString;
  total_exposure_usd: UsdString;
  available_for_sizing_usd: UsdString;
  potential_loss_usd: UsdString;
  blocking_trade_count: number;
  needs_reconcile_count: number;
  max_total_exposure_usd: UsdString;
  max_single_market_exposure_usd: UsdString;
  max_total_exposure_pct: string;
  binding_exposure_limit: ExposureBindingLimit;
  open_position_count: number;
  active_reservation_count: number;
  metrics_age_secs: number;
  is_authoritative: boolean;
  is_stale: boolean;
  checked_at: IsoDateTime;
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

export interface HealthReport {
  overall_healthy: boolean;
  checks: SubsystemHealth[];
  checked_at: IsoDateTime;
}

export type MaterializationScheduleActivationView =
  | {
      reason:
        | 'evidence_warmup'
        | 'live_only_evidence'
        | 'unsupported_execution_mode';
      state: 'inactive';
    }
  | { state: 'runnable' };

export type MaterializationScheduleModeContractView =
  | 'all_modes'
  | 'live_after_evidence_warmup'
  | 'live_only';

export interface MaterializationScheduleStatusView {
  schedule_id: string;
  activation: MaterializationScheduleActivationView;
  mode_contract: MaterializationScheduleModeContractView;
  last_run_at: IsoDateTime | null;
  last_success_at: IsoDateTime | null;
  last_terminal_status: MaterializationRunStatus | null;
  next_due_at: IsoDateTime | null;
}

export interface ModeTransitionReport {
  from: ExecutionMode;
  to: ExecutionMode;
}

export interface SwitchModeRequest {
  mode: ExecutionMode;
  reason: string;
}

export interface HaltRequest {
  reason: string;
}

export interface ResumeRequest {
  operator_ack: string;
}

export interface CircuitBreakerResetRequest {
  reason: string;
}
