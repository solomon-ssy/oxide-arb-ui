import type { IsoDate, IsoDateTime, UsdString } from './common';

/** Live in-memory PnL snapshot (`GET /pnl/live`, `sync.pnl`). */
export interface LivePnlView {
  daily_pnl: UsdString;
  daily_loss_usd: UsdString;
  total_realized_pnl: UsdString;
  total_exposure: UsdString;
}

/** WS `pnl.update` payload: current-day and lifetime realized PnL. */
export interface PnlUpdateEvent {
  daily: UsdString;
  total: UsdString;
}

/** One day of the PnL history series (`GET /pnl/daily-series`). */
export interface DailyPnlSeriesPoint {
  date: IsoDate;
  /** Cumulative realized PnL within the requested window (running sum). */
  total_pnl: UsdString;
  /** Realized PnL settled on this day. */
  daily_pnl: UsdString;
}

/** Daily PnL history, ascending by date; empty window → `points: []`. */
export interface DailyPnlSeries {
  points: DailyPnlSeriesPoint[];
}

/** Per-period settled-position accounting stats. */
export interface SettledPnlStats {
  realized_pnl: UsdString;
  total_payout: UsdString;
  total_cost: UsdString;
  total_fees: UsdString;
  settled_position_count: number;
  winning_position_count: number;
  losing_position_count: number;
  unsettled_position_count: number;
  failed_accounting_count: number;
  largest_single_profit: UsdString;
  largest_single_loss: UsdString;
}

/** Per-period execution (fill) stats. */
export interface ReportTradeStats {
  trade_count: number;
  success_count: number;
  miss_count: number;
  failed_count: number;
  total_fill_cost: UsdString;
  total_fill_fees: UsdString;
  fill_expected_pnl: UsdString;
}

/** Risk-engine summary captured at report generation time. */
export interface ReportRiskSummary {
  daily_pnl: UsdString;
  daily_loss: UsdString;
  weekly_loss: UsdString;
  total_exposure: UsdString;
  open_position_count: number;
}

/** Report payload schema discriminator (Rust `ReportSchemaVersion`). */
export type ReportSchemaVersion = 'v1';

/** Persisted daily settlement report (`GET /analytics/daily`). */
export interface DailyReport {
  date: IsoDate;
  schema_version: ReportSchemaVersion;
  generated_at: IsoDateTime;
  period_start: IsoDate;
  period_end: IsoDate;
  settled_pnl: SettledPnlStats;
  execution: ReportTradeStats;
  risk: ReportRiskSummary;
  total_pnl: UsdString;
  total_fees_paid: UsdString;
  total_gas_paid: UsdString;
  trade_count: number;
  success_count: number;
  miss_count: number;
  largest_single_loss: UsdString;
  largest_single_profit: UsdString;
}

/** Persisted weekly settlement report (`GET /pnl/weekly`). */
export interface WeeklyReport {
  week_start: IsoDate;
  week_end: IsoDate;
  schema_version: ReportSchemaVersion;
  generated_at: IsoDateTime;
  settled_pnl: SettledPnlStats;
  execution: ReportTradeStats;
  risk: ReportRiskSummary;
  daily_reports: DailyReport[];
}
