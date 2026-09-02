/**
 * This file is generated from the Rust operator API DTO contract.
 * Run `pnpm generate:quant-operator-api`; do not edit it by hand.
 */

export type AccountRecoveryIncidentKind =
  | 'account_mismatch'
  | 'break_glass_restart'
  | 'opening_inventory'
  | 'unknown_external_execution';
export type AccountRecoveryIncidentStatus = 'open' | 'reconciling' | 'sealed';
/**
 * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
 */
export type Usd = string;
/**
 * Number of shares (condition tokens).
 */
export type Shares = string;
/**
 * Typed reason an account recovery manifest cannot be sealed.
 */
export type AccountRecoveryMismatch =
  | {
      account_chain_execution_id: string;
      candidate_lot_ids: string[];
      kind: 'lot_allocation_required';
      sold_shares: Shares;
      token_id: string;
    }
  | {
      account_chain_execution_id: string;
      kind: 'clean_funder_required';
      role: AccountChainExecutionRole;
    }
  | {
      account_chain_execution_id: string;
      kind: 'incident_execution_incomplete';
    }
  | {
      account_chain_execution_id: string;
      kind: 'lot_allocation_invalid';
    }
  | {
      chain_shares: Shares;
      data_api_shares: Shares;
      kind: 'position_source_mismatch';
      token_id: string;
    }
  | {
      chain_usd: Usd;
      clob_usd: Usd;
      kind: 'collateral_mismatch';
    }
  | {
      count: number;
      kind: 'pending_settlement';
    }
  | {
      expected_shares: Shares;
      kind: 'position_ledger_mismatch';
      token_id: string;
      venue_shares: Shares;
    }
  | {
      kind: 'open_orders_present';
      order_ids: string[];
    }
  | {
      kind: 'pause_incomplete';
    }
  | {
      kind: 'reserved_capital_present';
      reserved_usd: Usd;
    }
  | {
      kind: 'token_metadata_missing';
      token_id: string;
    }
  | {
      kind: 'venue_snapshot_unstable';
    };
/**
 * Whether the account-owned order was resting, active, or self-matched.
 */
export type AccountChainExecutionRole = 'maker' | 'self_match' | 'taker';
export type AccountPauseOperationKind = 'pause' | 'unpause';
export type AccountPauseOperationState =
  | 'ambiguous'
  | 'confirmed'
  | 'dispatched'
  | 'failed'
  | 'prepared';
/**
 * Transport and identity domain of a chain submission.
 */
export type SettlementSubmissionKind =
  | 'direct_eoa'
  | 'externally_observed'
  | 'relayer';
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
 * Basis points (1 bps = 0.01%).
 */
export type Bps = string;
/**
 * Exact Buy-side route represented by one report and one durable model run.
 *
 * `Pooled` may contain only non-vertical market categories. `Crypto` and
 * `Weather` are isolated category routes because their `ResearchProfile`,
 * domain-source, factor-plane, and serving-contract preimages are distinct.
 */
export type BuyModelRoute = 'crypto' | 'pooled' | 'weather';
export type RouteEconomicHealthState =
  | 'data_incomplete'
  | 'degraded'
  | 'healthy'
  | 'insufficient_evidence';
/**
 * Immutable provenance that granted an intent permission to submit.
 */
export type AuthorizationEvidence =
  | {
      authorized_at: string;
      decision_policy_snapshot_id: string;
      kind: 'active_policy';
      policy_hash: string;
    }
  | {
      authorized_at: string;
      kind: 'operator_approval';
      operator_id: string;
      reason: string;
    };
/**
 * Immutable source from which an entry intent may receive authority.
 */
export type AuthorizationKind = 'active_policy' | 'operator_approval';
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
 * Price per share in a prediction market. Range \[0, 1\].
 */
export type Price = string;
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
/**
 * Governed execution-intent lifecycle state.
 */
export type OrderIntentStatus =
  | 'admission_pending'
  | 'admission_rejected'
  | 'authorization_rejected'
  | 'authorized'
  | 'cancelled'
  | 'expired'
  | 'failed'
  | 'filled'
  | 'invalidated'
  | 'partially_filled'
  | 'pending_authorization'
  | 'submitted';
