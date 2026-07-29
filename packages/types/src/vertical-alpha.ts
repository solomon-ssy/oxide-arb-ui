import type {
  DecimalString,
  IsoDateTime,
  PageQuery,
  UuidString,
} from './common';

// Canonical calibration artifact types are owned by `./calibration`.
export type {
  ActivateCalibrationArtifactRequest,
  BindCalibrationRequest,
  CalibrationArtifactDetailView,
  CalibrationArtifactListQuery,
  CalibrationArtifactSummaryView,
  CategoryBiasCurveView,
  FitBiasTableRequest,
  FitModelCalibratorRequest,
  IsotonicKnotView,
  MarketPriceBiasPayload,
  ModelScoreCalibrationPayload,
  MonotoneMappingView,
  PriceBiasBinView,
  ReliabilityBinView,
  ReliabilityReportView,
} from './calibration';

// ── Structural alpha monitoring ────────────────────────────────────────────

/** One YES leg of a neg-risk event with its live best ask. */
export interface NegRiskLegView {
  market_id: string;
  yes_token_id: string;
  question: string;
  best_ask: DecimalString | null;
}

/** Per-event neg-risk leg-sum drift snapshot (`GET /quant/structural/negrisk-events`). */
export interface NegRiskEventDriftView {
  event_id: string;
  title: string;
  leg_count: number;
  ask_sum: DecimalString | null;
  drift: DecimalString | null;
  legs: NegRiskLegView[];
  computed_at: IsoDateTime;
}

export interface MissingReasonCountView {
  reason: string;
  count: number;
}

export interface TradeTapeSourceHealthView {
  source: string;
  enabled: boolean;
  token_cursor_count: number;
  bootstrap_count: number;
  catching_up_count: number;
  live_count: number;
  empty_count: number;
  error_count: number;
  worst_lag_blocks: null | number;
  last_updated_at: IsoDateTime | null;
}

export interface TradeTapeCoverageView {
  decision_at: IsoDateTime;
  knowledge_cutoff: IsoDateTime;
  window_secs: number;
  knowledge_lag_secs: number;
  active_market_count: number;
  token_cursor_count: number;
  market_cursor_count: number;
  covered_market_ratio: DecimalString;
  source_health: TradeTapeSourceHealthView[];
  missing_reason_breakdown: MissingReasonCountView[];
}

export interface ParticipantConcentrationMarketView {
  market_id: string;
  token_id: string;
  question: string;
  knowledge_cutoff: IsoDateTime;
  trade_count: null | number;
  participant_count: null | number;
  notional_usd: DecimalString | null;
  coverage_ratio: DecimalString | null;
  gini: DecimalString | null;
  hhi: DecimalString | null;
  cr1_share: DecimalString | null;
  composite_raw: DecimalString | null;
  lag_blocks: null | number;
  missing_reason: null | string;
}

export interface ParticipantConcentrationSummaryView {
  decision_at: IsoDateTime;
  knowledge_cutoff: IsoDateTime;
  window_secs: number;
  knowledge_lag_secs: number;
  min_unique_participants: number;
  min_notional_usd: DecimalString;
  min_coverage_ratio: DecimalString;
  markets: ParticipantConcentrationMarketView[];
  missing_reason_breakdown: MissingReasonCountView[];
}

export interface ParticipantConcentrationParticipantView {
  participant_address: string;
  participant_role: string;
  trade_count: number;
  notional_usd: DecimalString;
  share: DecimalString;
}

export interface ParticipantConcentrationDetailView {
  decision_at: IsoDateTime;
  knowledge_cutoff: IsoDateTime;
  market: ParticipantConcentrationMarketView;
  top_participants: ParticipantConcentrationParticipantView[];
}

// ── Crypto domain linkage and ingest ───────────────────────────────────────

/** Linkage ledger summary row (`GET /research/market-linkages`). */
export interface MarketLinkageSummaryView {
  linkage_id: UuidString;
  market_id: string;
  domain_family: string;
  status: string;
  resolver_tier: string;
  resolver_version: number;
  confidence: DecimalString;
  source_bindings: ResolvedSourceBindingView[];
  content_hash: string;
  derived_at: IsoDateTime;
  /** Populated only for `resolver_tier = 'override'` rows. */
  override_reason: null | string;
  override_actor: null | string;
  created_at: IsoDateTime;
}

/** How a crypto market's question compares the underlying price to its strike. */
export type PriceComparatorView =
  | { hi: DecimalString; kind: 'between' }
  | { kind: 'above' }
  | { kind: 'below' }
  | { kind: 'up_vs_reference' };

/** The settlement oracle a crypto market resolves against. */
export type ResolutionOracleView =
  | { feed: string; kind: 'chainlink_data_streams' }
  | { interval: string; kind: 'binance_kline'; symbol: string };

