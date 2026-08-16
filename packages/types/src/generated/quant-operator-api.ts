/**
 * This file is generated from the Rust operator API DTO contract.
 * Run `pnpm generate:quant-operator-api`; do not edit it by hand.
 */

/**
 * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
 */
export type Usd = string;
/**
 * Polymarket event category for business selection and model cohorts.
 */
export type MarketCategory =
  | 'crypto'
  | 'culture'
  | 'economics'
  | 'finance'
  | 'geopolitics'
  | 'other'
  | 'politics'
  | 'sports'
  | 'tech'
  | 'weather';
/**
 * Capital-base provenance for a report's sizing.
 *
 * Single real source (the Polymarket venue account). The enum is retained
 * for evidence labelling and forward extension; there is **no** simulated or
 * configured-budget source — credentials are required and the report fails
 * closed without them.
 */
export type AccountSource = 'historical_replay' | 'polymarket';
/**
 * Human or policy approval state attached to an order intent.
 */
export type ApprovalStatus =
  | 'approved'
  | 'expired'
  | 'not_required'
  | 'pending'
  | 'rejected';
/**
 * Durable state of a recommendation-level entry condition instance.
 */
export type EntryConditionState =
  | 'confirming'
  | 'consumed'
  | 'expired'
  | 'invalidated'
  | 'not_required'
  | 'qualified'
  | 'unavailable'
  | 'waiting';
/**
 * Three-state leaf/composite truth. Missing input never becomes false.
 */
export type ConditionTruth =
  | {
      kind: 'satisfied';
    }
  | {
      kind: 'unavailable';
      reason: ConditionUnavailableReason;
    }
  | {
      kind: 'unsatisfied';
    };
/**
 * Typed fail-closed reason attached to an unavailable evaluation.
 */
export type ConditionUnavailableReason =
  | {
      generation: number;
      kind: 'source_gap';
      source_id: string;
    }
  | {
      kind: 'artifact_hash_mismatch';
    }
  | {
      kind: 'binding_drift';
    }
  | {
      kind: 'catalog_snapshot_mismatch';
    }
  | {
      kind: 'clock_skew';
    }
  | {
      kind: 'factor_definition_mismatch';
    }
  | {
      kind: 'input_missing';
    }
  | {
      kind: 'input_stale';
    }
  | {
      kind: 'market_linkage_mismatch';
    }
  | {
      kind: 'source_not_configured';
      source_id: string;
    }
  | {
      kind: 'source_unhealthy';
      source_id: string;
    };
/**
 * Number of shares (condition tokens).
 */
export type Shares = string;
/**
 * Price per share in a prediction market. Range \[0, 1\].
 */
export type Price = string;
/**
 * Basis points (1 bps = 0.01%).
 */
export type Bps = string;
/**
 * Statistical probability, confidence, or model weight stored losslessly.
 */
export type Probability = string;
/**
 * Persisted classification of the latest governed thesis re-inference.
 */
export type ExitReinferenceVerdictKind =
  | 'holds'
  | 'indeterminate'
  | 'thesis_invalidated';
/**
 * Why a position lot exited (persisted on `quant_order_intent.exit_reason`).
 */
export type ExitReason =
  | (
      | 'data_stale'
      | 'kill_switch_emergency'
      | 'manual'
      | 'market_abnormal'
      | 'partial_exit'
      | 'resolution_redeem'
      | 'risk_envelope_breached'
      | 'settlement_hold'
      | 'signal_invalidated'
      | 'stop_loss'
      | 'take_profit'
      | 'time_exit'
    )
  | 'opportunistic';
export type ExitState =
  | 'exited'
  | 'failed'
  | 'manual_required'
  | 'monitoring'
  | 'not_started'
  | 'order_submitted'
  | 'partially_exited'
  | 'triggered';
export type OrderIntentKind = 'buy';
/**
 * Governed runtime mode for report generation and optional execution.
 */
export type QuantRuntimeMode = 'auto_execution' | 'report_only' | 'semi_auto';
/**
 * Governed execution-intent lifecycle state.
 */
export type OrderIntentStatus =
  | 'admission_pending'
  | 'admission_rejected'
  | 'approved'
  | 'approved_by_policy'
  | 'cancelled'
  | 'draft'
  | 'expired'
  | 'failed'
  | 'filled'
  | 'invalidated'
  | 'partially_filled'
  | 'pending_approval'
  | 'rejected'
  | 'submitted';
export type VenueIncentiveKind = 'maker_rebate' | 'taker_rebate';
/**
 * Append-only incentive lifecycle event. Stages are facts, not mutable
 * status values on a single row.
 */
export type VenueIncentiveStage =
  | 'estimated_accrual'
  | 'venue_awarded'
  | 'wallet_credited';
export type IncentiveReconciliationHealth =
  | 'healthy'
  | 'incomplete'
  | 'stale'
  | 'unavailable';
/**
 * Time-weighted capital occupancy in USD-hours.
 */
export type UsdHours = string;
/**
 * Route-specific entry contract offered to the optimizer.
 */
export type EntryExecutionEconomics =
  | {
      decision_at: string;
      expected_filled_shares: Shares;
      expected_maker_rebate_usd: Usd;
      fill_distribution: PassiveFillDistribution;
      full_fill_cost: ImmediateExecutionCost;
      full_fill_maker_rebate?: DeferredVenueIncentive | null;
      good_til_secs: number;
      hard_reserved_cash_usd: Usd;
      kind: 'passive';
      limit_price: Price;
      /**
       * Gamma terms frozen at the decision boundary. `None` means rebate was
       * unavailable and the route was valued with a strict zero incentive.
       */
      maker_rebate_schedule?: FrozenMakerRebateSchedule | null;
      requested_shares: Shares;
      visible_liquidity_usd: Usd;
    }
  | {
      entry_vwap: Price;
      filled_shares: Shares;
      immediate_cost: ImmediateExecutionCost;
      kind: 'aggressive';
      limit_price: Price;
      requested_shares: Shares;
      slippage_usd: Usd;
      visible_liquidity_usd: Usd;
    };
/**
 * Mutually exclusive passive-entry state estimated from cross-fitted OOS replay.
 */
export type PassiveFillStateKind = 'full_fill' | 'no_fill' | 'partial_fill';
/**
 * Eligibility state frozen into a maker-rebate accrual estimate.
 */
export type MakerRebateEligibility = 'eligible_maker_fill';
/**
 * Which binary-market outcome token a recommendation opens a position in.
 *
 * A recommendation is always an *opening* position (buy-to-open) in one
 * outcome token, so the only directional choice it expresses is the outcome
 * (`Yes`/`No`) — the token itself is identified by `token_id`. Buy/sell
 * direction is an execution-layer concern (see [`crate::enums::common::Side`]),
 * and the sell/exit plan is expressed entirely by `ExitPlan`; this enum never
 * encodes a sell.
 */
