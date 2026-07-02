import type {
  BpsString,
  IsoDateTime,
  PageQuery,
  PriceString,
  ProbabilityString,
  SharesString,
  UuidString,
} from './common';
import type {
  ApprovalStatus,
  OrderIntentKind,
  OrderIntentStatus,
  QuantRuntimeMode,
  Side,
} from './enums';

/** CLOB order type — externally tagged (`gtd` carries an expiration epoch). */
export type OrderTypeSpec = 'fok' | 'gtc' | { gtd: { expiration: number } };

/** Entry leg specification frozen onto an order intent. */
export interface EntryOrderSpec {
  token_id: string;
  side: Side;
  order_type: OrderTypeSpec;
  limit_price: PriceString;
  shares: SharesString;
  max_slippage_bps: BpsString;
  valid_until: IsoDateTime;
}

/** Exit policy specification frozen onto an order intent. */
export interface ExitPolicySpec {
  take_profit_price: null | PriceString;
  stop_loss_price: null | PriceString;
  time_exit_at: IsoDateTime | null;
  settlement_mode: string;
  redeem_policy: string;
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
  entry_order: EntryOrderSpec;
  exit_policy: ExitPolicySpec;
  risk_envelope_hash: string;
  expires_at: IsoDateTime;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Filter + pagination for `GET /quant/intents`. */
export interface OrderIntentListQuery extends PageQuery {
  status?: OrderIntentStatus;
  approval_status?: ApprovalStatus;
  recommendation_id?: UuidString;
}

/** `POST /quant/intents` governed request body. */
export interface CreateOrderIntentRequest {
  recommendation_id: UuidString;
  reason: string;
}

/** Shared governed request body for approve/reject/cancel/submit actions. */
export interface IntentActionRequest {
  reason: string;
}