/** The extracted subject of a crypto market (mirrors Rust `CryptoSubject`). */
export interface CryptoSubjectView {
  asset: string;
  comparator: PriceComparatorView;
  observation_at: IsoDateTime;
  quote: string;
  reference_at: IsoDateTime | null;
  resolution_oracle: ResolutionOracleView;
  strike: DecimalString | null;
}

export interface TemperatureBandView {
  lower_inclusive: DecimalString | null;
  upper_inclusive: DecimalString | null;
}

/** Frozen airport/local-day maximum-temperature market subject. */
export interface WeatherSubjectView {
  local_date: string;
  market_unit: 'celsius' | 'fahrenheit';
  outcome_band: TemperatureBandView;
  proxy_methodology_hash: string;
  settlement_rule_url: string;
  station: string;
  station_profile_hash: string;
  timezone: string;
}

/** A market's extracted external subject (one variant per domain family). */
export type MarketSubjectView =
  | (CryptoSubjectView & { family: 'crypto' })
  | (WeatherSubjectView & { family: 'weather' });

export type LinkageSourceRole =
  | 'feature'
  | 'forecast'
  | 'historical_calibration'
  | 'live_event'
  | 'resolution';

/** Exact role/source/instrument frozen into one linkage revision. */
export interface ResolvedSourceBindingView {
  available_at: IsoDateTime;
  binding_hash: string;
  instrument_key: string;
  role: LinkageSourceRole;
  source_id: string;
}

/** Operator-proposed source identity; server owns availability and hashes. */
export type OverrideSourceBindingInput = Pick<
  ResolvedSourceBindingView,
  'instrument_key' | 'role' | 'source_id'
>;

/** Which metadata field a grounding span was located in. */
export type GroundingFieldSource =
  | 'description'
  | 'question'
  | 'series_slug'
  | 'slug';

/** Whether a grounding span is independently-literal evidence,
 * template-entailed, or an operator-cited manual-override citation (mirrors
 * Rust `GroundingKind`; `manual_evidence` added by 11.2.2 remediation R4). */
export type GroundingSpanKind =
  | 'literal_span'
  | 'manual_evidence'
  | 'template_entailed';

/** One extracted subject field tied to its literal source-text span. */
export interface GroundingSpanView {
  end: number;
  kind: GroundingSpanKind;
  source: GroundingFieldSource;
  start: number;
  subject_field: string;
  text: string;
}

/** The full field → source-span mapping for one accepted subject. */
export interface GroundingProofView {
  spans: GroundingSpanView[];
}

/** The audited human justification for an operator override — present only
 * on a `resolver_tier = override` binding. */
export interface OverrideContextView {
  actor: string;
  reason: string;
}

/** A validated subject binding (mirrors Rust `ResolvedBinding`). */
export interface ResolvedBindingView {
  grounding: GroundingProofView;
  override_context: null | OverrideContextView;
  source_bindings: ResolvedSourceBindingView[];
  subject: MarketSubjectView;
}

/** The resolver's outcome for one linkage record (mirrors Rust `LinkageOutcome`). */
export type LinkageValidationFailureView =
  | {
      actual: string;
      asset: string;
      code: 'chainlink_feed_ruleset_mismatch';
      expected: string;
    }
  | {
      actual: string;
      code: 'instrument_ruleset_mismatch' | 'weather_instrument_mismatch';
      expected: string;
    }
  | {
      actual_market: string;
      actual_symbol: string;
      asset: string;
      code: 'binance_oracle_ruleset_mismatch';
      expected_market: string;
      expected_symbol: string;
    }
  | { asset: string; code: 'asset_not_in_ruleset' }
  | { code: 'fractional_weather_outcome_band' }
  | {
      code: 'grounding_source_absent';
      source: string;
      subject_field: string;
    }
  | {
      code: 'grounding_span_out_of_bounds';
      end: number;
      source_length: number;
      start: number;
      subject_field: string;
    }
  | { code: 'grounding_text_mismatch'; subject_field: string }
  | { code: 'invalid_weather_decision_group_id' }
  | { code: 'invalid_weather_outcome_band' }
  | { code: 'invalid_weather_timezone'; timezone: string }
  | { code: 'missing_grounding'; subject_field: string }
  | { code: 'missing_literal_grounding'; subject_field: string }
  | { code: 'unsupported_subject' };

export type LinkageUnresolvedReasonView =
  | {
      code: 'candidate_rejected';
      failure: LinkageValidationFailureView;
      tier: string;
    }
  | { code: 'no_deterministic_template' };

export type LinkageOutcomeView =
  | (ResolvedBindingView & { status: 'resolved' })
  | { reason: LinkageUnresolvedReasonView; status: 'unresolved' };