export type OutcomeSide = 'no' | 'yes';
/**
 * Exact Buy-side route represented by one report and one durable model run.
 *
 * `Pooled` may contain only non-vertical market categories. `Crypto` and
 * `Weather` are isolated category routes because their `ResearchProfile`,
 * domain-source, factor-plane, and serving-contract preimages are distinct.
 */
export type BuyModelRoute = 'crypto' | 'pooled' | 'weather';
/**
 * Entry state selected jointly with one promoted market-outcome scenario.
 */
export type ScenarioEntryExecution =
  | {
      fill_latency_ms: number;
      kind: 'passive_full_fill';
      post_fill_markout_bps: Bps;
    }
  | {
      fill_latency_ms: number;
      kind: 'passive_partial_fill';
      post_fill_markout_bps: Bps;
    }
  | {
      good_til_secs: number;
      kind: 'passive_no_fill';
    }
  | {
      kind: 'aggressive_fill';
    };
/**
 * Why a recommendation is ineligible for execution in a given mode.
 */
export type IneligibilityReason =
  | 'automation_cap_exceeded'
  | 'report_only_mode';
/**
 * Why a factor produced **no** normalized score (never a silent neutral).
 */
export type FactorIndeterminateReason =
  | 'cross_section_too_small'
  | 'leg_book_missing'
  | 'no_frozen_reference'
  | 'zero_variance';
/**
 * How a factor's normalized score was derived (audit + analytics).
 */
export type NormalizationSource =
  | 'cross_section'
  | 'frozen_reference_quantile'
  | 'per_market';
/**
 * JSONB column wrapper for a recommendation's full factor breakdown.
 */
export type RecommendationFactorBreakdown = FactorBreakdownEntry[];
export type MarketStatus =
  | 'active'
  | 'delisted'
  | 'discovered'
  | 'filtered'
  | 'manually_blocked'
  | 'paused'
  | 'settled';
export type TickSize = '0.1' | '0.0001' | '0.001' | '0.0025' | '0.005' | '0.01';
/**
 * Lifecycle state for a single recommendation.
 */
export type RecommendationStatus =
  | 'executed'
  | 'expired'
  | 'intent_created'
  | 'obsolete'
  | 'prepared'
  | 'published'
  | 'revoked'
  | 'superseded';
/**
 * Venue fill semantics required by an aggressive entry.
 */
export type FillRequirement = 'all_or_nothing' | 'allow_partial';
/**
 * Exit authority carried by a recommendation.
 */
export type RecommendationExitPlan =
  | {
      guidance: BootstrapExitGuidance;
      kind: 'bootstrap_advisory';
    }
  | {
      kind: 'executable';
      plan: ExitPlan;
    };
/**
 * Exact decision-policy lineage behind one published recommendation.
 *
 * Bootstrap recommendations bind their immutable L2-free profile instead of
 * pretending that a historical execution-policy fit exists.
 */
export type RecommendationPolicyProvenance =
  | {
      artifact_hash: string;
      artifact_id: string;
      cohort_index: number;
      cohort_key: TradePolicyCohortKey;
      kind: 'trade_policy';
    }
  | {
      feature_contract: ResearchFeatureContract;
      kind: 'bootstrap_profile';
      profile_ref: ResearchProfileRef;
      recommendation_contract_hash: string;
    };
/**
 * Entry execution route fitted and published independently within a cohort.
 */
export type TradePolicyEntryRoute = 'aggressive' | 'passive_post_only';
/**
 * Closed feature contracts prevent a profile from silently changing its
 * historical information regime when a source is unavailable.
 */
export type ResearchFeatureContract =
  | 'full_l2'
  | 'full_l2_crypto'
  | 'full_l2_weather'
  | 'trade_bootstrap'
  | 'trade_bootstrap_crypto'
  | 'trade_bootstrap_weather';
/**
 * Delivery lifecycle for the two-table report fact bundle.
 */
export type ReportFactDeliveryStatus =
  | 'cancelled'
  | 'delivering'
  | 'failed'
  | 'pending'
  | 'retrying'
  | 'verified';
/**
 * Durable terminal portfolio decision. Zero candidates is explicit evidence;
 * solver failure never produces this value.
 */
export type PortfolioDecisionResult =
  | {
      evidence_hash: string;
      outcome: 'zero_candidates';
      rejected_tier_count: number;
    }
  | {
      outcome: 'optimized';
      plan: GlobalPortfolioPlan;
    };
/**
 * Recommendation report category.
 */
export type ReportKind = 'post_run_audit' | 'shadow_top_n' | 'top_n';
/**
 * Durable lifecycle of one report build attempt.
 */
export type ReportRunStatus =
  | 'abandoned'
  | 'failed'
  | 'queued'
  | 'running'
  | 'skipped'
  | 'succeeded';
/**
 * Typed terminal reason for skipped, failed, or abandoned report runs.
 */
export type ReportRunTerminalReason =
  | 'build_failed'
  | 'coalesced_by_newer_occurrence'
  | 'lease_expired'
  | 'queue_expired'
  | 'schedule_reconfigured';
/**
 * Stable report-generation trigger source.
 */
export type ReportTriggerKind = 'ad_hoc' | 'scheduled';
/**
 * Publication lifecycle of an immutable recommendation report artifact.
 */
export type RecommendationReportStatus =
  | 'expired'
  | 'obsolete'
  | 'prepared'
  | 'published'
  | 'revoked'
  | 'superseded';
/**
 * Why a report could not publish any recommendation (empty report).
 *
 * Every variant has an independent producer in the report builder — there
 * are no wire-only placeholders (zero dead semantics).
 */
export type EmptyReportReason =
  | 'available_cash_exhausted'
  | 'empty_selection'
  | 'insufficient_data_quality'
  | 'no_positive_signal'
  | 'portfolio_budget_exhausted';
/**
 * Stable field vocabulary used to group diff details without raw JSON.
 */
export type RecommendationChangedFieldView =
  | 'capital_occupancy_usd_hours'
  | 'cvar_contribution_usd'
  | 'eligibility'
  | 'entry'
  | 'exit'
  | 'factor_breakdown'
  | 'marginal_portfolio_value_usd'
  | 'maximum_loss_usd'
  | 'nominal_expected_net_usd'
  | 'profit_probability'
  | 'rank'
  | 'robust_expected_net_usd'
  | 'sizing'
  | 'validity';

/**
 * Schema-only envelope used to generate frontend wire types and boundary validators.
 *
 * HTTP handlers never serialize this envelope. Every field points at the real
 * request or response DTO used by the handler so the SPA cannot maintain a
 * parallel operator contract.
 */
