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
import type { EntryConditionInstanceSummaryView } from './entry-condition';
import type {
  ApprovalStatus,
  ExitReason,
  ExitSettlementMode,
  ExitState,
  OrderIntentKind,
  OrderIntentStatus,
  QuantRuntimeMode,
  RedeemPolicy,
  Side,
} from './enums';
import type {
  OpportunisticExitPolicy,
  ScaleOutTarget,
  ThesisInvalidationPolicy,
  TrailingStopPolicy,
} from './exit-plan';

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
  opportunistic_exit: OpportunisticExitPolicy;
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
  condition_instance_id: UuidString;
  entry_condition?: EntryConditionInstanceSummaryView | null;
  entry_order: EntryOrderSpec;
  exit_policy: ExitPolicySpec;
  risk_envelope_hash: string;
  expires_at: IsoDateTime;
  exit_state: ExitState;
  exit_reason: ExitReason | null;
  next_check_at: IsoDateTime | null;
  peak_mark_price: null | PriceString;
  last_signal_recheck_at: IsoDateTime | null;
  latest_reinference: ExitReinferenceObservation | null;
  exit_monitor_observation?: ExitMonitorObservationView | null;
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

export interface ExitReinferenceObservation {
  detail: string;
  execution_eligible: boolean;
  expected_return_bps: BpsString;
  mark: PriceString;
  model_artifact_hash: string;
  model_version_id: UuidString;
  factor_snapshot_hash: string;
  observed_at: IsoDateTime;
  score: ProbabilityString;
  score_retention: DecimalString;
  shadow: boolean;
  verdict: 'holds' | 'indeterminate' | 'thesis_invalidated';
}

export interface NextScaleOutProjection {
  delta_shares: SharesString;
  target_cumulative_exit_pct: DecimalString;
  target_id: string;
  trigger_price: PriceString;
}

export interface ExitMonitorObservationView {
  book_age_ms: null | number;
  book_fresh: boolean;
  book_observed_at: IsoDateTime | null;
  cumulative_exit_pct: DecimalString | null;
  cumulative_exited_shares: SharesString;
  current_executable_bid: null | PriceString;
  effective_stop: null | PriceString;
  last_check_at: IsoDateTime | null;
  latest_reinference: ExitReinferenceObservation | null;
  next_check_at: IsoDateTime | null;
  next_scale_out: NextScaleOutProjection | null;
  peak_mark: null | PriceString;
  reason: ExitReason | null;
  state: ExitState;
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
