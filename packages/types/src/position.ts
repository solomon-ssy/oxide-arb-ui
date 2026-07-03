import type {
  IsoDateTime,
  PageQuery,
  PriceString,
  SharesString,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type { PositionLedgerState, PositionPlane } from './enums';

/** `GET /quant/positions/{id}` — a system-lot position ledger row. */
export interface PositionView {
  position_plane: PositionPlane;
  position_id: UuidString;
  order_intent_id: UuidString;
  /** Originating recommendation (attribution deep-link target). */
  recommendation_id: UuidString;
  token_id: string;
  market_id: string;
  state: PositionLedgerState;
  shares: SharesString;
  avg_price: PriceString;
  cost_usd: UsdString;
  realized_pnl_usd: UsdString;
  opened_at: IsoDateTime;
  updated_at: IsoDateTime;
  closed_at: IsoDateTime | null;
}

/** Filter + pagination for `GET /quant/positions`. */
export interface PositionListQuery extends PageQuery, TimeRangeQuery {
  state?: PositionLedgerState;
  order_intent_id?: UuidString;
  market_id?: string;
  token_id?: string;
}
