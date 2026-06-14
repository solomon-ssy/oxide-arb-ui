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
  checked_at: IsoDateTime;
}

export interface SubsystemHealth {
  name: string;
  healthy: boolean;
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
