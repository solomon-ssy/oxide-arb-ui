import type {
  PageQuery,
  PriceString,
  TimeRangeQuery,
  UuidString,
} from './common';
import type {
  ApprovalStatus,
  OrderIntentStatus,
  QuantRuntimeMode,
} from './enums';
import type { EntryOrderSpec } from './generated/quant-operator-api';

type OrderAmount = EntryOrderSpec['amount'];

/** Filter + pagination for `GET /quant/intents`. */
export interface OrderIntentListQuery extends PageQuery, TimeRangeQuery {
  status?: OrderIntentStatus;
  /**
   * Comma-separated multi-status queue preset (e.g. `approved,approved_by_policy`).
   * When present the backend ignores `status`. Sent as a single CSV field
   * because the query string cannot carry repeated keys.
   */
  statuses?: string;
  approval_status?: ApprovalStatus;
  runtime_mode?: QuantRuntimeMode;
  recommendation_id?: UuidString;
}

/**
 * `POST /quant/intents/{id}/approve` governed request body.
 *
 * The tagged amount must preserve the frozen unit and may only decrease it.
 * The optional price may only tighten the side-aware bound.
 */
export interface ApproveOrderIntentRequest {
  reason: string;
  override_amount?: OrderAmount;
  override_price?: PriceString;
}

/** Shared governed request body for reject/cancel actions (reason only). */
export interface IntentActionRequest {
  reason: string;
}
