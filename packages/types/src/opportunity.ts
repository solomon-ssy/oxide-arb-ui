import type {
  BpsString,
  IsoDateTime,
  MarketId,
  UsdString,
  UuidString,
} from './common';

/**
 * Slim opportunity-feed projection, shared verbatim by the WS
 * `opportunity.detected` push and the `sync.recent_opportunities` section
 * (detection internals are stripped server-side).
 */
export interface OpportunityView {
  opportunity_id: UuidString;
  market_id: MarketId;
  edge_bps: BpsString;
  /** Calibration-adjusted expected net profit at detection time. */
  expected_net_profit_usd: UsdString;
  detected_at: IsoDateTime;
}
