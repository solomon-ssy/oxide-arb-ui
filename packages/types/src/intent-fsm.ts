/**
 * Pure order-intent FSM predicates mirroring the backend intent-service guards.
 *
 * These are the single client-side source of truth for "which governed action
 * is legal on an intent in this state", kept aligned with the Rust services so
 * the UI hides illegal actions rather than surfacing a button the backend will
 * reject:
 *
 * - {@link intentActions}.canApprove / canReject ↔ `approve_at` /
 *   `reject_at` (`status == PendingAuthorization`)
 * - {@link intentActions}.canCancel ↔ `cancel_at` ("not-yet-submitted intent")
 * Approved states are dispatcher-owned: approval arms future automatic
 * submission, so the client exposes no manual submit predicate.
 * - {@link isIntentTerminal} ↔ the intent lifecycle terminals (no further
 *   operator or dispatcher action)
 */
import type { OrderIntentStatus } from './enums';

import { ORDER_INTENT_STATUSES } from './enums';

/** Governed operator actions available on an intent in a given state. */
export interface IntentActionAvailability {
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
}

/**
 * States an operator may still cancel. `admission_pending` is a transient
 * dispatcher-owned claim and is excluded to avoid racing submission.
 */
const CANCELABLE_STATUSES = new Set<OrderIntentStatus>([
  ORDER_INTENT_STATUSES.authorized,
  ORDER_INTENT_STATUSES.pendingAuthorization,
]);

/**
 * Intent lifecycle terminals — capital is released or committed and no operator
 * or dispatcher transition remains. `submitted` / `partially_filled` are *in
 * flight* (not terminal) but also expose no operator action.
 */
export const INTENT_TERMINAL_STATUSES: readonly OrderIntentStatus[] = [
  ORDER_INTENT_STATUSES.admissionRejected,
  ORDER_INTENT_STATUSES.authorizationRejected,
  ORDER_INTENT_STATUSES.cancelled,
  ORDER_INTENT_STATUSES.expired,
  ORDER_INTENT_STATUSES.failed,
  ORDER_INTENT_STATUSES.filled,
  ORDER_INTENT_STATUSES.invalidated,
];

const TERMINAL_STATUSES = new Set<OrderIntentStatus>(INTENT_TERMINAL_STATUSES);

/** Resolve the legal governed approve/reject/cancel actions for a status. */
export function intentActions(
  status: OrderIntentStatus,
): IntentActionAvailability {
  const pending = status === ORDER_INTENT_STATUSES.pendingAuthorization;
  return {
    canApprove: pending,
    canReject: pending,
    canCancel: CANCELABLE_STATUSES.has(status),
  };
}

/** Whether the intent has reached a lifecycle terminal (no actions remain). */
export function isIntentTerminal(status: OrderIntentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
