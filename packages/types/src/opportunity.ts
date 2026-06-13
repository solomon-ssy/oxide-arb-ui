import type {
  BpsString,
  DecimalString,
  IsoDateTime,
  MarketId,
  PageQuery,
  PriceString,
  ProbabilityString,
  SharesString,
  TimeRangeQuery,
  TokenId,
  UsdString,
  UuidString,
} from './common';
import type {
  AuditOutcome,
  DurationBucket,
  MarketCategory,
  OpportunityAuditStage,
  PriceZone,
  RejectionStage,
  SettlementAccountingStatus,
  SettlementOutcome,
  SettlementTrigger,
  Side,
  StalenessLevel,
} from './enums';

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

/**
 * Detection-row projection for the paginated `recent` / `history` lists.
 * All money / probability fields are decimal strings; enums are semantic
 * wire values (never ClickHouse scaled integers or discriminants).
 */
export interface OpportunityListView {
  opportunity_id: UuidString;
  market_id: MarketId;
  event_id: string;
  token_id: TokenId;
  side: Side;
  entry_price: PriceString;
  shares: SharesString;
  edge_bps: BpsString;
  expected_net_profit_usd: UsdString;
  /** Net profit if the prediction settles correctly (gross of probability). */
  net_profit_if_correct_usd: UsdString;
  total_cost_usd: UsdString;
  total_fees_usd: UsdString;
  resolution_prob: ProbabilityString;
  confidence: ProbabilityString;
  fill_probability: null | ProbabilityString;
  /** Composite ranking score. */
  score: DecimalString | null;
  /** Share of available book depth consumed by the sizing (0–100). */
  depth_used_pct: DecimalString;
  convergence_secs: number;
  category: MarketCategory;
  price_zone: PriceZone;
  duration_bucket: DurationBucket;
  detected_at: IsoDateTime;
}

/**
 * One audit-trail stage of an opportunity (`GET /opportunities/{id}` rows).
 * Rendered as a vertical timeline entry; `scored_snapshot` is the frozen
 * scored-opportunity JSON captured at this stage, already parsed server-side.
 */
export interface OpportunityAuditView {
  opportunity_id: UuidString;
  execution_id: UuidString;
  trade_id: null | UuidString;
  market_id: MarketId;
  event_id: string;
  token_id: TokenId;
  side: Side;
  stage: OpportunityAuditStage;
  stage_order: number;
  stage_at: IsoDateTime;
  outcome: AuditOutcome | null;
  rejection_stage: null | RejectionStage;
  rejection_reason: null | string;
  entry_price: null | PriceString;
  fill_price: null | PriceString;
  requested_shares: null | SharesString;
  filled_shares: null | SharesString;
  total_cost_usd: null | UsdString;
  fees_usd: null | UsdString;
  net_profit_usd: null | UsdString;
  expected_profit_usd: null | UsdString;
  edge_bps: BpsString | null;
  resolution_prob: null | ProbabilityString;
  confidence: null | ProbabilityString;
  fill_probability: null | ProbabilityString;
  convergence_secs: null | number;
  price_zone: null | PriceZone;
  duration_bucket: DurationBucket | null;
  staleness: null | StalenessLevel;
  category: MarketCategory | null;
  payout_usd: null | UsdString;
  realized_pnl_usd: null | UsdString;
  settlement_status: null | SettlementOutcome;
  settlement_trigger: null | SettlementTrigger;
  winning_token_id: null | TokenId;
  accounting_status: null | SettlementAccountingStatus;
  scored_snapshot: null | Record<string, unknown>;
  detected_at: IsoDateTime;
}

/** One funnel stage: distinct opportunities recorded at it in the window. */
export interface OpportunityFunnelStageView {
  stage: OpportunityAuditStage;
  count: number;
  /** Share of detected opportunities (0..1); `null` without a baseline. */
  rate: DecimalString | null;
}

/** Aggregated detection→execution→settlement funnel (`GET /opportunities/stats`). */
export interface OpportunityFunnelView {
  from: IsoDateTime;
  to: IsoDateTime;
  /** Distinct opportunities detected inside the window. */
  total_detected: number;
  /** Stages in lifecycle order. */
  stages: OpportunityFunnelStageView[];
}

/** Time-window + market filter for `history` / `stats` (max span 90 days). */
export interface OpportunityWindowQuery extends PageQuery, TimeRangeQuery {
  market_id?: MarketId;
}
