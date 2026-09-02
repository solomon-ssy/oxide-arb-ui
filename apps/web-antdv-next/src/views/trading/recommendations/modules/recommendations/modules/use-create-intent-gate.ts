/**
 * Pure eligibility gate for creating an `OrderIntent` from a recommendation.
 *
 * The button is enabled only when every production invariant the backend
 * enforces at `POST /quant/intents` holds. The gate is a pure function (no Vue /
 * store access) so the permission x authorization-policy x kill-switch x eligibility x
 * risk-envelope x validity x lifecycle matrix is unit-testable in isolation.
 *
 * It reuses the shared `@vben/types` execution-gate predicates so the checks stay
 * byte-for-byte aligned with the Rust services, and returns the *first* blocking
 * reason so the UI tooltip explains the primary obstacle.
 */
import type {
  EntryAuthorizationPolicy,
  KillSwitchState,
  QuantRecommendationView,
} from '@vben/types';

import {
  isExecutionEligible,
  isRecommendationActionableForIntent,
  isReportActionableForIntent,
  isRiskEnvelopeActionable,
  killSwitchAllowsNewEntry,
} from '@vben/types';

/** First blocking reason (maps to `page.quantRecommendations.createIntent.disabled.*`). */
export type CreateIntentBlockReason =
  | 'activeIntent'
  | 'authorizationPolicy'
  | 'eligibility'
  | 'killSwitch'
  | 'permission'
  | 'recommendationStatus'
  | 'reportStatus'
  | 'riskEnvelope'
  | 'validity';

export interface CreateIntentGateInput {
  /** Holder of `order_intent:create`. */
  canCreate: boolean;
  /** Live entry authorization policy, null before first paint. */
  entryAuthorizationPolicy: EntryAuthorizationPolicy | null;
  /** Live kill-switch state (`systemStore.status.kill_switch.state`), null before first paint. */
  killSwitchState: KillSwitchState | null;
  recommendation: Omit<
    Pick<
      QuantRecommendationView,
      | 'active_order_intent_id'
      | 'execution_eligibility'
      | 'report_status'
      | 'status'
      | 'trade_plan'
      | 'valid_from'
      | 'valid_until'
    >,
    'trade_plan'
  > & {
    trade_plan: {
      risk_envelope: Pick<
        QuantRecommendationView['trade_plan']['risk_envelope'],
        'max_loss_usd' | 'max_position_usd'
      >;
    };
  };
  /** Evaluation instant in epoch ms (defaults to `Date.now()`); injectable for tests. */
  now?: number;
}

export interface CreateIntentGate {
  enabled: boolean;
  /** First failing reason, or `null` when enabled. */
  reason: CreateIntentBlockReason | null;
}

function withinValidity(
  validFrom: string,
  validUntil: string,
  now: number,
): boolean {
  const from = Date.parse(validFrom);
  const until = Date.parse(validUntil);
  if (Number.isNaN(from) || Number.isNaN(until)) {
    return false;
  }
  return now >= from && now <= until;
}

/** Evaluate whether intent creation is permitted for a recommendation. */
export function evaluateCreateIntentGate(
  input: CreateIntentGateInput,
): CreateIntentGate {
  const {
    canCreate,
    killSwitchState,
    now = Date.now(),
    recommendation,
    entryAuthorizationPolicy,
  } = input;

  if (!canCreate) {
    return { enabled: false, reason: 'permission' };
  }

  if (entryAuthorizationPolicy === null) {
    return { enabled: false, reason: 'authorizationPolicy' };
  }

  // Kill-switch must admit new entries (only `closed` does).
  if (killSwitchState === null || !killSwitchAllowsNewEntry(killSwitchState)) {
    return { enabled: false, reason: 'killSwitch' };
  }

  if (
    !isExecutionEligible(
      recommendation.execution_eligibility,
      entryAuthorizationPolicy,
    )
  ) {
    return { enabled: false, reason: 'eligibility' };
  }

  if (!isRiskEnvelopeActionable(recommendation.trade_plan.risk_envelope)) {
    return { enabled: false, reason: 'riskEnvelope' };
  }

  if (
    !withinValidity(recommendation.valid_from, recommendation.valid_until, now)
  ) {
    return { enabled: false, reason: 'validity' };
  }

  if (!isReportActionableForIntent(recommendation.report_status)) {
    return { enabled: false, reason: 'reportStatus' };
  }

  if (!isRecommendationActionableForIntent(recommendation.status)) {
    return { enabled: false, reason: 'recommendationStatus' };
  }

  // A blocking pre-submission intent already exists for this recommendation.
  if (recommendation.active_order_intent_id !== null) {
    return { enabled: false, reason: 'activeIntent' };
  }

  return { enabled: true, reason: null };
}