export interface QuantOperatorApiContractSchema {
  account_snapshot_response: AccountSnapshotView;
  create_intent_request: CreateIntentRequest;
  equity_snapshot_response: EquitySnapshotView;
  execution_confirmation_response: OrderIntentView;
  incentive_event_response: VenueIncentiveEventView;
  incentive_reconciliation_response: IncentiveReconciliationView;
  live_account_response: LiveAccountView;
  recommendation_response: QuantRecommendationView;
  report_detail_response: QuantReportDetailView;
  report_diff_response: ReportDiffView;
  report_list_row_response: QuantReportView;
}
/**
 * Persisted decision-time venue account snapshot (immutable audit evidence).
 */
export interface AccountSnapshotView {
  account_snapshot_id: string;
  as_of: string;
  available_usd: Usd;
  capital_base_usd: Usd;
  created_at: string;
  exposures: ExposureBreakdown;
  positions: VenuePositionSnapshotView[];
  reserved_usd: Usd;
  source: AccountSource;
  venue_net_liquidation_usd: Usd;
}
/**
 * Net USD exposure aggregated by market, event, and category.
 *
 * The planner uses this as the starting point for `exposure_after` projections
 * and cap-room checks. Built from [`PositionSnapshot`]s via
 * [`ExposureBreakdown::from_positions`].
 */
export interface ExposureBreakdown {
  /**
   * Net USD exposure per category.
   */
  per_category: {
    crypto?: Usd;
    culture?: Usd;
    economics?: Usd;
    finance?: Usd;
    geopolitics?: Usd;
    other?: Usd;
    politics?: Usd;
    sports?: Usd;
    tech?: Usd;
    weather?: Usd;
  };
  /**
   * Net USD exposure per event.
   */
  per_event: {
    [k: string]: Usd;
  };
  /**
   * Net USD exposure per market.
   */
  per_market: {
    [k: string]: Usd;
  };
}
/**
 * Outbound projection of one venue-held outcome position at decision time.
 */
export interface VenuePositionSnapshotView {
  avg_price: string;
  category: MarketCategory;
  cur_price: string;
  current_value: string;
  event_id?: null | string;
  market_id: string;
  outcome: string;
  redeemable: boolean;
  size: string;
  token_id: string;
}
/**
 * Inbound body for `POST /quant/intents` (create from a recommendation).
 */
export interface CreateIntentRequest {
  reason: string;
  recommendation_id: string;
}
/**
 * Persisted strategy-capital equity curve snapshot.
 */
export interface EquitySnapshotView {
  account_snapshot_ref?: null | string;
  as_of: string;
  available_usd: Usd;
  capital_base_usd: Usd;
  created_at: string;
  drawdown_pct: string;
  equity_snapshot_id: string;
  high_water_mark_usd: Usd;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  incentive_credit_cumulative_usd: string;
  realized_pnl_cumulative_usd: Usd;
  reserved_usd: Usd;
  source: AccountSource;
  unrealized_pnl_usd: Usd;
  venue_net_liquidation_usd: Usd;
}
/**
 * Outbound projection of a governed order intent (full operator transparency).
 */
export interface OrderIntentView {
  admission_trace_ref?: null | string;
  approval_reason?: null | string;
  approval_status: ApprovalStatus;
  approved_at?: null | string;
  approved_by?: null | string;
  condition_instance_id: string;
  created_at: string;
  decision_policy_snapshot_id: string;
  entry_condition?: EntryConditionInstanceSummaryView | null;
  entry_order: EntryOrderSpec;
  /**
   * Read-time projection for a filled lot; absent before the entry fills.
   */
  exit_monitor_observation?: ExitMonitorObservationView | null;
  exit_policy: ExitPolicySpec;
  exit_reason?: ExitReason | null;
  exit_state: ExitState;
  expires_at: string;
  intent_kind: OrderIntentKind;
  last_signal_recheck_at?: null | string;
  latest_reinference?: ExitReinferenceObservation | null;
  model_version_id: string;
  next_check_at?: null | string;
  order_intent_id: string;
  peak_mark_price?: null | Price;
  policy_hash?: null | string;
  policy_id?: null | string;
  recommendation_id: string;
  risk_envelope_hash: string;
  runtime_mode: QuantRuntimeMode;
  scale_out_state: ScaleOutState;
  status: OrderIntentStatus;
  status_reason?: null | string;
  updated_at: string;
}
/**
 * Shared summary embedded by recommendation and intent detail views.
 */
export interface EntryConditionInstanceSummaryView {
  artifact_hash?: null | string;
  artifact_id?: null | string;
  claim_admission_state_version?: null | string;
  claimed_by_intent_id?: null | string;
  condition_instance_id: string;
  confirmation_started_at?: null | string;
  consumed_at?: null | string;
  continuity_hash?: null | string;
  evaluation_hash?: null | string;
  expires_at: string;
  input_fingerprint?: null | string;
  last_evaluated_at?: null | string;
  lease_epoch: number;
  next_evaluation_at?: null | string;
  revision: number;
  state: EntryConditionState;
  truth?: ConditionTruth | null;
}
/**
 * The concrete entry order an approved intent will submit to the venue.
 *
 * `side` is always [`Side::Buy`] for an opening recommendation (the outcome is
 * chosen by `token_id`); the type stays general so a future closing intent can
 * reuse it.
 */
export interface EntryOrderSpec {
  /**
   * Venue amount with side/order-type semantics frozen at intent creation.
   */
  amount:
    | {
        unit: 'cash_budget';
        value: Usd;
      }
    | {
        unit: 'shares';
        value: Shares;
      };
  /**
   * Hard limit price for the order.
   */
  limit_price: string;
  /**
   * Frozen independently sourced maker-rebate terms. Only a passive,
   * post-only entry may carry this evidence.
   */
  maker_rebate_schedule?: FrozenMakerRebateSchedule | null;
  /**
   * Maximum tolerated slippage from the reference price.
   */
  max_slippage_bps: string;
  /**
   * Time-in-force / order type.
   */
  order_type:
    | 'fak'
    | 'fok'
    | 'gtc'
    | {
        gtd: {
          expiration: number;
        };
      };
  /**
   * Whether venue admission must reject immediately marketable placement.
   */
  post_only: boolean;
  /**
   * Order direction (opening = `Buy`).
   */
  side: 'BUY' | 'SELL';
  /**
   * Outcome token to trade.
   */
  token_id: string;
  /**
   * Latest time the order may be submitted.
   */
  valid_until: string;
}
/**
 * Decision-time maker-rebate terms carried into the executable order.
 *
 * This projection deliberately retains the independent Gamma identities and
 * curve terms needed to account for a later authenticated maker fill. It is
 * never reconstructed from a process-current catalog after the decision.
 */
export interface FrozenMakerRebateSchedule {
  available_at: string;
  catalog_change_hash: string;
  effective_at: string;
  exponent: string;
  fees_enabled: boolean;
  platform_rate: string;
  rebate_rate: string;
  schedule_hash: string;
  taker_only: boolean;
}
/**
 * Authoritative read-time projection of one lot's governed exit monitor.
 */
