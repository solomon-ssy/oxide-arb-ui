import type {
  BpsString,
  IsoDate,
  MarketId,
  TimeRangeQuery,
  UsdString,
} from './common';
import type { ExecutionMode } from './enums';

/** One detected-edge histogram bucket over a trade-history window. */
export interface EdgeBucket {
  /** Stable bucket label in basis-point ranges, e.g. `0-50`. */
  label: string;
  /** Number of trades whose detected edge fell in this bucket. */
  count: number;
}

/** Per-market execution performance aggregate over a trade-history window. */
export interface MarketPerformanceRow {
  market_id: MarketId;
  trade_count: number;
  success_count: number;
  /** Sum of fill-level net profit (execution basis, not settlement ledger). */
  net_profit_usd: UsdString;
  total_cost_usd: UsdString;
  /** Average detected edge in basis points; null when no trade has an edge. */
  avg_edge_bps: BpsString | null;
}

/** One day of the settlement `PnL` series (`GET /analytics/daily`). */
export interface AnalyticsDailyPoint {
  date: IsoDate;
  /** Settled realized `PnL` for this UTC calendar day. */
  daily_pnl: UsdString;
  /** Running sum of `daily_pnl` within the requested window. */
  cumulative_pnl: UsdString;
  trade_count: number;
  success_count: number;
}

/** Settlement-basis daily `PnL` series for charting. */
export interface AnalyticsDailySeries {
  points: AnalyticsDailyPoint[];
}

/** Shared analytics window query (`from`/`to` + optional execution mode). */
export interface AnalyticsQueryParams extends TimeRangeQuery {
  execution_mode?: ExecutionMode;
}
