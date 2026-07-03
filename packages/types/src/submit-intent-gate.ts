/**
 * Pure eligibility gate for submitting an approved `OrderIntent` to the venue.
 *
 * The Submit button is enabled only when every production invariant the backend
 * enforces at `POST /quant/intents/{id}/submit` (dispatcher `ensure_submittable`
 * + the admission `RuntimeModeCheck` / `KillSwitchCheck` + recovery latch) holds
 * for the operator-observable inputs. The gate is a pure function (no Vue /
 * store access) so the full permission x status x mode x kill-switch x recovery
 * x expiry matrix is unit-testable in isolation, and returns the *first*
 * blocking reason so the UI tooltip explains the primary obstacle.
 *
 * Account freshness is intentionally *not* a gate input: it is surfaced as
 * read-only context in the confirm modal (live account fetch), and a stale /
 * unavailable account fails closed at submit time on the backend (503/409),
 * whose detail the governed modal shows verbatim.
 */
import type {
  KillSwitchState,
  OrderIntentStatus,
  QuantRuntimeMode,
} from './enums';

import { KILL_SWITCH_STATES, QUANT_RUNTIME_MODES } from './enums';
import { intentSubmitAllowed, isIntentSubmittableStatus } from './intent-fsm';

/** First blocking reason (maps to `page.quantIntents.submit.disabled.*`). */
export type SubmitIntentBlockReason =
  | 'expired'
  | 'killSwitch'
  | 'mode'
  | 'modeApprovalMismatch'
  | 'notSubmittable'
  | 'permission'
  | 'recoveryBlocked'
  | 'systemLoading';

export interface SubmitIntentGateInput {
  /** Holder of `order_intent:submit`. */
  canSubmit: boolean;
  /** The intent's current lifecycle status. */
  status: OrderIntentStatus;
  /** Intent expiry (ISO-8601); a passed deadline fails `ensure_submittable`. */
  expiresAt: string;
  /** Live runtime mode (`systemStore.status.quant_runtime_mode`), null pre-paint. */
  runtimeMode: null | QuantRuntimeMode;
  /** Live kill-switch state (`systemStore.status.kill_switch.state`), null pre-paint. */
  killSwitchState: KillSwitchState | null;
  /** Auto-execution recovery latch (`execution_recovery.auto_execution_blocked`). */
  autoExecutionBlocked: boolean;
  /** Evaluation instant in epoch ms (defaults to `Date.now()`); injectable for tests. */
  now?: number;
}

export interface SubmitIntentGate {
  enabled: boolean;
  /** First failing reason, or `null` when enabled. */
  reason: null | SubmitIntentBlockReason;
}

/** Evaluate whether a manual submit is permitted for an intent. */
export function evaluateSubmitIntentGate(
  input: SubmitIntentGateInput,
): SubmitIntentGate {
  const {
    autoExecutionBlocked,
    canSubmit,
    expiresAt,
    killSwitchState,
    now = Date.now(),
    runtimeMode,
    status,
  } = input;

  if (!canSubmit) {
    return { enabled: false, reason: 'permission' };
  }

  if (!isIntentSubmittableStatus(status)) {
    return { enabled: false, reason: 'notSubmittable' };
  }

  // System status must be painted before we gate on mode or kill-switch.
  if (runtimeMode === null || killSwitchState === null) {
    return { enabled: false, reason: 'systemLoading' };
  }

  // The runtime mode must permit order submission.
  if (runtimeMode === QUANT_RUNTIME_MODES.reportOnly) {
    return { enabled: false, reason: 'mode' };
  }

  // The approval provenance must match the mode (operator vs policy approval).
  if (!intentSubmitAllowed(status, runtimeMode)) {
    return { enabled: false, reason: 'modeApprovalMismatch' };
  }

  // Kill-switch must admit new entries (only `closed` does).
  if (killSwitchState !== KILL_SWITCH_STATES.closed) {
    return { enabled: false, reason: 'killSwitch' };
  }

  // Auto-execution submits are blocked while recovery holds the plane.
  if (
    runtimeMode === QUANT_RUNTIME_MODES.autoExecution &&
    autoExecutionBlocked
  ) {
    return { enabled: false, reason: 'recoveryBlocked' };
  }

  // The intent must not have passed its TTL deadline.
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry) || expiry <= now) {
    return { enabled: false, reason: 'expired' };
  }

  return { enabled: true, reason: null };
}