export interface ExitMonitorObservationView {
  book_age_ms?: null | number;
  book_fresh: boolean;
  book_observed_at?: null | string;
  cumulative_exit_pct?: null | string;
  cumulative_exited_shares: Shares;
  current_executable_bid?: null | Price;
  effective_stop?: null | Price;
  last_check_at?: null | string;
  latest_reinference?: ExitReinferenceObservation | null;
  next_check_at?: null | string;
  next_scale_out?: NextScaleOutProjection | null;
  peak_mark?: null | Price;
  reason?: ExitReason | null;
  state: ExitState;
}
/**
 * Latest re-inference evidence persisted on the intent at the governed cadence.
 */
export interface ExitReinferenceObservation {
  detail: string;
  expected_return_bps: Bps;
  factor_snapshot_hash: string;
  mark: Price;
  model_artifact_hash: string;
  model_version_id: string;
  observed_at: string;
  route_gate_eligible: boolean;
  score: Probability;
  score_retention: string;
  shadow: boolean;
  verdict: ExitReinferenceVerdictKind;
}
/**
 * Exact next cumulative scale-out projection shared by monitor and read APIs.
 */
export interface NextScaleOutProjection {
  delta_shares: Shares;
  target_cumulative_exit_pct: string;
  target_id: string;
  trigger_price: Price;
}
/**
 * The exit policy an approved intent freezes after the entry fills.
 *
 * A **faithful, complete** projection of the recommendation's `ExitPlan` — the
 * exit monitor evaluates every trigger deterministically from this frozen
 * contract and never re-reads the (possibly expired/revoked) recommendation
 * for the price/time/trailing/partial ladder. `entry_reference_price` and
 * `entry_composite_score` are the frozen entry-thesis baselines used for
 * percentage-based stops/targets and signal-degradation re-inference.
 */
export interface ExitPolicySpec {
  /**
   * Statistical probability, confidence, or model weight stored losslessly.
   */
  entry_composite_score: string;
  /**
   * Price per share in a prediction market. Range \[0, 1\].
   */
  entry_reference_price: string;
  /**
   * Optional manual-review checkpoint time.
   */
  manual_review_at?: null | string;
  /**
   * Maximum holding period in seconds (relative to the lot's open time).
   */
  max_hold_secs?: null | number;
  opportunistic_exit: OpportunisticExitPolicy;
  /**
   * Whether a resolved hold-to-resolution lot is redeemed automatically.
   */
  redeem_policy: 'auto' | 'manual';
  /**
   * Monotone cumulative scale-out targets.
   */
  scale_out_targets: ScaleOutTarget[];
  /**
   * Whether the lot exits before resolution or holds through resolution.
   */
  settlement_mode: 'exit_before_resolution' | 'hold_to_resolution';
  /**
   * Stop-loss as a percentage move from the entry reference price.
   */
  stop_loss_pct?: null | string;
  /**
   * Stop-loss price target.
   */
  stop_loss_price?: null | Price;
  /**
   * Take-profit as a percentage move from the entry reference price.
   */
  take_profit_pct?: null | string;
  /**
   * Take-profit price target.
   */
  take_profit_price?: null | Price;
  thesis_invalidation: ThesisInvalidationPolicy;
  /**
   * Absolute time-based exit.
   */
  time_exit_at?: null | string;
  /**
   * Optional trailing-stop policy (folded into the effective stop-loss).
   */
  trailing_stop?: null | TrailingStopPolicy;
}
/**
 * Policy-fitted advisory exit thresholds.
 */
export interface OpportunisticExitPolicy {
  max_cumulative_exit_pct: string;
  min_confidence: Probability;
  min_expected_alpha_bps: Bps;
  min_incremental_exit_pct: string;
  min_p_exit_better: Probability;
}
/**
 * One deterministic cumulative scale-out target.
 */
export interface ScaleOutTarget {
  /**
   * Minimum acceptable sell price.
   */
  min_price?: null | Price;
  /**
   * Human explanation for this target.
   */
  reason: string;
  /**
   * Target fraction exited relative to frozen entry-filled shares.
   */
  target_cumulative_exit_pct: string;
  /**
   * Stable target identifier.
   */
  target_id: string;
  /**
   * Price per share in a prediction market. Range \[0, 1\].
   */
  trigger_price: string;
  /**
   * Earliest time this node is active.
   */
  valid_after?: null | string;
  /**
   * Latest time this node is active.
   */
  valid_until?: null | string;
}
/**
 * Machine-evaluable thesis invalidation thresholds.
 */
export interface ThesisInvalidationPolicy {
  /**
   * Basis points (1 bps = 0.01%).
   */
  min_expected_return_bps: string;
  /**
   * Minimum fresh-score / entry-score ratio. Must be in `[0, 1]`.
   */
  min_score_retention: string;
  /**
   * Whether the frozen Route-local model gate must still pass to keep holding.
   */
  require_route_gate_eligibility: boolean;
}
/**
 * A trailing-stop policy relative to the position's peak mark.
 */
export interface TrailingStopPolicy {
  /**
   * Price that must be reached before the trailing stop arms.
   */
  activation_price?: null | Price;
  /**
   * Basis points (1 bps = 0.01%).
   */
  trail_bps: string;
}
/**
 * Unified scale-out state for deterministic and opportunistic partial exits.
 */
export interface ScaleOutState {
  /**
   * Number of shares (condition tokens).
   */
  cumulative_exited_shares: string;
  /**
   * Frozen entry-filled denominator shared by every scale-out source.
   */
  denominator_shares?: null | Shares;
  /**
   * Cumulative target currently submitted to the venue, if any.
   */
  pending_target?: null | PendingScaleOut;
  /**
   * Stable target ids already settled (append-only, deduplicated).
   */
  settled_target_ids: string[];
}
/**
 * One in-flight cumulative scale-out target.
 */
export interface PendingScaleOut {
  /**
   * Desired cumulative exit fraction of the frozen entry-filled denominator.
   */
  target_cumulative_exit_pct: string;
  /**
   * Deterministic target id; opportunistic cumulative targets have no id.
   */
  target_id?: null | string;
}
/**
 * One immutable incentive ledger event, including zero-amount retractions.
 */
export interface VenueIncentiveEventView {
  amount_usd: Usd;
  available_at: string;
  created_at: string;
  evidence_hash: string;
  execution_fill_id?: null | string;
  kind: VenueIncentiveKind;
  market_id?: null | string;
  observed_at: string;
  program_date: string;
  source_identity: string;
  source_partition: string;
  source_schedule_hash?: null | string;
  stage: VenueIncentiveStage;
  transaction_hash?: null | string;
  venue_incentive_event_id: string;
}
/**
 * Account-level incentive attribution and upstream scan health.
 */
