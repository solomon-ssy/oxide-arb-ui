import type {
  IsoDateTime,
  PageQuery,
  PriceString,
  SharesString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type {
  ExecutionOrderPhase,
  ExecutionOrderState,
  OrderTypeKind,
  Side,
} from './enums';

/** `GET /quant/execution-orders/{id}` — a CLOB submission ledger row. */
export interface ExecutionOrderView {
  execution_order_id: UuidString;
  order_intent_id: UuidString;
  order_phase: ExecutionOrderPhase;
  market_id: string;
  token_id: string;
  side: Side;
  order_type: OrderTypeKind;
  price: PriceString;
  shares: SharesString;
  cost_usd: UsdString;
  venue_order_id: null | string;
  venue_status: null | string;
  state: ExecutionOrderState;
  submitted_at: IsoDateTime | null;
  filled_at: IsoDateTime | null;
  cancelled_at: IsoDateTime | null;
  gtd_expiration_at: IsoDateTime | null;
  error_message: null | string;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
}

/** Filter + pagination for `GET /quant/execution-orders`. */
export interface ExecutionOrderListQuery extends PageQuery, TimeRangeQuery {
  state?: ExecutionOrderState;
  order_phase?: ExecutionOrderPhase;
  order_intent_id?: UuidString;
  market_id?: string;
  token_id?: string;
}
