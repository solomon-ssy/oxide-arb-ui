import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  TimeRangeQuery,
  UsdString,
  UuidString,
} from './common';
import type { AccountSource, MarketCategory } from './enums';

/** A single venue position row inside an account snapshot (pre-formatted). */
export interface VenuePositionSnapshotView {
  token_id: string;
  market_id: string;
  event_id: null | string;
  category: MarketCategory;
  outcome: string;
  size: string;
  avg_price: string;
  cur_price: string;
  current_value: string;
  redeemable: boolean;
}

/** Exposure rollups keyed by market / event / category. */
export interface ExposureBreakdown {
  per_market: Record<string, UsdString>;
  per_event: Record<string, UsdString>;
  per_category: Partial<Record<MarketCategory, UsdString>>;
}

/** `GET /quant/account/snapshots/{id}` — a persisted account snapshot. */
export interface AccountSnapshotView {
  account_snapshot_id: UuidString;
  as_of: IsoDateTime;
  source: AccountSource;
  venue_net_liquidation_usd: UsdString;
  capital_base_usd: UsdString;
  available_usd: UsdString;
  reserved_usd: UsdString;
  positions: VenuePositionSnapshotView[];
  exposures: ExposureBreakdown;
  created_at: IsoDateTime;
}

/** `GET /quant/account/live` — the freshly-fetched venue account. */
export interface LiveAccountView {
  as_of: IsoDateTime;
  source: AccountSource;
  venue_net_liquidation_usd: UsdString;
  capital_base_usd: UsdString;
  available_usd: UsdString;
  reserved_usd: UsdString;
  positions: VenuePositionSnapshotView[];
  exposures: ExposureBreakdown;
  fetched_at: IsoDateTime;
  budget_cap_usd: UsdString;
}

/** `GET /quant/account/equity-snapshots` row. */
export interface EquitySnapshotView {
  equity_snapshot_id: UuidString;
  as_of: IsoDateTime;
  source: AccountSource;
  venue_net_liquidation_usd: UsdString;
  capital_base_usd: UsdString;
  available_usd: UsdString;
  reserved_usd: UsdString;
  realized_pnl_cumulative_usd: UsdString;
  unrealized_pnl_usd: UsdString;
  high_water_mark_usd: UsdString;
  drawdown_pct: DecimalString;
  account_snapshot_ref: null | UuidString;
  created_at: IsoDateTime;
}

/** Filter + pagination for `GET /quant/account/equity-snapshots`. */
export interface EquitySnapshotQuery extends PageQuery, TimeRangeQuery {}
