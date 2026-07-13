import type {
  BpsString,
  DecimalString,
  IsoDateTime,
  PageQuery,
  PriceString,
  ProbabilityString,
  SharesString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type {
  ApprovalStatus,
  EntryTriggerState,
  ExitSettlementMode,
  OrderIntentKind,
  OrderIntentStatus,
  QuantRuntimeMode,
  RedeemPolicy,
  Side,
} from './enums';
import type {
  ScaleOutTarget,
  ThesisInvalidationPolicy,
  TrailingStopPolicy,
} from './exit-plan';
import type { EntryTrigger } from './quant-recommendation';

/** CLOB order type — externally tagged (`gtd` carries an expiration epoch). */
export type OrderTypeSpec =
  | 'fak'
  | 'fok'
  | 'gtc'
  | { gtd: { expiration: number } };

export type OrderAmount =
  | { unit: 'shares'; value: SharesString }
  | { unit: 'usd'; value: UsdString };

/** Entry leg specification frozen onto an order intent. */
export interface EntryOrderSpec {
  token_id: string;
  side: Side;
  order_type: OrderTypeSpec;
  post_only: boolean;
  limit_price: PriceString;
  amount: OrderAmount;
  max_slippage_bps: BpsString;
  valid_until: IsoDateTime;
}

/**
 * Exit policy frozen onto an order intent — a faithful, complete projection of
 * the recommendation `ExitPlan` (shares the exit-plan primitives), plus the
 * frozen entry-thesis baselines (`entry_reference_price` / `entry_composite_score`)
 * used for percentage stops/targets and signal-degradation re-inference.
 */
export interface ExitPolicySpec {
  take_profit_price: null | PriceString;
  take_profit_pct: DecimalString | null;
  stop_loss_price: null | PriceString;
  stop_loss_pct: DecimalString | null;
  time_exit_at: IsoDateTime | null;
  max_hold_secs: null | number;
  trailing_stop: null | TrailingStopPolicy;
  thesis_invalidation: ThesisInvalidationPolicy;
  scale_out_targets: ScaleOutTarget[];
  settlement_mode: ExitSettlementMode;
  redeem_policy: RedeemPolicy;
  manual_review_at: IsoDateTime | null;
  entry_reference_price: PriceString;
  entry_composite_score: ProbabilityString;
}

/** `GET /quant/intents/{id}` — an order-intent lifecycle row. */
export interface OrderIntentView {
  order_intent_id: UuidString;
  recommendation_id: UuidString;
  runtime_mode: QuantRuntimeMode;
  runtime_config_version_id: UuidString;
  model_version_id: UuidString;
  intent_kind: OrderIntentKind;
  status: OrderIntentStatus;
  approval_status: ApprovalStatus;
  approved_by: null | UuidString;
  approval_reason: null | string;
  approved_at: IsoDateTime | null;
  policy_id: null | string;
  policy_hash: null | string;
  status_reason: null | string;
  admission_trace_ref: null | string;
  entry_trigger: EntryTrigger;
  entry_order: EntryOrderSpec;
  exit_policy: ExitPolicySpec;
  risk_envelope_hash: string;
  expires_at: IsoDateTime;
  entry_trigger_state: EntryTriggerState;
  trigger_confirming_since: IsoDateTime | null;
  trigger_last_observed_at: IsoDateTime | null;
  trigger_ready_at: IsoDateTime | null;
  entry_trigger_observation?: EntryTriggerObservationView | null;
  scale_out_state: {
    cumulative_exited_shares: SharesString;
    denominator_shares: null | SharesString;
    pending_target: null | {
      target_cumulative_exit_pct: DecimalString;
      target_id: null | string;
    };
    settled_target_ids: string[];
  };
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Ephemeral live-book observation computed when one intent detail is read. */
export interface EntryTriggerObservationView {
  current_price: null | PriceString;
  book_observed_at: IsoDateTime | null;
  book_age_ms: null | number;
  book_fresh: boolean;
  condition_satisfied: boolean;
  confirmation_remaining_secs: null | number;
  admission_blocker: null | string;
}

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

/** `POST /quant/intents` governed request body. */
export interface CreateOrderIntentRequest {
  recommendation_id: UuidString;
  reason: string;
}

/**
 * `POST /quant/intents/{id}/approve` governed request body.
 *
 * The optional overrides let an approver downscale sizing or tighten the limit
 * before releasing the intent for submission; omitting them approves the frozen
 * spec verbatim. `max_allowed_usd` is a defensive ceiling the backend re-checks
 * against the resolved notional.
 */
export interface ApproveOrderIntentRequest {
  reason: string;
  override_shares?: SharesString;
  override_limit_price?: PriceString;
  max_allowed_usd?: UsdString;
  override_note?: string;
}

/** Shared governed request body for reject/cancel actions (reason only). */
export interface IntentActionRequest {
  reason: string;
}
