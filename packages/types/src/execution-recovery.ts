import type {
  EntryAuthorizationPolicy,
  ExecutionRecoveryStep,
  KillSwitchState,
} from './enums';

/** Safety-state rollup shared by system status and reconciliation responses. */
export interface ExecutionRecoverySummary {
  has_unresolvable_reconciliation: boolean;
  unresolvable_count: number;
  kill_switch_requires_ack: boolean;
  kill_switch_state: KillSwitchState;
  entry_authorization_policy: EntryAuthorizationPolicy;
  policy_automatic_blocked: boolean;
  next_steps: ExecutionRecoveryStep[];
}