export interface IncentiveReconciliationView {
  as_of: string;
  award_to_credit_delta_usd: Usd;
  below_payout_threshold: boolean;
  estimate_to_award_delta_usd: Usd;
  estimated_maker_accrual_usd: Usd;
  health: IncentiveReconciliationHealth;
  incomplete_day_count: number;
  last_success_at?: null | string;
  oldest_incomplete_date?: null | string;
  payout_threshold_usd: Usd;
  venue_awarded_maker_usd: Usd;
  wallet_credited_maker_usd: Usd;
  wallet_credited_taker_usd: Usd;
}
/**
 * Live venue account read (re-fetched on every request; not persisted).
 */
export interface LiveAccountView {
  as_of: string;
  available_usd: Usd;
  budget_cap_usd: Usd;
  capital_base_usd: Usd;
  exposures: ExposureBreakdown;
  fetched_at: string;
  positions: VenuePositionSnapshotView[];
  reserved_usd: Usd;
  source: AccountSource;
  venue_net_liquidation_usd: Usd;
}
/**
 * Full outbound projection of one actionable recommendation.
 *
 * Beyond the frozen decision contract, the view carries the two governance
 * facts a client needs to decide whether an `OrderIntent` may still be
 * created without a follow-up round-trip: the parent report's current
 * lifecycle [`Self::report_status`] and the id of any blocking pre-submission
 * intent [`Self::active_order_intent_id`]. Both are resolved server-side (the
 * single source of truth) so the intent-creation gate never guesses.
 */
export interface QuantRecommendationView {
  /**
   * Id of the blocking pre-submission order intent, when one already exists.
   */
  active_order_intent_id?: null | string;
  created_at: string;
  economic_tier: ExecutableEconomicTier;
  economic_tier_id: string;
  economics: RecommendationEconomics;
  event_id: string;
  execution_eligibility: ExecutionEligibility;
  factor_breakdown: RecommendationFactorBreakdown;
  identity: RecommendationIdentity;
  market_context: MarketContext;
  market_id: string;
  outcome_side: OutcomeSide;
  portfolio_plan_id: string;
  rank: number;
  recommendation_id: string;
  recommendation_report_id: string;
  report_route_run_id: string;
  /**
   * Current lifecycle state of the parent report (authoritative).
   */
  report_status:
    | 'expired'
    | 'obsolete'
    | 'prepared'
    | 'published'
    | 'revoked'
    | 'superseded';
  route: BuyModelRoute;
  status: RecommendationStatus;
  token_id: string;
  trade_plan: RecommendationTradePlan;
  valid_from: string;
  valid_until: string;
}
/**
 * One complete tier offered to the MILP. The optimizer may select the identity or reject it;
 * it never changes shares or money values.
 */
export interface ExecutableEconomicTier {
  candidate_id: string;
  category: MarketCategory;
  economic_tier_id: string;
  economics: RecommendationEconomics;
  entry_execution: EntryExecutionEconomics;
  event_id: string;
  hard_reservation_envelope: HardReservationBucket[];
  lineage_hash: string;
  market_id: string;
  outcome_side: OutcomeSide;
  probability_interval_width_bps: number;
  profit_probability_lower_bps: number;
  report_route_run_id: string;
  route: BuyModelRoute;
  scenario_cashflows: ScenarioExecutionCashflow[];
  tier_ordinal: number;
  token_id: string;
}
/**
 * Economic values displayed and ranked after global optimization.
 */
export interface RecommendationEconomics {
  capital_occupancy_usd_hours: UsdHours;
  cvar_contribution_usd: Usd;
  marginal_portfolio_value_usd: Usd;
  max_loss_usd: Usd;
  nominal_expected_net_usd: Usd;
  profit_probability_bps: Bps;
  robust_expected_net_usd: Usd;
}
/**
 * Immediate account cost of one filled venue execution.
 *
 * `cash_outlay_usd` is always the principal plus both immediate fee
 * components. A caller projecting a SELL cash flow subtracts the fees from
 * principal; delayed incentives never enter this structure.
 */
export interface ImmediateExecutionCost {
  builder_fee_usd: Usd;
  cash_outlay_usd: Usd;
  principal_usd: Usd;
  venue_fee_usd: Usd;
}
/**
 * Published cross-fitted passive execution distribution for one cohort.
 */
export interface PassiveFillDistribution {
  sample_count: number;
  source_evidence_hash: string;
  states: PassiveFillState[];
}
/**
 * One joint fill/latency/adverse-selection state in a passive distribution.
 */
export interface PassiveFillState {
  fill_latency_ms: number;
  fill_ratio_bps: number;
  kind: PassiveFillStateKind;
  post_fill_markout_bps: Bps;
  probability_bps: number;
}
/**
 * Delayed venue incentive estimated from one actual or simulated maker fill.
 *
 * This is deliberately not a fee and never changes immediate cash outlay,
 * hard reservation, maximum loss, or spendable balance.
 */
export interface DeferredVenueIncentive {
  eligibility: MakerRebateEligibility;
  /**
   * Modeling assumption for discounting, never evidence of wallet credit.
   */
  expected_credit_at: string;
  expected_rebate_usd: Usd;
  /**
   * UTC program day containing the maker fill.
   */
  program_date: string;
  source_schedule_hash: string;
}
/**
 * Hard cash reservation held independently of expected passive fills.
 */
export interface HardReservationBucket {
  end_secs: number;
  reserved_cash_usd: Usd;
}
/**
 * Scenario-specific execution and discounted cash flow.
 */
export interface ScenarioExecutionCashflow {
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  capital_cost_usd: string;
  capital_occupancy: ScenarioCapitalOccupancySlice[];
  delayed_maker_rebate_usd: Usd;
  discounted_exit_cash_usd: Usd;
  discounted_maker_rebate_usd: Usd;
  discounted_net_usd: Usd;
  entry_execution: ScenarioEntryExecution;
  filled_shares: Shares;
  immediate_cash_outlay_usd: Usd;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  risk_net_usd: string;
  scenario_index: number;
}
/**
 * One contiguous interval during which scenario cash is unavailable.
 */
export interface ScenarioCapitalOccupancySlice {
  duration_secs: number;
  locked_cash_usd: Usd;
}
/**
 * Per-recommendation execution eligibility across runtime modes.
 *
 * Computed and persisted with the recommendation. The create-intent and
 * admission flow consumes it. `eligible_modes` always contains
 * [`QuantRuntimeMode::ReportOnly`] (a report is the report-only artifact).
 */
export interface ExecutionEligibility {
  /**
   * Whether human approval is required.
   */
  approval_required: boolean;
  /**
   * Auto-execution policy id, when applicable.
   */
  auto_policy_id?: null | string;
  /**
   * Runtime modes in which this recommendation is eligible for execution.
   */
  eligible_modes: QuantRuntimeMode[];
  /**
   * Reasons the recommendation is ineligible (empty when fully eligible).
   */
  ineligibility_reasons: IneligibilityReason[];
}
/**
 * One factor's signed contribution to a recommendation's composite score.
 */
