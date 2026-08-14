import type {
  FeedbackCycleView,
  PromotionPermitStatus,
  PromotionPermitView,
} from '@vben/types';

const FEEDBACK_REASON_PATTERN = /^[a-z0-9_.]{1,128}$/;
export const PERMIT_TTL_PRESETS: readonly number[] = [300, 900, 1800, 3600];

export type PromotionPermitPresentationStatus =
  | 'invalid'
  | PromotionPermitStatus;

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

/** Restrict the operator UI to the governed 5/15/30/60 minute presets. */
export function validatePermitTtl(ttlSecs: number): number {
  if (!PERMIT_TTL_PRESETS.includes(ttlSecs)) {
    throw new TypeError('promotion permit TTL is not an approved preset');
  }
  return ttlSecs;
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

/** Present the exact route generation consumed by activation, never policy generation. */
export function promotionRouteGenerationDiff(
  permit: PromotionPermitView,
): string {
  return `${permit.expected_route_generation} → ${permit.expected_route_generation + 1}`;
}

/**
 * Derive remaining authority from the server clock snapshot and a monotonic
 * local elapsed duration. The browser wall clock never participates.
 */
export function promotionPermitRemaining(
  permit: PromotionPermitView,
  receivedAt: number,
  now: number,
): null | number {
  const observedAt = Date.parse(permit.observed_at);
  const expiresAt = Date.parse(permit.expires_at);
  if (
    !Number.isFinite(observedAt) ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(receivedAt) ||
    !Number.isFinite(now) ||
    expiresAt < observedAt
  ) {
    return null;
  }
  const elapsedLocally = Math.max(0, now - receivedAt);
  return Math.max(
    0,
    Math.floor((expiresAt - observedAt - elapsedLocally) / 1000),
  );
}

/** Present stale active snapshots as expired once their server-derived TTL elapses. */
export function promotionPermitStatus(
  permit: PromotionPermitView,
  receivedAt: number,
  now: number,
): PromotionPermitPresentationStatus {
  if (permit.status !== 'active') {
    return permit.status;
  }
  const remaining = promotionPermitRemaining(permit, receivedAt, now);
  if (remaining === null) {
    return 'invalid';
  }
  return remaining === 0 ? 'expired' : 'active';
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
