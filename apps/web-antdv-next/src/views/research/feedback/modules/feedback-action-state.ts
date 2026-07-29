import type {
  FeedbackCycleView,
  IsoDateTime,
  QuantRuntimeMode,
} from '@vben/types';

import { QUANT_RUNTIME_MODE_OPTIONS } from '@vben/types';

const FEEDBACK_REASON_PATTERN = /^[a-z0-9_.]{1,128}$/;

/** Mirror the stricter trigger/cancel reason grammar enforced by the backend. */
export function isFeedbackReasonValid(reason: string): boolean {
  return FEEDBACK_REASON_PATTERN.test(reason);
}

/** Return one trimmed machine reason or fail before issuing a governed request. */
export function validateFeedbackReason(reason: string): string {
  const trimmed = reason.trim();
  if (!isFeedbackReasonValid(trimmed)) {
    throw new TypeError('feedback reason does not match the wire contract');
  }
  return trimmed;
}

/** Deduplicate operator selection and restore the backend's canonical rank. */
export function canonicalPromotionModes(
  modes: readonly QuantRuntimeMode[],
): QuantRuntimeMode[] {
  const selected = new Set(modes);
  const canonical = QUANT_RUNTIME_MODE_OPTIONS.filter((mode) =>
    selected.has(mode),
  );
  if (canonical.length === 0) {
    throw new TypeError('at least one promotion runtime mode is required');
  }
  return canonical;
}

/** Parse a user-entered absolute expiry without inventing a client TTL. */
export function parsePromotionExpiry(
  value: string,
  nowMilliseconds = Date.now(),
): IsoDateTime {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= nowMilliseconds) {
    throw new TypeError('promotion permit expiry must be in the future');
  }
  return new Date(timestamp).toISOString();
}

/** Client-side affordance only; the server owns lifecycle authorization. */
export function canCancelFeedbackCycle(cycle: FeedbackCycleView): boolean {
  return (
    (cycle.status === 'queued' || cycle.status === 'running') &&
    cycle.cancel_requested_at === null
  );
}

/** Candidate-ready is the only UI issuance affordance; preflight stays server-side. */
export function canIssuePromotionPermit(cycle: FeedbackCycleView): boolean {
  return cycle.status === 'succeeded' && cycle.decision === 'candidate_ready';
}

/** Acquire one exact command key, returning false for a concurrent re-submit. */
export function tryBeginFeedbackAction(
  pending: Set<string>,
  actionKey: string,
): boolean {
  if (pending.has(actionKey)) {
    return false;
  }
  pending.add(actionKey);
  return true;
}

/** Release only the command key acquired by the matching action. */
export function releaseFeedbackAction(pending: Set<string>, actionKey: string) {
  pending.delete(actionKey);
}