export interface FactorBreakdownEntry {
  /**
   * Statistical probability, confidence, or model weight stored losslessly.
   */
  confidence: string;
  /**
   * Signed contribution to the composite score.
   */
  contribution: string;
  /**
   * Direction the factor pushed the score.
   */
  direction: 'negative' | 'neutral' | 'positive';
  /**
   * Human explanation.
   */
  explanation: string;
  /**
   * Factor name.
   */
  factor_name: string;
  /**
   * Factor family.
   */
  family:
    | (
        | 'activity'
        | 'data_quality'
        | 'liquidity'
        | 'mean_reversion'
        | 'microstructure'
        | 'momentum'
        | 'resolution'
        | 'volatility'
      )
    | 'domain_crypto'
    | 'domain_weather'
    | 'structural';
  /**
   * Why the factor was indeterminate; `None` when scored / missing.
   */
  indeterminate_reason?: FactorIndeterminateReason | null;
  /**
   * How the score was derived; `None` when missing / indeterminate.
   */
  normalization_source?: NormalizationSource | null;
  /**
   * Normalized factor score in `[0, 1]`; `None` when the factor was missing
   * or indeterminate (never a fabricated neutral).
   */
  normalized_score?: null | Probability;
  /**
   * Raw factor value before normalization.
   */
  raw_value?: null | string;
  /**
   * References to the evidence behind this factor.
   */
  source_refs: string[];
  /**
   * Authoritative value state (scored / missing-input / not-applicable /
   * indeterminate) — drives the report's distinct "—" rendering.
   */
  value_state: 'indeterminate' | 'missing_input' | 'not_applicable' | 'scored';
  /**
   * Weight applied by the model.
   */
  weight: string;
}
/**
 * Display identity frozen at decision time.
 */
export interface RecommendationIdentity {
  category: MarketCategory;
  outcome_name: string;
  question: string;
}
/**
 * Frozen top-of-book and metadata at recommendation decision time.
 */
export interface MarketContext {
  best_ask?: null | Price;
  best_bid?: null | Price;
  book_age_ms: number;
  depth_usd: Usd;
  fee_rate?: null | string;
  market_status: MarketStatus;
  mid_price?: null | Price;
  neg_risk: boolean;
  spread_bps?: Bps | null;
  tick_size: TickSize;
  time_to_resolution_secs?: null | number;
  volume_24h_usd?: null | Usd;
}
/**
 * The single authoritative recommendation plan contract.
 *
 * Full-L2 recommendations own an executable exit plan. Bootstrap
 * recommendations instead own explicit, non-executable manual guidance. Both
 * regimes require calibration, an exact scenario binding, and live L2 entry
 * and sizing evidence before publication.
 */
export interface RecommendationTradePlan {
  entry: EntryPlan;
  exit: RecommendationExitPlan;
  policy: RecommendationPolicyProvenance;
  risk_envelope: RiskEnvelope;
  sizing: SizingPlan;
}
/**
 * When and how a recommendation becomes executable.
 */
export interface EntryPlan {
  /**
   * Whether to cancel the entry if it never triggers within the window.
   */
  cancel_if_not_triggered: boolean;
  /**
   * Immutable condition artifact reference evaluated at recommendation scope.
   */
  condition:
    | {
        artifact_id: string;
        content_hash: string;
        kind: 'conditional';
      }
    | {
        kind: 'immediate';
      };
  /**
   * Human explanation of the entry decision.
   */
  entry_reason: string;
  /**
   * Maximum tolerated book age at entry.
   */
  max_book_age_ms: number;
  /**
   * Basis points (1 bps = 0.01%).
   */
  max_slippage_bps: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  min_depth_usd: string;
  /**
   * Venue execution policy, orthogonal to the entry condition.
   */
  order_policy:
    | {
        fill_requirement: FillRequirement;
        kind: 'aggressive';
        worst_price: Price;
      }
    | {
        kind: 'passive';
        limit_price: Price;
        post_only: boolean;
      };
  /**
   * Earliest time the entry is valid.
   */
  valid_from: string;
  /**
   * Latest time the entry is valid.
   */
  valid_until: string;
}
/**
 * When and how a recommendation should be exited.
 */
export interface ExitPlan {
  /**
   * Human explanation of the exit decision.
   */
  exit_reason: string;
  /**
   * Optional manual-review checkpoint time.
   */
  manual_review_at?: null | string;
  /**
   * Maximum holding period in seconds.
   */
  max_hold_secs?: null | number;
  opportunistic_exit: OpportunisticExitPolicy1;
  /**
   * Whether a resolved hold-to-resolution lot is redeemed automatically.
   */
  redeem_policy: 'auto' | 'manual';
  /**
   * Monotone cumulative scale-out targets.
   */
  scale_out_targets: ScaleOutTarget[];
  /**
   * Whether the lot exits before resolution or holds through resolution.
   */
  settlement_mode: 'exit_before_resolution' | 'hold_to_resolution';
  /**
   * Stop-loss as a percentage move.
   */
  stop_loss_pct?: null | string;
  /**
   * Stop-loss price target.
   */
  stop_loss_price?: null | Price;
  /**
   * Take-profit as a percentage move.
   */
  take_profit_pct?: null | string;
  /**
   * Take-profit price target.
   */
  take_profit_price?: null | Price;
  thesis_invalidation: ThesisInvalidationPolicy1;
  /**
   * Absolute time-based exit.
   */
  time_exit_at?: null | string;
  /**
   * Optional trailing-stop policy.
   */
  trailing_stop?: null | TrailingStopPolicy;
}
/**
 * Policy-fitted advisory exit thresholds.
 */
export interface OpportunisticExitPolicy1 {
  max_cumulative_exit_pct: string;
  min_confidence: Probability;
  min_expected_alpha_bps: Bps;
  min_incremental_exit_pct: string;
  min_p_exit_better: Probability;
}
/**
 * Frozen, machine-evaluable thesis invalidation policy.
 */
export interface ThesisInvalidationPolicy1 {
  /**
   * Basis points (1 bps = 0.01%).
   */
  min_expected_return_bps: string;
  /**
   * Minimum fresh-score / entry-score ratio. Must be in `[0, 1]`.
   */
  min_score_retention: string;
  /**
   * Whether the frozen Route-local model gate must still pass to keep holding.
   */
  require_route_gate_eligibility: boolean;
}
/**
 * Honest report-only exit guidance for an L2-free bootstrap model.
 *
 * This intentionally contains no synthetic take-profit, stop-loss, trailing,
 * or opportunistic-exit thresholds. It is not accepted by execution paths.
 */
export interface BootstrapExitGuidance {
  guidance: string;
  manual_review_at: string;
  reference_horizon_secs: number;
  settlement_value_is_terminal: boolean;
}
/**
 * Deterministic cohort selector for prediction-market trajectory policies.
 */
