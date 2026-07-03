/**
 * Pure order-intent FSM predicates mirroring the backend intent-service guards.
 *
 * These are the single client-side source of truth for "which governed action
 * is legal on an intent in this state", kept aligned with the Rust services so
 * the UI hides illegal actions rather than surfacing a button the backend will
 * reject:
 *
 * - {@link intentActions}.canApprove / canReject ↔ `approve_at` /
 *   `reject_at` (`status == PendingApproval`)
 * - {@link intentActions}.canCancel ↔ `cancel_at` ("not-yet-submitted intent")
 * - {@link intentSubmitAllowed} ↔ dispatcher `ensure_submittable` **and** the
 *   admission `RuntimeModeCheck`: `semi_auto` submits an operator-`Approved`
 *   intent, `auto_execution` submits a policy-`ApprovedByPolicy` intent, and
 *   `report_only` never submits.
 * - {@link isIntentTerminal} ↔ the intent lifecycle terminals (no further
 *   operator or dispatcher action)
 */
import type { OrderIntentStatus, QuantRuntimeMode } from './enums';

import { ORDER_INTENT_STATUSES, QUANT_RUNTIME_MODES } from './enums';

/** Governed operator actions available on an intent in a given state. */
export interface IntentActionAvailability {
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
}

/**
 * States an operator may still cancel — the not-yet-submitted set. `draft` is
 * the enum default (never produced by creation) but stays cancelable for
 * completeness; `admission_pending` is a transient dispatcher-owned claim and is
 * intentionally excluded to avoid racing submission.
 */
const CANCELABLE_STATUSES = new Set<OrderIntentStatus>([
  ORDER_INTENT_STATUSES.approved,
  ORDER_INTENT_STATUSES.approvedByPolicy,
  ORDER_INTENT_STATUSES.draft,
  ORDER_INTENT_STATUSES.pendingApproval,
]);

/**
 * Statuses the dispatcher accepts for submission regardless of mode (mirrors
 * `ensure_submittable`). Whether a *specific* status is submittable in the
 * *current* mode is decided by {@link intentSubmitAllowed}.
 */
const SUBMITTABLE_STATUSES = new Set<OrderIntentStatus>([
  ORDER_INTENT_STATUSES.approved,
  ORDER_INTENT_STATUSES.approvedByPolicy,
]);

/**
 * Intent lifecycle terminals — capital is released or committed and no operator
 * or dispatcher transition remains. `submitted` / `partially_filled` are *in
 * flight* (not terminal) but also expose no operator action.
 */
export const INTENT_TERMINAL_STATUSES: readonly OrderIntentStatus[] = [
  ORDER_INTENT_STATUSES.admissionRejected,
  ORDER_INTENT_STATUSES.cancelled,
  ORDER_INTENT_STATUSES.expired,
  ORDER_INTENT_STATUSES.failed,
  ORDER_INTENT_STATUSES.filled,
  ORDER_INTENT_STATUSES.invalidated,
  ORDER_INTENT_STATUSES.rejected,
];

const TERMINAL_STATUSES = new Set<OrderIntentStatus>(INTENT_TERMINAL_STATUSES);

/** Resolve the legal governed approve/reject/cancel actions for a status. */
export function intentActions(
  status: OrderIntentStatus,
): IntentActionAvailability {
  const pending = status === ORDER_INTENT_STATUSES.pendingApproval;
  return {
    canApprove: pending,
    canReject: pending,
    canCancel: CANCELABLE_STATUSES.has(status),
  };
}

/** Whether the status is submittable in some mode (dispatcher precondition). */
export function isIntentSubmittableStatus(status: OrderIntentStatus): boolean {
  return SUBMITTABLE_STATUSES.has(status);
}

/**
 * Whether an operator submit is legal for `status` under `runtimeMode`,
 * byte-aligned with the backend `RuntimeModeCheck`:
 *
 * - `report_only` never submits (real-account sizing, not dry-run).
 * - `semi_auto` submits an operator-`approved` intent.
 * - `auto_execution` submits a policy-`approved_by_policy` intent.
 */
export function intentSubmitAllowed(
  status: OrderIntentStatus,
  runtimeMode: QuantRuntimeMode,
): boolean {
  switch (runtimeMode) {
    case QUANT_RUNTIME_MODES.autoExecution: {
      return status === ORDER_INTENT_STATUSES.approvedByPolicy;
    }
    case QUANT_RUNTIME_MODES.semiAuto: {
      return status === ORDER_INTENT_STATUSES.approved;
    }
    default: {
      return false;
    }
  }
}

/** Whether the intent has reached a lifecycle terminal (no actions remain). */
export function isIntentTerminal(status: OrderIntentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
