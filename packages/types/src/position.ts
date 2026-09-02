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
import type { EnumValue } from './generated/enum-catalog';
import type { ExitMonitorObservationView } from './generated/quant-operator-api';

/** `GET /quant/positions/{id}` — a system-lot position ledger row. */
export interface PositionView {
  position_plane: PositionPlane;
  strategy_position_lot_id: UuidString;
  origin_kind: EnumValue<'StrategyPositionOriginKind'>;
  order_intent_id: null | UuidString;
  recovery_incident_id: null | UuidString;
  /** Originating recommendation. */
  recommendation_id: null | UuidString;
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

export interface PositionDetailView {
  exit_monitor_observation?: ExitMonitorObservationView;
  position: PositionView;
}

/** Filter + pagination for `GET /quant/positions`. */
export interface PositionListQuery extends PageQuery, TimeRangeQuery {
  state?: PositionLedgerState;
  order_intent_id?: UuidString;
  market_id?: string;
  token_id?: string;
}