export interface TradePolicyCohortKey {
  cash_budget_tier: Usd;
  category: MarketCategory;
  entry_price_max: Price;
  entry_price_min: Price;
  entry_route: TradePolicyEntryRoute;
  horizon_secs: number;
  liquidity: TradePolicyCohortDimension;
  profile_ref: ResearchProfileRef;
  volatility: TradePolicyCohortDimension;
}
/**
 * Versioned provenance for one fitted cohort dimension.
 */
export interface TradePolicyCohortDimension {
  bucket_id: string;
  methodology_hash: string;
  methodology_id: string;
}
/**
 * Stable immutable profile identity carried by every downstream artifact.
 */
export interface ResearchProfileRef {
  content_hash: string;
  id: string;
  version: number;
}
/**
 * Hard risk bounds consumed by execution admission (not natural language).
 */
export interface RiskEnvelope {
  /**
   * Whether auto-execution is permitted by this envelope.
   */
  auto_execution_allowed: boolean;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  cvar_contribution_usd: string;
  /**
   * Canonical hash of the envelope (admission verification).
   */
  envelope_hash: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  max_category_exposure_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  max_event_exposure_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  max_loss_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  max_market_exposure_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  max_position_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  max_route_exposure_usd: string;
  /**
   * Basis points (1 bps = 0.01%).
   */
  max_slippage_bps: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  maximum_scenario_loss_cap_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  portfolio_cvar_cap_usd: string;
  /**
   * Whether human approval is required before execution.
   */
  requires_approval: boolean;
  /**
   * Free-form risk notes for the report.
   */
  risk_notes: string[];
}
/**
 * How much capital a recommendation should deploy and the binding cap.
 */
export interface SizingPlan {
  /**
   * Time-weighted capital occupancy in USD-hours.
   */
  capital_occupancy_usd_hours: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  category_exposure_after_usd: string;
  /**
   * Exact immutable tier selected by the global MILP.
   */
  economic_tier_id: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  event_exposure_after_usd: string;
  /**
   * Number of shares (condition tokens).
   */
  expected_filled_shares: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  expected_maker_rebate_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  hard_reserved_cash_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  immediate_fee_usd: string;
  /**
   * Independent Gamma terms frozen for later maker-fill accrual. `None`
   * means the tier was valued with zero rebate.
   */
  maker_rebate_schedule?: FrozenMakerRebateSchedule | null;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  market_exposure_after_usd: string;
  /**
   * Suggested allocation as a fraction of the capital base.
   */
  portfolio_weight_pct: string;
  /**
   * Price per share in a prediction market. Range \[0, 1\].
   */
  reference_entry_price: string;
  /**
   * Number of shares (condition tokens).
   */
  requested_shares: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  route_exposure_after_usd: string;
  /**
   * Human explanation of the sizing decision.
   */
  sizing_reason: string;
}
/**
 * Full report header projection: lifecycle + account base + replay handles +
 * the report-level [`ReportSummary`].
 */
export interface QuantReportDetailView {
  account_snapshot_ref: string;
  account_source: AccountSource;
  capital_base_usd: Usd;
  created_at: string;
  decision_at: string;
  decision_policy_snapshot_id: string;
  expired_at?: null | string;
  fact_delivery?: null | ReportFactDeliveryView;
  market_selection_id: string;
  obsoleted_at?: null | string;
  portfolio_decision: PortfolioDecisionResult;
  portfolio_plan_id: string;
  predecessor_report_id?: null | string;
  published_at?: null | string;
  recommendation_report_id: string;
  report_kind: ReportKind;
  report_run_id: string;
  represented_routes: RepresentedRouteSet;
  revoked_at?: null | string;
  run?: null | ReportRunView;
  runtime_mode: QuantRuntimeMode;
  scenario_artifact_hash?: null | string;
  scenario_artifact_id?: null | string;
  status: RecommendationReportStatus;
  status_reason?: null | string;
  successor_report_id?: null | string;
  summary: ReportSummary;
  superseded_at?: null | string;
  top_n: number;
  valid_until?: null | string;
}
export interface ReportFactDeliveryView {
  announced_at?: null | string;
  attempt_count: number;
  bundle_hash: string;
  funnel_row_chain_hash: string;
  funnel_row_count: number;
  last_error?: null | string;
  next_attempt_at?: null | string;
  recommendation_row_chain_hash: string;
  recommendation_row_count: number;
  status: ReportFactDeliveryStatus;
  verified_at?: null | string;
}
/**
 * Unique global portfolio plan persisted and referenced by every recommendation.
 */
export interface GlobalPortfolioPlan {
  constraints: PortfolioConstraintEvidence;
  content_hash: string;
  exact_verification: ExactVerificationEvidence;
  objectives: PortfolioObjectiveEvidence;
  portfolio_plan_id: string;
  selected_tier_ids: string[];
  solver: SolverEvidence;
}
/**
 * Aggregate hard-constraint values recomputed outside the solver.
 */
export interface PortfolioConstraintEvidence {
  available_cash_used_usd: Usd;
  checked_constraint_count: number;
  evidence_hash: string;
  maximum_scenario_loss_usd: Usd;
  open_capital_usd: Usd;
  selected_recommendation_count: number;
}
/**
 * Exact post-solve verification evidence.
 */
export interface ExactVerificationEvidence {
  passed: boolean;
  recomputed_economics_hash: string;
  selected_tier_digest: string;
}
/**
 * Exact Decimal values fixed between lexicographic solve stages.
 */
export interface PortfolioObjectiveEvidence {
  capital_occupancy_usd_hours: UsdHours;
  cvar_usd: Usd;
  nominal_expected_net_usd: Usd;
  robust_expected_net_usd: Usd;
  stable_tie_break_stages: number;
}
/**
 * Stable `HiGHS` evidence. A plan exists only when every stage is proven optimal.
 */
export interface SolverEvidence {
  backend: string;
  /**
   * Exact power-of-two `HiGHS` user-bound scaling applied to this model.
   */
  bound_scale_exponent: number;
  coefficient_scale: number;
  configured_deadline_secs: number;
  deterministic_threads: number;
  /**
   * Number of immutable matrices uploaded for the complete publishable solve.
   * This must be one; leave-one-out ranking reuses the same matrix.
   */
  lexicographic_model_build_count: number;
  lexicographic_solve_count: number;
  /**
   * Number of later lexicographic stages seeded from the prior optimal solution.
   */
  lexicographic_warm_start_count: number;
  /**
   * Additional matrices uploaded for leave-one-out solves. This must be zero.
   */
  marginal_model_build_count: number;
  /**
   * Leave-one-out solves that reuse the lexicographic matrix.
   */
  marginal_model_reuse_count: number;
  marginal_solve_count: number;
  optimal: boolean;
  /**
   * Optimal Hamming-distance solves proving that the stable identity locks
   * admit exactly one binary tier selection.
   */
  tie_break_proof_count: number;
}
/**
 * Ordered, deduplicated model Routes represented by immutable market eligibility.
 */
