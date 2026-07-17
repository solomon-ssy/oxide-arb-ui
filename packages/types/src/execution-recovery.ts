import type {
  ExecutionRecoveryStep,
  KillSwitchState,
  QuantRuntimeMode,
} from './enums';

/** Safety-state rollup shared by system status and reconciliation responses. */
export interface ExecutionRecoverySummary {
  has_unresolvable_reconciliation: boolean;
  unresolvable_count: number;
  kill_switch_requires_ack: boolean;
  kill_switch_state: KillSwitchState;
  quant_runtime_mode: QuantRuntimeMode;
  auto_execution_blocked: boolean;
  next_steps: ExecutionRecoveryStep[];
}
