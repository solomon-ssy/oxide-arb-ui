import type {
  BpsString,
  DecimalString,
  IsoDateTime,
  PriceString,
} from './common';

/**
 * Exit-plan primitives shared by the recommendation `ExitPlan` (the thesis) and
 * the frozen `ExitPolicySpec` on an order intent (the executable projection).
 * Backend defines both on the same `types::report_payload` structs, so they are
 * a single source of truth here — never duplicated per consumer.
 */

/** One monotonic cumulative scale-out target. */
export interface ScaleOutTarget {
  target_id: string;
  trigger_price: PriceString;
  target_cumulative_exit_pct: DecimalString;
  min_price: null | PriceString;
  valid_after: IsoDateTime | null;
  valid_until: IsoDateTime | null;
  reason: string;
}

/** A trailing-stop policy relative to the position's peak mark. */
export interface TrailingStopPolicy {
  /** Trailing distance in basis points below the peak mark. */
  trail_bps: BpsString;
  /** Price that must be reached before the trailing stop arms. */
  activation_price: null | PriceString;
}

/** A condition that invalidates the recommendation thesis and forces an exit. */
export interface ThesisInvalidationPolicy {
  min_score_retention: DecimalString;
  min_expected_return_bps: BpsString;
  require_execution_eligibility: boolean;
}