export interface RepresentedRouteSet {
  digest: string;
  routes: BuyModelRoute[];
}
/**
 * Durable report-run projection returned by enqueue, list, detail, and retry.
 */
export interface ReportRunView {
  decision_at?: null | string;
  decision_policy_snapshot_id?: null | string;
  error_code?: null | string;
  error_summary?: null | string;
  finished_at?: null | string;
  heartbeat_at?: null | string;
  knowledge_lag_secs?: null | number;
  lease_expires_at?: null | string;
  lease_owner?: null | string;
  output_report_id?: null | string;
  report_run_id: string;
  request_id?: null | string;
  requested_at: string;
  retry_of_run_id?: null | string;
  schedule_id?: null | string;
  scheduled_for?: null | string;
  started_at?: null | string;
  status: ReportRunStatus;
  terminal_reason?: null | ReportRunTerminalReason;
  top_n?: null | number;
  trigger_key: string;
  trigger_kind: ReportTriggerKind;
}
/**
 * Report-level summary persisted to `quant_recommendation_report.summary_json`.
 */
export interface ReportSummary {
  /**
   * Number of scored candidates considered.
   */
  candidate_count: number;
  /**
   * Time-weighted capital occupancy in USD-hours.
   */
  capital_occupancy_usd_hours: string;
  /**
   * Hard-reserved cash allocated per category.
   */
  category_allocation: {
    crypto?: Usd;
    culture?: Usd;
    economics?: Usd;
    finance?: Usd;
    geopolitics?: Usd;
    other?: Usd;
    politics?: Usd;
    sports?: Usd;
    tech?: Usd;
    weather?: Usd;
  };
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  cvar_usd: string;
  data_quality_summary: DataQualitySummary;
  /**
   * Reason the report is empty, when `published_recommendation_count == 0`.
   */
  empty_reason?: EmptyReportReason | null;
  /**
   * Hard-reserved cash allocated per event.
   */
  event_allocation: {
    [k: string]: Usd;
  };
  execution_eligibility_summary: EligibilitySummary;
  /**
   * Number of markets in the selection snapshot.
   */
  market_selection_count: number;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  max_single_recommendation_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  maximum_scenario_loss_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  nominal_expected_net_usd: string;
  /**
   * Number of published recommendations.
   */
  published_recommendation_count: number;
  /**
   * Number of executable tiers rejected before publication.
   */
  rejected_tier_count: number;
  /**
   * Number of atomically ready Routes represented by this report.
   */
  represented_route_count: number;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  robust_expected_net_usd: string;
  /**
   * Hard-reserved cash allocated per model Route.
   */
  route_allocation: {
    crypto?: Usd;
    pooled?: Usd;
    weather?: Usd;
  };
  /**
   * Most common rejection reasons.
   */
  top_rejection_reasons: RejectionReasonCount[];
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  total_hard_reserved_cash_usd: string;
  /**
   * Report-level warnings.
   */
  warnings: string[];
}
/**
 * Data-quality summary.
 */
export interface DataQualitySummary {
  /**
   * Acceptable inputs.
   */
  acceptable_count: number;
  /**
   * Degraded inputs.
   */
  degraded_count: number;
  /**
   * Fresh inputs.
   */
  fresh_count: number;
  /**
   * Insufficient inputs.
   */
  insufficient_count: number;
  /**
   * Stale inputs.
   */
  stale_count: number;
}
/**
 * Execution-eligibility roll-up.
 */
export interface EligibilitySummary {
  /**
   * Eligible under auto-execution.
   */
  eligible_auto_execution: number;
  /**
   * Eligible under report-only.
   */
  eligible_report_only: number;
  /**
   * Eligible under semi-auto.
   */
  eligible_semi_auto: number;
}
/**
 * One rejection-reason tally.
 */
export interface RejectionReasonCount {
  /**
   * Number of candidates rejected for this reason.
   */
  count: number;
  /**
   * Rejection reason label.
   */
  reason:
    | 'existing_structural_conflict'
    | 'liquidity_buffer'
    | 'nominal_expected_net_floor'
    | 'not_selected_by_global_optimum'
    | 'probability_interval_width'
    | 'profit_probability_floor'
    | 'robust_expected_net_floor'
    | 'scenario_exit_capacity'
    | 'single_recommendation_exposure';
}
/**
 * Outbound projection of a [`ReportDiff`].
 */
export interface ReportDiffView {
  added: RecommendationDeltaView[];
  base_eligibility: EligibilitySummary1;
  base_report_id: string;
  base_total_hard_reserved_cash_usd: Usd;
  compare_eligibility: EligibilitySummary1;
  compare_report_id: string;
  compare_total_hard_reserved_cash_usd: Usd;
  removed: RecommendationDeltaView[];
  retained: RecommendationDeltaView[];
  total_hard_reserved_cash_usd_delta: Usd;
}
/**
 * Outbound projection of a single `(market, side)` recommendation delta.
 */
export interface RecommendationDeltaView {
  base?: null | RecommendationDiffSnapshotView;
  changed_fields: RecommendationChangedFieldView[];
  compare?: null | RecommendationDiffSnapshotView;
  hard_reserved_cash_usd_delta: Usd;
  market_id: string;
  outcome_side: OutcomeSide;
}
/**
 * Typed decision snapshot for one side of a recommendation diff.
 */
export interface RecommendationDiffSnapshotView {
  economics: RecommendationEconomics;
  execution_eligibility: ExecutionEligibility;
  factor_breakdown: RecommendationFactorBreakdown;
  rank: number;
  recommendation_id: string;
  trade_plan: RecommendationTradePlan;
  valid_from: string;
  valid_until: string;
}
/**
 * Execution-eligibility roll-up across published recommendations.
 */
export interface EligibilitySummary1 {
  /**
   * Eligible under auto-execution.
   */
  eligible_auto_execution: number;
  /**
   * Eligible under report-only.
   */
  eligible_report_only: number;
  /**
   * Eligible under semi-auto.
   */
  eligible_semi_auto: number;
}
/**
 * List-row projection of a recommendation report (header + summary roll-up).
 */
export interface QuantReportView {
  account_source: AccountSource;
  capital_base_usd: Usd;
  created_at: string;
  decision_at: string;
  empty_reason?: EmptyReportReason | null;
  expired_at?: null | string;
  obsoleted_at?: null | string;
  published_at?: null | string;
  published_recommendation_count: number;
  recommendation_report_id: string;
  report_kind: ReportKind;
  represented_routes: RepresentedRouteSet;
  revoked_at?: null | string;
  runtime_mode: QuantRuntimeMode;
  scenario_artifact_id?: null | string;
  status: RecommendationReportStatus;
  status_reason?: null | string;
  successor_report_id?: null | string;
  superseded_at?: null | string;
  top_n: number;
  total_hard_reserved_cash_usd: Usd;
  valid_until?: null | string;
}