/** Full linkage detail (`GET /research/market-linkages/{market_id}`). */
export interface MarketLinkageDetailView {
  linkage_id: UuidString;
  market_id: string;
  domain_family: string;
  status: string;
  resolver_tier: string;
  resolver_version: number;
  confidence: DecimalString;
  outcome: LinkageOutcomeView;
  source_bindings: ResolvedSourceBindingView[];
  metadata_hash: string;
  content_hash: string;
  derived_at: IsoDateTime;
  override_reason: null | string;
  override_actor: null | string;
  created_at: IsoDateTime;
}

/** One historical ledger row for a market's linkage audit trail
 * (`GET /research/market-linkages/{market_id}/history`), oldest first. */
export interface MarketLinkageHistoryEntryView {
  linkage_id: UuidString;
  status: string;
  resolver_tier: string;
  resolver_version: number;
  confidence: DecimalString;
  outcome: LinkageOutcomeView;
  source_bindings: ResolvedSourceBindingView[];
  content_hash: string;
  derived_at: IsoDateTime;
  override_reason: null | string;
  override_actor: null | string;
  created_at: IsoDateTime;
}

/** Filter + pagination for `GET /research/market-linkages`. */
export type MarketLinkageListQuery = PageQuery & {
  family?: string;
  from?: IsoDateTime;
  latest_only?: boolean;
  market_id?: string;
  status?: string;
  to?: IsoDateTime;
};

/** `POST /research/market-linkages/resolve` governed request body. */
export interface ResolveLinkagesRequest {
  market_ids?: string[];
  reason: string;
}

/** Summary returned by an offline resolver pass. */
export interface LinkageResolveSummaryView {
  examined: number;
  appended: number;
  unchanged: number;
  resolved: number;
  unresolved: number;
}

/** One operator-cited literal-text justification for a manual override
 * (mirrors Rust `ManualEvidenceInput`; 11.2.2 remediation R4). Verified
 * byte-exact against the market's real metadata server-side — never
 * trusted as submitted. */
export interface ManualEvidenceInput {
  subject_field: string;
  source: GroundingFieldSource;
  text: string;
}

/** `POST /research/market-linkages/{market_id}/override` governed request body. */
export interface OverrideLinkageRequest {
  evidence: ManualEvidenceInput[];
  reason: string;
  source_bindings: OverrideSourceBindingInput[];
  subject: Record<string, unknown>;
}

export type DomainSourceExpectationStatus =
  | 'credential_blocked'
  | 'error'
  | 'live'
  | 'not_started'
  | 'stale'
  | 'unsupported';

export type DomainCursorStatus = 'backfilling' | 'bootstrap' | 'error' | 'live';

/** Expected binding plus nullable observed cursor (`GET /research/domain-sources`). */
export interface DomainSourceExpectationView {
  expectation_id: string;
  family: 'crypto' | 'weather';
  source_id: string;
  instrument_key: string;
  capability_registry_hash: string;
  binding_hash: string;
  required: boolean;
  credential_required: boolean;
  freshness_secs: number;
  affected_market_ids: string[];
  affected_profile_ids: string[];
  status: DomainSourceExpectationStatus;
  status_reason: null | string;
  cursor_status: DomainCursorStatus | null;
  checkpoint: null | (Record<string, unknown> & { kind: string });
  checkpoint_hash: null | string;
  last_event_time: IsoDateTime | null;
  freshness_observed_at: IsoDateTime | null;
  /** `null` means no observed cursor and must never be rendered as zero. */
  lag_secs: null | number;
  cursor_updated_at: IsoDateTime | null;
  observed_at: IsoDateTime;
}

// ── Basis cross-check alerts (11.2.2 remediation R6) ────────────────────────

/** Filter + pagination for `GET /research/basis-alerts`. */
export type BasisAlertListQuery = PageQuery & {
  from?: IsoDateTime;
  market_id?: string;
  /** When true, return only unacknowledged alerts (the review-queue default view). */
  open_only?: boolean;
  to?: IsoDateTime;
};

/** One feature-source-vs-settlement-oracle basis exceedance row. */
export interface BasisAlertView {
  alert_id: UuidString;
  market_id: string;
  instrument_key: string;
  oracle_instrument_key: string;
  basis_bps: DecimalString;
  threshold_bps: DecimalString;
  as_of: IsoDateTime;
  acknowledged: boolean;
  acknowledged_at: IsoDateTime | null;
  acknowledged_by: null | string;
  created_at: IsoDateTime;
}

/** `POST /research/basis-alerts/{alert_id}/acknowledge` governed request body. */
export interface AcknowledgeBasisAlertRequest {
  reason: string;
}
