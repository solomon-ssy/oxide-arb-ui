import type {
  EntryAuthorizationPolicy,
  KillSwitchState,
  RecommendationReportStatus,
  RecommendationStatus,
} from './enums';
import type {
  ExecutionAuthorityCeiling,
  ExecutionEligibility,
  RiskEnvelope,
} from './generated/quant-operator-api';

/**
 * Pure execution-gate predicates mirroring the backend intent-creation guards.
 *
 * These are the single client-side source of truth for "may this recommendation
 * still become an order intent", kept byte-for-byte aligned with the Rust
 * services so the UI never enables an action the backend will reject:
 *
 * - {@link isExecutionEligible} ↔ `ExecutionEligibility::is_eligible`
 * - {@link killSwitchAllowsNewEntry} ↔ `KillSwitchState::allows_new_entry`
 * - {@link isRecommendationActionableForIntent} ↔ `RecommendationStatus::is_actionable_for_intent`
 * - {@link isReportActionableForIntent} ↔ the report-side create guard (`published` only)
 * - {@link isRiskEnvelopeActionable} ↔ the intent-creation risk-envelope positivity check
 *
 * All monetary parsing goes through `decimal.js` — never `number` / `parseFloat`.
 */
import Decimal from 'decimal.js';

import {
  ENTRY_AUTHORIZATION_POLICIES,
  KILL_SWITCH_STATES,
  RECOMMENDATION_REPORT_STATUSES,
  RECOMMENDATION_STATUSES,
} from './enums';

/**
 * Whether the recommendation ceiling admits the live authorization policy.
 *
 * Mirrors Rust `ExecutionEligibility::is_eligible`: operator authorization may
 * use either executable ceiling, while policy automatic additionally requires
 * the maximum ceiling and an empty blocker set.
 */
export function isExecutionEligible(
  eligibility: Pick<ExecutionEligibility, 'blockers' | 'ceiling'>,
  policy: EntryAuthorizationPolicy,
): boolean {
  const ceiling: ExecutionAuthorityCeiling = eligibility.ceiling;
  if (ceiling === 'analysis_only') {
    return false;
  }
  if (policy === ENTRY_AUTHORIZATION_POLICIES.operatorApprovalRequired) {
    return ceiling === 'operator_approval' || ceiling === 'policy_automatic';
  }
  return ceiling === 'policy_automatic' && eligibility.blockers.length === 0;
}

/** Whether new entries may be opened — only the `closed` kill-switch state admits them. */
export function killSwitchAllowsNewEntry(state: KillSwitchState): boolean {
  return state === KILL_SWITCH_STATES.closed;
}

/** Whether the parent report still admits intent creation (only `published`). */
export function isReportActionableForIntent(
  status: RecommendationReportStatus,
): boolean {
  return status === RECOMMENDATION_REPORT_STATUSES.published;
}

/**
 * Whether a new intent may still be created from this recommendation.
 *
 * Mirrors Rust `RecommendationStatus::is_actionable_for_intent`
 * (`published` | `intent_created`).
 */
export function isRecommendationActionableForIntent(
  status: RecommendationStatus,
): boolean {
  return (
    status === RECOMMENDATION_STATUSES.published ||
    status === RECOMMENDATION_STATUSES.intentCreated
  );
}

/**
 * Whether the risk envelope is usable: both the position and loss caps must be
 * strictly positive (mirrors the intent-creation `RiskEnvelopeInvalid` guard).
 */
export function isRiskEnvelopeActionable(
  envelope: Pick<RiskEnvelope, 'max_loss_usd' | 'max_position_usd'>,
): boolean {
  return (
    isPositiveDecimal(envelope.max_position_usd) &&
    isPositiveDecimal(envelope.max_loss_usd)
  );
}

/** Exact `> 0` test on a backend decimal string (no float intermediate). */
function isPositiveDecimal(value: string): boolean {
  try {
    const decimal = new Decimal(value);
    return decimal.isFinite() && decimal.greaterThan(0);
  } catch {
    return false;
  }
}
