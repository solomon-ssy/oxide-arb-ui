import type {
  KillSwitchState,
  QuantRuntimeMode,
  RecommendationReportStatus,
  RecommendationStatus,
} from './enums';
import type {
  ExecutionEligibility,
  RiskEnvelope,
} from './quant-recommendation';

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
 * - {@link isRiskEnvelopeActionable} ↔ the mode-gate risk-envelope positivity check
 *
 * All monetary parsing goes through `decimal.js` — never `number` / `parseFloat`.
 */
import Decimal from 'decimal.js';

import {
  KILL_SWITCH_STATES,
  QUANT_RUNTIME_MODES,
  RECOMMENDATION_REPORT_STATUSES,
  RECOMMENDATION_STATUSES,
} from './enums';

/**
 * Whether the recommendation is eligible for execution in `mode`.
 *
 * Mirrors Rust `ExecutionEligibility::is_eligible`: the mode must be listed, and
 * `auto_execution` additionally requires an empty `ineligibility_reasons` set.
 */
export function isExecutionEligible(
  eligibility: Pick<
    ExecutionEligibility,
    'eligible_modes' | 'ineligibility_reasons'
  >,
  mode: QuantRuntimeMode,
): boolean {
  if (!eligibility.eligible_modes.includes(mode)) {
    return false;
  }
  return (
    mode !== QUANT_RUNTIME_MODES.autoExecution ||
    eligibility.ineligibility_reasons.length === 0
  );
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
 * strictly positive (mirrors the mode gate's `RiskEnvelopeInvalid` guard).
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