export type VenueIncentiveKind = 'maker_rebate' | 'taker_rebate';
/**
 * Append-only incentive lifecycle event. Stages are facts, not mutable
 * status values on a single row.
 */
export type VenueIncentiveStage =
  | 'estimated_accrual'
  | 'venue_reported_accrual'
  | 'wallet_credited';
export type IncentiveReconciliationHealth =
  | 'healthy'
  | 'incomplete'
  | 'stale'
  | 'unavailable';
export type RecommendationEconomicStateDetail =
  | {
      censored_at: string;
      kind: 'censored';
      reason: EconomicOutcomeCensorReason;
    }
  | {
      entered_at: string;
      exit_reason: ExitReason;
      exited_at: string;
      kind: 'policy_exited';
    }
  | {
      entered_at: string;
      kind: 'horizon_liquidated';
      liquidated_at: string;
    }
  | {
      entered_at?: null | string;
      kind: 'resolved_before_horizon';
      payout_ratio: PayoutRatio;
      resolved_at: string;
    }
  | {
      kind: 'entry_not_triggered';
    }
  | {
      kind: 'entry_unfilled';
      triggered_at: string;
    };
/**
 * Redemption value of one resolved outcome token, in collateral units.
 *
 * Unlike the historical unconstrained [`Probability`] and [`Price`] wrappers,
 * this type validates every untrusted boundary. A corrupt database value or
 * wire payload outside the closed interval `0..=1` is rejected rather than
 * becoming a training label. Split resolutions such as `0.5` are preserved.
 */
export type PayoutRatio = string;
export type EconomicOutcomeCensorReason =
  | 'book_stale'
  | 'book_unavailable'
  | 'contract_mismatch'
  | 'fee_unavailable'
  | 'passive_trade_coverage_unavailable'
  | 'replay_gap'
  | 'source_late'
  | 'source_unavailable';
export type EconomicExitEvidenceKind =
  | 'full_bid_ladder'
  | 'none'
  | 'policy_fill'
  | 'resolution_payout';
export type RecommendationEconomicOutcomeState =
  | 'censored'
  | 'entry_not_triggered'
  | 'entry_unfilled'
  | 'horizon_liquidated'
  | 'policy_exited'
  | 'resolved_before_horizon';
export type ExecutionComparisonEvaluationView =
  | {
      actual_entry_latency_ms: number;
      actual_entry_price: Price;
      actual_fee_usd: Usd;
      actual_fill_ratio: string;
      actual_net_return_bps: Bps;
      actual_vs_planned_price_bps: Bps;
      fee_delta_usd: string;
      fill_ratio_delta: string;
      latency_delta_ms: number;
      planned_entry_latency_ms: number;
      planned_entry_price: Price;
      planned_fee_usd: Usd;
      planned_fill_ratio: string;
      planned_net_return_bps: Bps;
      policy_missed_return_bps?: Bps | null;
      return_delta_bps: Bps;
      status: 'evaluated';
    }
  | {
      reason: ExecutionComparisonNotEvaluableReasonView;
      status: 'not_evaluable';
    };
