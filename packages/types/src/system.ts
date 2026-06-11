import type { IsoDateTime, UsdString } from './common';
import type { BreakerStateName, ExecutionMode } from './enums';

export interface SystemStatus {
  execution_mode: ExecutionMode;
  breaker_state: BreakerStateName;
  uptime_secs: number;
  active_markets: number;
  open_positions: number;
  pending_reservations: number;
  total_exposure: UsdString;
  daily_pnl: UsdString;
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
