import type {
  BpsString,
  DecimalString,
  IsoDateTime,
  PriceString,
} from './common';
import type { ExitTriggerKind } from './enums';

/**
 * Exit-plan primitives shared by the recommendation `ExitPlan` (the thesis) and
 * the frozen `ExitPolicySpec` on an order intent (the executable projection).
 * Backend defines both on the same `types::report_payload` structs, so they are
 * a single source of truth here — never duplicated per consumer.
 */

/** One scaled partial-exit node. */
export interface PartialExitNode {
  node_id: string;
  trigger_kind: ExitTriggerKind;
  /** Price / pct / seconds depending on `trigger_kind`. */
  trigger_value: DecimalString;
  /** Fraction of the remaining position to sell at this node. */
  sell_pct: DecimalString;
  min_price: null | PriceString;
  valid_after: IsoDateTime | null;
  valid_until: IsoDateTime | null;
  reason: string;
}

/** A trailing-stop policy relative to the position's peak mark. */
export interface TrailingStop {
  /** Trailing distance in basis points below the peak mark. */
  trail_bps: BpsString;
  /** Price that must be reached before the trailing stop arms. */
  activation_price: null | PriceString;
}

/** A condition that invalidates the recommendation thesis and forces an exit. */
export interface SignalInvalidationRule {
  rule_id: string;
  description: string;
  threshold: DecimalString | null;
}