export type ExecutionComparisonNotEvaluableReasonView =
  | 'actual_baseline_unavailable'
  | 'identity_mismatch'
  | 'planned_economics_censored'
  | 'planned_entry_unavailable';
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
      expected_maker_rebate_accrual_usd: Usd;
      fill_distribution: PassiveFillDistribution;
      full_fill_cost: ImmediateExecutionCost;
      full_fill_maker_rebate_accrual_usd: Usd;
      good_til_secs: number;
      hard_reserved_cash_usd: Usd;
      kind: 'passive';
      limit_price: Price;
      maker_rebate_objective_status: MakerRebateObjectiveStatus;
      /**
       * Required, route-aware Gamma program truth frozen at decision time.
       */
      maker_rebate_terms:
        | {
            available_at: string;
            state: 'passive_no_program';
            terms_hash: string;
          }
        | {
            schedule: FrozenMakerRebateSchedule;
            state: 'passive_program';
          }
        | {
            state: 'aggressive_not_applicable';
          };
      maker_rebate_valuation: MakerRebateValuationEvidence;
      objective_maker_rebate_usd: Usd;
      requested_shares: Shares;
      visible_liquidity_usd: Usd;
    }
  | {
      execution_vwap: Price;
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
 * Operator-facing status of a recommendation's maker-rebate objective.
 */
export type MakerRebateObjectiveStatus =
  | {
      credited_probability_bps: number;
      state: 'scenario_weighted';
    }
  | {
      reason: MakerRebateObjectiveZeroReason;
      state: 'zero';
    }
  | {
      state: 'no_program';
    }
  | {
      state: 'not_applicable';
    };
/**
 * Typed reason why nominal maker accrual receives zero objective credit.
 */
export type MakerRebateObjectiveZeroReason =
  | 'below_payout_threshold'
  | 'reconciliation_incomplete'
  | 'reconciliation_stale'
  | 'reconciliation_unavailable';
/**
 * Frozen payout-lag evidence. Lag is measured from the close of the maker
 * fill's UTC program day, never from a later API observation timestamp.
 */
export type MakerRebateDelayBasis =
  | {
      complete_program_days: number;
      kind: 'observed_p95';
      lag_from_program_close_secs: number;
    }
  | {
      kind: 'conservative_fallback';
      lag_from_program_close_secs: number;
    };
/**
 * Point-in-time health of the account evidence required to value an
 * unreceived maker rebate in the expected objective.
 */
export type MakerRebateValuationHealth =
  | 'healthy'
  | 'incomplete'
  | 'stale'
  | 'unavailable';
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
 * Day-local payout eligibility for one promoted joint scenario.
 */
export type MakerRebateScenarioCreditStatus =
  | 'below_daily_threshold'
  | 'credited'
  | 'no_accrual'
  | 'not_applicable';
/**
 * Why a recommendation cannot receive its maximum execution authority.
 */
export type IneligibilityReason = 'automation_cap_exceeded';
/**
 * Maximum entry authority frozen on a recommendation or governance scope.
 */
export type ExecutionAuthorityCeiling =
  | 'analysis_only'
  | 'operator_approval'
  | 'policy_automatic';
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
export type ReportFunnelReason =
  | 'category_disabled'
  | 'executable_entry_unavailable'
  | 'execution_economics_unavailable'
  | 'existing_structural_conflict'
  | 'feature_data_quality_rejected'
  | 'ingest_lag_exceeded'
  | 'insufficient_liquidity'
  | 'insufficient_live_depth'
  | 'liquidity_buffer_insufficient'
  | 'low_confidence'
  | 'manually_blocked'
  | 'missing_model_output'
  | 'model_feature_unavailable'
  | 'no_positive_signal'
  | 'nominal_expected_net_below_floor'
  | 'not_open'
  | 'not_selected_by_global_optimum'
  | 'probability_interval_too_wide'
  | 'profit_probability_below_floor'
  | 'published'
  | 'resolution_ambiguous'
  | 'robust_expected_net_below_floor'
  | 'route_not_activated'
  | 'scenario_exit_capacity_insufficient'
  | 'score_below_floor'
  | 'single_recommendation_exposure_exceeded'
  | 'spread_too_wide'
  | 'stale_book';
/**
 * Closed, reason-specific diagnostics for one terminal report-funnel row.
 *
 * This document crosses the `ClickHouse` boundary as canonical JSON text, but
 * its schema is fully owned by this system. `None` is explicit so callers do
 * not overload `{}` with several incompatible meanings.
 */
export type ReportFunnelDiagnostics =
  | {
      detail: string;
      kind: 'planner_rejection';
    }
  | {
      economic_tier_id: string;
      kind: 'profit_probability_floor';
      lower_profit_probability_bps: number;
      maximum_probability_interval_width_bps: number;
      minimum_profit_probability_bps: number;
      nominal_expected_net_usd: Usd;
      nominal_profit_probability_bps: Bps;
      probability_interval_width_bps: number;
      robust_expected_net_usd: Usd;
      scenario_artifact_hash: string;
      scenario_artifact_id: string;
    }
  | {
      features: string[];
      kind: 'missing_model_features';
    }
  | {
      kind: 'feature_data_quality';
      missing_required: MissingFeatureDiagnostic[];
      status: DataQualityStatus;
    }
  | {
      kind: 'insufficient_live_depth';
      limit_price: Price;
      required_usd: Usd;
      visible_usd: Usd;
    }
  | {
      kind: 'none';
    };
/**
 * Why a feature value is absent. Missing values are never silently zero.
 */
export type NullReason =
  | 'domain_source_unavailable'
  | 'finalized_execution_unavailable'
  | 'insufficient_execution_history'
  | 'insufficient_history'
  | 'insufficient_role_coverage'
  | 'leg_book_missing'
  | 'linkage_unresolved'
  | 'not_applicable'
  | 'out_of_valid_range'
  | 'source_unavailable'
  | 'stale_beyond_policy';
/**
 * Point-in-time data quality classification.
 */
export type DataQualityStatus =
  | 'acceptable'
  | 'degraded'
  | 'fresh'
  | 'insufficient'
  | 'stale';
export type ReportFunnelStage =
  | 'business_eligible'
  | 'catalog_visible'
  | 'executable_data_eligible'
  | 'feature_ready'
  | 'model_gate_passed'
  | 'model_scored'
  | 'policy_ready'
  | 'portfolio_funded'
  | 'published'
  | 'sizing_eligible';

/**
 * Schema-only envelope used to generate frontend wire types and boundary validators.
 *
 * HTTP handlers never serialize this envelope. Every field points at the real
 * request or response DTO used by the handler so the SPA cannot maintain a
 * parallel operator contract.
 */
export interface QuantOperatorApiContractSchema {
  account_recovery_incident_response: AccountRecoveryIncidentView;
  account_snapshot_response: AccountSnapshotView;
  create_intent_request: CreateIntentRequest;
  economic_health_response: RouteEconomicHealthView;
  equity_snapshot_response: EquitySnapshotView;
  execution_confirmation_response: OrderIntentView;
  finalize_account_recovery_request: FinalizeAccountRecoveryRequest;
  incentive_event_response: VenueIncentiveEventView;
  incentive_reconciliation_response: IncentiveReconciliationView;
  live_account_response: LiveAccountView;
  recommendation_economic_outcome_response: RecommendationEconomicOutcomeView;
  recommendation_execution_comparison_response: RecommendationExecutionComparisonView;
  recommendation_response: QuantRecommendationView;
  reconcile_account_recovery_request: ReconcileAccountRecoveryRequest;
  report_detail_response: QuantReportDetailView;
  report_diff_response: ReportDiffView;
  report_funnel_market_response: ReportFunnelMarketView;
  report_funnel_response: QuantReportFunnelView;
  report_list_row_response: QuantReportView;
  seal_account_recovery_request: SealAccountRecoveryRequest;
}
export interface AccountRecoveryIncidentView {
  incident: AccountRecoveryIncidentInfo;
  latest_manifest?: AccountRecoveryManifestView | null;
  pause_operations: AccountPauseOperationView[];
}
export interface AccountRecoveryIncidentInfo {
  account_recovery_incident_id: string;
  created_at: string;
  execution_account_id: string;
  kind: AccountRecoveryIncidentKind;
  opened_at: string;
  reason: string;
  revision: number;
  seal_hash?: null | string;
  sealed_at?: null | string;
  sealed_by?: null | string;
  status: AccountRecoveryIncidentStatus;
  trigger_chain_execution_id?: null | string;
  updated_at: string;
}
export interface AccountRecoveryManifestView {
  account_recovery_manifest_id: string;
  assessment: AccountRecoveryAssessment;
  attempt_no: number;
  converged: boolean;
  created_at: string;
  evidence_hash: string;
  finalized_block_hash: string;
  finalized_block_number: number;
  input: AccountRecoveryAssessmentInput;
  observed_at: string;
}
/**
 * Deterministic assessment persisted as the account recovery manifest payload.
 */
export interface AccountRecoveryAssessment {
  allocations: AccountRecoveryLotAllocation[];
  created_lots: AccountRecoveryCreatedLot[];
  evidence_hash: string;
  mismatches: AccountRecoveryMismatch[];
}
/**
 * Deterministic post-recovery quantity assigned to one existing lot.
 */
export interface AccountRecoveryLotAllocation {
  after_cost_usd: Usd;
  after_shares: Shares;
  before_cost_usd: Usd;
  before_shares: Shares;
  closed_at?: null | string;
  realized_pnl_delta_usd: Usd;
  strategy_position_lot_id: string;
  token_id: string;
}
/**
 * Remaining shares from one incident BUY that must become a recovery-origin lot.
 */
export interface AccountRecoveryCreatedLot {
  account_chain_execution_id: string;
  acquired_cost_usd: Usd;
  acquired_shares: Shares;
  closed_at?: null | string;
  realized_pnl_delta_usd: Usd;
  remaining_cost_usd: Usd;
  remaining_shares: Shares;
  strategy_position_lot_id: string;
  token_id: string;
}
/**
 * Fully materialized, source-independent input to deterministic recovery assessment.
 */
export interface AccountRecoveryAssessmentInput {
  chain_collateral_usd: Usd;
  chain_positions: AccountRecoveryTokenBalance[];
  chain_snapshot_hash: string;
  clean_funder_blocker?: AccountCleanFunderBlockerEvidence | null;
  clob_collateral_usd: Usd;
  clob_snapshot_hash: string;
  data_api_positions: AccountRecoveryTokenBalance[];
  data_api_snapshot_hash: string;
  execution_account_id: string;
  explicit_sell_allocations: AccountRecoverySellAllocation[];
  finalized_block_hash: string;
  finalized_block_number: number;
  incident_executions: AccountRecoveryExecutionDelta[];
  invalid_execution_ids: string[];
  observed_at: string;
  open_lots: AccountRecoveryLotBalance[];
  open_order_ids: string[];
  pause_confirmed: boolean;
  pending_settlement_count: number;
  recovery_incident_id: string;
  reserved_usd: Usd;
  settlement_snapshot_hash: string;
  unmapped_token_ids: string[];
  venue_snapshot_stable: boolean;
}
/**
 * One venue or finalized-chain token balance used by account recovery.
 */
export interface AccountRecoveryTokenBalance {
  shares: Shares;
  token_id: string;
}
export interface AccountCleanFunderBlockerEvidence {
  account_chain_execution_id: string;
  evidence_hash: string;
  role: AccountChainExecutionRole;
}
/**
 * Operator-owned allocation for one ambiguous external SELL across open lots.
 */
export interface AccountRecoverySellAllocation {
  account_chain_execution_id: string;
  shares: Shares;
  strategy_position_lot_id: string;
}
/**
 * Finalized incident execution needed to explain a position delta.
 */
export interface AccountRecoveryExecutionDelta {
  account_chain_execution_id: string;
  available_at: string;
  exact_fee_usd: Usd;
  principal_usd: Usd;
  shares_delta: string;
  token_id: string;
}
/**
 * Open internal lot state before incident execution allocation.
 */
export interface AccountRecoveryLotBalance {
  cost_usd: Usd;
  opened_at: string;
  shares: Shares;
  strategy_position_lot_id: string;
  token_id: string;
}
export interface AccountPauseOperationView {
  account_pause_operation_id: string;
  confirmation_block_hash?: null | string;
  confirmation_block_number?: null | number;
  confirmed_at?: null | string;
  created_at: string;
  dispatched_at?: null | string;
  effective_block?: null | number;
  exchange_address: string;
  failure_detail?: null | string;
  operation_kind: AccountPauseOperationKind;
  requested_block: number;
  state: AccountPauseOperationState;
  submission_kind: SettlementSubmissionKind;
  transaction_hash?: null | string;
  updated_at: string;
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
 * and cap-room checks. Built from [`VenuePositionSnapshot`]s via
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
export interface RouteEconomicHealthView {
  assessed_through: string;
  available_at: string;
  coverage: string;
  created_at: string;
  due_observation_count: number;
  effective_sample_size?: null | string;
  evidence: RouteEconomicHealthEvidenceDocument;
  evidence_hash: string;
  feedback_policy_hash: string;
  lower_confidence_return_bps?: Bps | null;
  research_profile_artifact_id: string;
  route: BuyModelRoute;
  route_identity_hash: string;
  state: RouteEconomicHealthState;
  usable_observation_count: number;
  weighted_mean_return_bps?: Bps | null;
  window_start?: null | string;
}
export interface RouteEconomicHealthEvidenceDocument {
  methodology_version: string;
  observation_hash: string;
  uniqueness_weight_hash?: null | string;
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
  authorization_evidence?: AuthorizationEvidence | null;
  authorization_kind?: AuthorizationKind | null;
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
  last_signal_recheck_at?: null | string;
  latest_reinference?: ExitReinferenceObservation | null;
  model_version_id: string;
  next_check_at?: null | string;
  order_intent_id: string;
  peak_mark_price?: null | Price;
  recommendation_id: string;
  risk_envelope_hash: string;
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
   * Required route applicability and independently sourced Gamma terms.
   */
  maker_rebate_terms:
    | {
        available_at: string;
        state: 'passive_no_program';
        terms_hash: string;
      }
    | {
        schedule: FrozenMakerRebateSchedule;
        state: 'passive_program';
      }
    | {
        state: 'aggressive_not_applicable';
      };
  /**
   * Basis points (1 bps = 0.01%).
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
  exponent: string;
  platform_rate: string;
  rebate_rate: string;
  taker_only: boolean;
  terms_hash: string;
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
export interface FinalizeAccountRecoveryRequest {
  expected_revision: number;
  reason: string;
}
/**
 * One immutable incentive ledger event, including zero-amount retractions.
 */
export interface VenueIncentiveEventView {
  amount_usd: Usd;
  available_at: string;
  clob_trade_observation_id?: null | string;
  created_at: string;
  evidence_hash: string;
  kind: VenueIncentiveKind;
  market_id?: null | string;
  observed_at: string;
  program_date: string;
  source_identity: string;
  source_partition: string;
  source_terms_hash?: null | string;
  stage: VenueIncentiveStage;
  transaction_hash?: null | string;
  venue_incentive_event_id: string;
}
/**
 * Account-level incentive attribution and upstream scan health.
 */
export interface IncentiveReconciliationView {
  as_of: string;
  below_payout_threshold_program_dates: string[];
  estimate_to_reported_delta_usd: Usd;
  estimated_maker_accrual_usd: Usd;
  health: IncentiveReconciliationHealth;
  incomplete_day_count: number;
  last_success_at?: null | string;
  oldest_incomplete_date?: null | string;
  overdue_program_dates: string[];
  payout_threshold_usd: Usd;
  reported_to_credit_delta_usd: Usd;
  venue_reported_maker_accrual_usd: Usd;
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
export interface RecommendationEconomicOutcomeView {
  available_at: string;
  created_at: string;
  decision_at: string;
  decision_policy_snapshot_id: string;
  economic_tier_id: string;
  evidence_hash: string;
  horizon_at: string;
  model_version_id: string;
  payload: RecommendationEconomicOutcomePayload;
  recommendation_id: string;
  recommendation_report_id: string;
  replay_kernel_version: string;
  report_route_run_id: string;
  research_profile_artifact_id: string;
  source_available_until: string;
  state: RecommendationEconomicOutcomeState;
  trade_policy_artifact_id: string;
}
export interface RecommendationEconomicOutcomePayload {
  amounts: RecommendationEconomicAmounts;
  detail: RecommendationEconomicStateDetail;
  evidence: RecommendationEconomicEvidence;
}
export interface RecommendationEconomicAmounts {
  entry_cost_usd: Usd;
  entry_filled_shares: Shares;
  execution_fee_usd: Usd;
  exit_proceeds_usd: Usd;
  exited_shares: Shares;
  expected_maker_rebate_usd: Usd;
  net_pnl_usd?: null | Usd;
  net_return_bps?: null | string;
  resolution_payout_usd: Usd;
}
export interface RecommendationEconomicEvidence {
  exit_evidence_kind: EconomicExitEvidenceKind;
  fee_covered: boolean;
  full_l2_covered: boolean;
  passive_trade_covered?: boolean | null;
  replay_input_hash: string;
  replay_output_hash: string;
}
export interface RecommendationExecutionComparisonView {
  comparison_hash: string;
  economic_outcome_hash: string;
  evaluation: ExecutionComparisonEvaluationView;
  policy_counterfactual_hash: string;
  recommendation_id: string;
  trajectory_artifact_hash: string;
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
 * Frozen account-level evidence used by all passive tiers in one report.
 */
export interface MakerRebateValuationEvidence {
  as_of: string;
  delay_basis: MakerRebateDelayBasis;
  evidence_hash: string;
  health: MakerRebateValuationHealth;
  payout_threshold_usd: Usd;
  program_day_baselines: MakerRebateProgramDayBaseline[];
}
/**
 * Confirmed local maker-fill accrual already accumulated on one UTC program
 * day before the current report's hypothetical fills are added.
 */
export interface MakerRebateProgramDayBaseline {
  confirmed_accrual_usd: Usd;
  program_date: string;
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
  discounted_exit_cash_usd: Usd;
  discounted_net_usd: Usd;
  entry_execution: ScenarioEntryExecution;
  filled_shares: Shares;
  immediate_cash_outlay_usd: Usd;
  maker_rebate_accrual_usd: Usd;
  maker_rebate_credit_status: MakerRebateScenarioCreditStatus;
  maker_rebate_expected_by?: null | string;
  maker_rebate_program_date?: null | string;
  maker_rebate_program_day_baseline_usd: Usd;
  maker_rebate_program_day_total_usd: Usd;
  objective_maker_rebate_usd: Usd;
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
 * Per-recommendation execution authority ceiling and immutable blockers.
 */
export interface ExecutionEligibility {
  blockers: IneligibilityReason[];
  ceiling: ExecutionAuthorityCeiling;
  policy_binding?: null | string;
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
 * Honest analysis-only exit guidance for an L2-free bootstrap model.
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
  expected_maker_rebate_accrual_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  hard_reserved_cash_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  immediate_fee_usd: string;
  maker_rebate_objective_status: MakerRebateObjectiveStatus;
  /**
   * Required route applicability and independent Gamma terms.
   */
  maker_rebate_terms:
    | {
        available_at: string;
        state: 'passive_no_program';
        terms_hash: string;
      }
    | {
        schedule: FrozenMakerRebateSchedule;
        state: 'passive_program';
      }
    | {
        state: 'aggressive_not_applicable';
      };
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  market_exposure_after_usd: string;
  /**
   * USD-denominated monetary amount (Polymarket V2 pUSD on Polygon).
   */
  objective_maker_rebate_usd: string;
  /**
   * Suggested allocation as a fraction of the capital base.
   */
  portfolio_weight_pct: string;
  rebate_delay_basis?: MakerRebateDelayBasis | null;
  rebate_valuation_hash?: null | string;
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
export interface ReconcileAccountRecoveryRequest {
  expected_revision: number;
  reason: string;
  sell_allocations: AccountRecoverySellAllocation[];
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
  analysis_only: number;
  operator_approval: number;
  policy_automatic: number;
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
  analysis_only: number;
  operator_approval: number;
  policy_automatic: number;
}
export interface ReportFunnelMarketView {
  decision_policy_snapshot_id: string;
  event_id: string;
  feature_vector_id?: null | string;
  market_id: string;
  market_selection_id: string;
  model_run_id?: null | string;
  model_version_id?: null | string;
  primary_reason: ReportFunnelReason;
  primary_token_id: string;
  recommendation_id?: null | string;
  recommendation_report_id: string;
  report_route_run_id?: null | string;
  route?: BuyModelRoute | null;
  row_hash: string;
  secondary_diagnostics: ReportFunnelDiagnostics;
  signal_candidate_id?: null | string;
  terminal_stage: ReportFunnelStage;
}
/**
 * One required feature rejected by the governed data-quality policy.
 */
export interface MissingFeatureDiagnostic {
  feature_name: string;
  reason: NullReason;
}
export interface QuantReportFunnelView {
  catalog_visible_count: number;
  conserved: boolean;
  published_count: number;
  recommendation_report_id: string;
  stages: ReportFunnelStageView[];
}
export interface ReportFunnelStageView {
  excluded_count: number;
  input_count: number;
  output_count: number;
  stage: ReportFunnelStage;
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
  scenario_artifact_id?: null | string;
  status: RecommendationReportStatus;
  status_reason?: null | string;
  successor_report_id?: null | string;
  superseded_at?: null | string;
  top_n: number;
  total_hard_reserved_cash_usd: Usd;
  valid_until?: null | string;
}
export interface SealAccountRecoveryRequest {
  account_recovery_manifest_id: string;
  expected_revision: number;
  reason: string;
}
