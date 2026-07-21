/**
 * This file is generated from the Rust Config API DTO contract.
 * Run `pnpm generate:config-api`; do not edit it by hand.
 */

export type PolicyActorKind = 'operator' | 'system';
export type PolicyActivationKind = 'initial' | 'promote' | 'rollback';
export type ConfigResourceKind =
  | 'execution_authorization'
  | 'execution_risk_policy'
  | 'model_routing'
  | 'operational_control'
  | 'recommendation_policy'
  | 'report_schedule';
/**
 * Closed set of documents accepted by the governed policy repository.
 *
 * `PostgreSQL` stores this aggregate in `JSONB` because revisions are immutable
 * documents and none of their leaf fields participate in database queries.
 * `SeaORM` still reads and writes the column as this Rust enum, never as an
 * untyped `serde_json::Value`.
 */
export type PolicyDocument =
  | {
      document: ExecutionAuthorization;
      resource_kind: 'execution_authorization';
    }
  | {
      document: ExecutionRiskPolicy;
      resource_kind: 'execution_risk_policy';
    }
  | {
      document: ModelRouting;
      resource_kind: 'model_routing';
    }
  | {
      document: OperationalControl;
      resource_kind: 'operational_control';
    }
  | {
      document: RecommendationPolicy;
      resource_kind: 'recommendation_policy';
    }
  | {
      document: ReportSchedule;
      resource_kind: 'report_schedule';
    };
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
 * Runtime-config model-version id reference.
 */
export type ModelVersionRef = string;
/**
 * Validated decimal value serialized as a JSON string without losing precision.
 */
export type DecimalValue = string;
/**
 * A monotonic schema version for feature / factor / label / config schemas.
 *
 * Wrapping the version prevents accidentally mixing it with unrelated integers
 * (counts, ids, ordinals) and makes "which schema generated this row" explicit
 * in every signature. Versions are `>= 1` by convention; untrusted wire and DB
 * values are validated through [`SchemaVersion::try_new`].
 */
export type SchemaVersion = number;
export type PolicyRevisionStatus = 'draft' | 'validated';
export type PolicyValidationCode =
  | 'artifact_incompatible'
  | 'authorization_denied'
  | 'credential_unavailable'
  | 'dependency_unavailable'
  | 'resource_kind_mismatch'
  | 'schedule_invalid'
  | 'schema_version_mismatch'
  | 'semantic_constraint';
export type PolicyValidationSeverity = 'error' | 'warning';
export type PolicyPreflightCheckKind =
  | 'artifact_compatibility'
  | 'consumer_preparation'
  | 'credential_availability'
  | 'execution_capability'
  | 'schedule_preview'
  | 'semantic_validation'
  | 'typed_schema';
/**
 * Closed, localizable explanation vocabulary for Config preflight rows.
 */
export type PolicyPreflightDetailCode =
  | 'consumer_preparation_failed'
  | 'consumer_preparation_passed'
  | 'consumer_preparation_skipped'
  | 'semantic_validation_failed'
  | 'semantic_validation_passed'
  | 'typed_document_decoded';
export type CheckOutcome = 'failed' | 'not_applicable' | 'passed';
/**
 * Outcome of an atomic policy activation transaction.
 */
export type PolicyActivationOutcome = 'committed' | 'exact_replay';
export type ConfigActivityView =
  | {
      event: PolicyActivationView;
      event_type: 'activation';
    }
  | {
      event: PolicyApprovalView;
      event_type: 'approval';
    }
  | {
      event: PolicyRevisionView;
      event_type: 'revision';
    };
export type PolicyApprovalDecision = 'approved' | 'rejected';
export type CredentialKind =
  | 'chainlink_data_streams_api_key'
  | 'chainlink_data_streams_api_secret'
  | 'clickhouse_runtime'
  | 'evidence_attestation'
  | 'jwt_signing'
  | 'polymarket_private_key'
  | 'polymarket_relayer'
  | 'postgres_runtime'
  | 'redis_runtime'
  | 'telegram_bot_token'
  | 'webhook_authorization';
export type CredentialHealthStatus = 'available' | 'missing' | 'not_configured';
export type DeploymentEndpointKind =
  | 'artifact_store'
  | 'clickhouse'
  | 'clob_api'
  | 'data_api'
  | 'domain_provider'
  | 'gamma_api'
  | 'postgres'
  | 'redis'
  | 'web_bind';
export type ResourceBudgetKind =
  | 'cache'
  | 'clickhouse_writer'
  | 'database'
  | 'market_data_ingest'
  | 'report_execution'
  | 'research_jobs'
  | 'web';
export type ResourceBudgetMetric =
  | 'batch_rows'
  | 'cache_entries'
  | 'configured_origins'
  | 'heartbeat_interval'
  | 'lease_duration'
  | 'max_concurrency'
  | 'min_concurrency'
  | 'operation_timeout'
  | 'queue_capacity'
  | 'subscription_capacity';
export type ResourceBudgetUnit =
  | 'count'
  | 'entries'
  | 'milliseconds'
  | 'rows'
  | 'seconds'
  | 'tokens';
export type LifecycleBaseline = 'boot';
/**
 * Closed, strongly typed detail vocabulary for production-seal checks.
 */
export type LifecycleCheckDetail =
  | {
      build_commit: string;
      clean: boolean;
      detail_kind: 'compiled_build_identity';
    }
  | {
      detail_kind: 'contract_matched';
    }
  | {
      detail_kind: 'external_evidence';
      evidence_hash?: null | string;
    }
  | {
      detail_kind: 'migration_ledgers_verified';
    }
  | {
      detail_kind: 'missing_active_policy_bundle';
    }
  | {
      detail_kind: 'policy_bundle';
      policy_bundle_hash: string;
    }
  | {
      detail_kind: 'schema_fingerprint';
      fingerprint: string;
    };
export type LifecycleCheckKind =
  | 'active_policy_bundle'
  | 'backup_evidence'
  | 'clickhouse_schema_fingerprint'
  | 'compiled_build_identity'
  | 'config_end_to_end'
  | 'lifecycle_contract'
  | 'migration_state'
  | 'postgres_schema_fingerprint';
export type ProjectLifecycleState =
  | 'pre_production_resettable'
  | 'production_frozen';
export type PolicyConsumer =
  | 'alert_dispatcher'
  | 'data_quality_gate'
  | 'execution_admission'
  | 'exit_monitor'
  | 'market_selection'
  | 'model_runner'
  | 'order_intent_service'
  | 'portfolio_optimizer'
  | 'recommendation_composer'
  | 'report_coordinator'
  | 'report_scheduler'
  | 'runtime_mode_gate'
  | 'worker_admission';
export type PolicyApplyBoundary =
  | 'execution_authorization_admission'
  | 'future_report_run_reconcile'
  | 'model_evaluation_claim'
  | 'operational_admission'
  | 'order_intent_creation'
  | 'report_run_claim';
/**
 * How often a report schedule fires.
 *
 * Tagged on `kind`. The cron variant is parsed/scheduled by the runner;
 * validation only checks structural validity.
 */
export type ScheduleCadence =
  | {
      /**
       * 6-field cron expression.
       */
      expr: string;
      kind: 'cron';
      /**
       * Optional IANA timezone (e.g. `America/New_York`).
       */
      timezone?: null | string;
    }
  | {
      /**
       * Interval between fires, in seconds.
       */
      interval_secs: number;
      kind: 'interval';
    };
export type DecisionPolicySnapshotSource =
  | 'activation'
  | 'bootstrap'
  | 'rollback';

/**
 * Schema-only envelope used to generate the frontend Config API contract.
 *
 * It is never serialized by an HTTP handler. Keeping every request and
 * response DTO reachable from one Rust root makes generated TypeScript drift
 * mechanically detectable without duplicating wire shapes in the SPA.
 */
export interface ConfigApiContractSchema {
  activate_request: ActivatePolicyDraftRequest;
  activate_response: PolicyActivationResultView;
  activity_response: ConfigActivityView[];
  approve_request: ApprovePolicyDraftRequest;
  approve_response: PolicyApprovalView;
  create_draft_request: CreatePolicyDraftRequest;
  create_draft_response: PolicyRevisionView;
  current_response: CurrentPolicyResourceView;
  deployment_response: DeploymentConfigView;
  lifecycle_response: LifecycleView;
  resource_schema_response: PolicyResourceSchemaView;
  resources_response: ConfigResourcesView;
  revisions_response: PolicyRevisionView[];
  schedule_preview_request: SchedulePreviewRequest;
  schedule_preview_response: SchedulePreviewView;
  seal_production_request: SealProductionRequest;
  seal_production_response: LifecycleView;
  snapshot_options_query: ConfigSnapshotOptionsQuery;
  snapshot_options_response: DecisionPolicySnapshotOptionView[];
  validate_draft_request: ValidatePolicyDraftRequest;
  validation_response: PolicyValidationView;
}
export interface ActivatePolicyDraftRequest {
  approval_id: string;
  candidate_bundle_hash: string;
  expected_active_revision_id?: null | string;
  expected_bundle_generation: number;
  idempotency_key: string;
  preflight_token: string;
  reason: string;
}
export interface PolicyActivationResultView {
  activation: PolicyActivationView;
  activation_kind: PolicyActivationKind;
  applied_revision: PolicyRevisionView;
  committed_generation: number;
  committed_revision_vector: PolicyRevisionBundle;
  committed_snapshot_hash: string;
  committed_snapshot_id: string;
  outcome: PolicyActivationOutcome;
}
/**
 * Immutable activation record exposed by the Config API.
 */
export interface PolicyActivationView {
  activated_at: string;
  activated_by: PolicyActorView;
  activation_kind: PolicyActivationKind;
  activation_request_hash: string;
  audit_event_id: string;
  bundle_generation: number;
  created_at: string;
  decision_policy_snapshot_id: string;
  expected_active_revision_id?: null | string;
  expected_bundle_generation: number;
  idempotency_key: string;
  policy_activation_id: string;
  policy_approval_id: string;
  policy_revision_id: string;
  previous_policy_revision_id?: null | string;
  reason: string;
  resource_kind: ConfigResourceKind;
  rollback_target_revision_id?: null | string;
}
export interface PolicyActorView {
  kind: PolicyActorKind;
  label: string;
  user_id?: null | string;
}
export interface PolicyRevisionView {
  created_at: string;
  created_by: PolicyActorView;
  document: PolicyDocument;
  policy_revision_id: string;
  preflight_expires_at?: null | string;
  reason: string;
  resource_kind: ConfigResourceKind;
  revision_hash: string;
  schema_version: SchemaVersion;
  status: PolicyRevisionStatus;
  validated_at?: null | string;
  validation_evidence?: null | PolicyValidationEvidence;
}
/**
 * Market-selection, data-quality, and recommendation payload semantics.
 */
export interface RecommendationPolicy {
  data_quality?: DataQualityConfig;
  reports?: ReportsConfig;
  /**
   * A monotonic schema version for feature / factor / label / config schemas.
   *
   * Wrapping the version prevents accidentally mixing it with unrelated integers
   * (counts, ids, ordinals) and makes "which schema generated this row" explicit
   * in every signature. Versions are `>= 1` by convention; untrusted wire and DB
   * values are validated through [`SchemaVersion::try_new`].
   */
  schema_version?: number;
  selection?: SelectionConfig;
}
/**
 * Data quality thresholds for PIT features and facts.
 */
export interface DataQualityConfig {
  /**
   * Named policy for stale feature handling.
   */
  feature_staleness_policy?: 'allow_degraded' | 'reject_stale_required';
  /**
   * Maximum age for a book snapshot before it is stale.
   */
  max_book_age_ms?: number;
  /**
   * Maximum acceptable age (seconds) of the freshest domain observation for
   * a linked instrument at decision time
   * (`StalenessRule::MaxDomainObservationAge`).
   */
  max_domain_observation_age_secs?: number;
  /**
   * Maximum acceptable age (seconds) of the freshest materialized feature
   * bucket at decision time. Governs offline/online feature staleness
   * (`StalenessRule::MaxFeatureBucketAge`) — independent of live ingest lag.
   */
  max_feature_bucket_age_secs?: number;
  /**
   * Maximum acceptable ingest **pipeline** lag (enqueue→ClickHouse flush-ack),
   * in milliseconds. Live-plane backpressure health only — NOT venue book age.
   * Governs `DataQualitySnapshot.ingest_lag_exceeded`, execution admission, and
   * market-candidate selection.
   */
  max_ingest_lag_ms?: number;
  /**
   * Maximum tolerated stale-book ratio across the live book plane (basis points).
   *
   * Consumed by execution admission `DataQualityCheck` (#6): deny when
   * `stale_tokens / total_tokens * 10_000` exceeds this cap. Distilled into
   * frozen admission input at build time so checks never read config directly.
   */
  max_stale_book_ratio_bps?: number;
  /**
   * Maximum acceptable age (seconds) of the freshest trade-tape print at
   * decision time (`StalenessRule::MaxTradeTapeAge`).
   */
  max_trade_tape_age_secs?: number;
  /**
   * Reject crossed books before feature generation.
   */
  reject_crossed_books?: boolean;
  /**
   * Reject empty books before feature generation.
   */
  reject_empty_books?: boolean;
}
/**
 * Report schedules and payload sizing.
 */
export interface ReportsConfig {
  /**
   * Default global knowledge lag frozen for an ad-hoc request without an override.
   */
  ad_hoc_default_knowledge_lag_secs?: number;
  /**
   * Default `TopN` frozen when an ad-hoc request omits its override.
   */
  ad_hoc_default_top_n?: number;
  /**
   * Whether ad-hoc report generation is enabled.
   */
  ad_hoc_report_enabled?: boolean;
  /**
   * Delivery policy name.
   */
  delivery_policy?: 'store_and_notify' | 'store_only';
  /**
   * Entry-window ratio in `(0, 1]`: a recommendation's entry-by deadline is
   * `as_of + effective_horizon * entry_window_ratio`. `0.5` enters only while
   * at least half the signal's edge remains (the half-life point); the
   * time-stop / exit still uses the full effective horizon.
   */
  entry_window_ratio?: string;
  /**
   * Fallback prediction horizon (seconds), used **only** when the model
   * provides no per-candidate `suggested_horizon_secs` (classical / non-ML
   * runs). The per-recommendation validity is otherwise data-driven from the
   * model's frozen horizon capped by the market's time-to-resolution; this is
   * never a flat TTL applied uniformly.
   */
  fallback_horizon_secs?: number;
  /**
   * Deployment-proven upper bound for one complete catalog-visible report.
   * Exceeding it fails the report; it never truncates market candidates.
   */
  hard_candidate_ceiling?: number;
  /**
   * Maximum `TopN` size (hard upper bound for every schedule and ad-hoc run,
   * capped by [`MAX_REPORT_TOP_N`]).
   */
  max_top_n?: number;
}
/**
 * Market selection selection policy.
 */
export interface SelectionConfig {
  /**
   * Whether near-resolution markets may enter the selection.
   */
  allow_near_resolution?: boolean;
  /**
   * Category slugs eligible for quant reports.
   */
  enabled_categories?: MarketCategory[];
  /**
   * Maximum allowed top-of-book spread in basis points.
   */
  max_spread_bps?: number;
  /**
   * Maximum seconds until market resolution.
   */
  max_time_to_resolution_secs?: number;
  /**
   * Minimum displayed liquidity in USD.
   */
  min_liquidity_usd?: string;
  /**
   * Minimum seconds until market resolution.
   */
  min_time_to_resolution_secs?: number;
  /**
   * Minimum 24h volume in USD.
   */
  min_volume_24h_usd?: string;
}
/**
 * Capital, sizing, order, exit, reconciliation, and breaker policy.
 */
export interface ExecutionRiskPolicy {
  breaker?: ExecutionBreakerConfig;
  capital?: CapitalPolicy;
  entry_order_policy?: EntryOrderPolicy;
  exit_monitor?: ExitMonitorPolicy;
  portfolio?: PortfolioConfig;
  reconciliation?: ReconciliationPolicy;
  /**
   * A monotonic schema version for feature / factor / label / config schemas.
   *
   * Wrapping the version prevents accidentally mixing it with unrelated integers
   * (counts, ids, ordinals) and makes "which schema generated this row" explicit
   * in every signature. Versions are `>= 1` by convention; untrusted wire and DB
   * values are validated through [`SchemaVersion::try_new`].
   */
  schema_version?: number;
  settlement_redeem?: SettlementRedeemPolicy;
}
/**
 * Venue-dimension execution-breaker thresholds.
 *
 * Drives the stateful execution breaker that watches venue submit/cancel
 * outcomes and publishes a `VenueHealth` seam for admission `#18` while
 * auto-tripping the operational kill-switch on sustained failure. Transient
 * degradation defers (admission retries); sustained failure halts and latches
 * the kill-switch (`execution_halted`, operator ack required to clear).
 */
export interface ExecutionBreakerConfig {
  /**
   * Seconds of failure-free operation before `Degraded` self-recovers to `Healthy`.
   */
  cooldown_secs?: number;
  /**
   * Daily realized-loss cap in USD (UTC day). Cumulative same-day realized
   * loss `≥ 80%` of the cap degrades venue health (admission `#18` defers);
   * `≥` the cap trips the kill-switch (`execution_halted`, latched). `0`
   * disables the daily-realized-loss dimension.
   */
  daily_realized_loss_cap_usd?: string;
  /**
   * Consecutive venue failures that move the breaker to `Degraded` (admission defers).
   */
  venue_consecutive_failures_to_degrade?: number;
  /**
   * Consecutive venue failures that move the breaker to `Halted` and trip the kill-switch.
   */
  venue_consecutive_failures_to_halt?: number;
  /**
   * Rolling-window venue error rate (basis points) that trips `Halted`.
   */
  venue_error_rate_bps_to_halt?: number;
  /**
   * Minimum window samples before the error-rate gate is evaluated (avoids small-N trips).
   */
  venue_min_window_samples?: number;
  /**
   * Rolling observation window length in seconds.
   */
  venue_window_secs?: number;
}
/**
 * Capital policy for execution admission.
 *
 * Both caps gate order-intent admission (checks `#21` / `#22`). A value of
 * `0` **disables** that dimension (no cap) — matching the other opt-in USD
 * governance knobs. When `> 0` the cap is enforced hard (`Deny`).
 */
export interface CapitalPolicy {
  /**
   * Maximum number of concurrently open execution intents. `0` disables the
   * open-intent count cap. Enforced by admission `#21`.
   */
  max_open_intents?: number;
  /**
   * Maximum USD that may be reserved across all open execution intents.
   * `0` disables the reserved-capital cap. Enforced by admission `#22`.
   */
  max_reserved_usd?: string;
}
/**
 * Entry order policy for recommendations.
 */
export interface EntryOrderPolicy {
  /**
   * Maximum allowed entry-order slippage in basis points.
   */
  max_slippage_bps?: number;
  /**
   * Minimum visible book depth (USD) required at entry. Frozen onto every
   * recommendation's `EntryPlan.min_depth_usd` at report build and enforced
   * by execution admission (`LiquidityDepthCheck`): an intent is deferred
   * when the fillable ask notional up to the limit price is below this
   * floor. `0` disables the depth floor.
   */
  min_entry_book_depth_usd?: string;
}
/**
 * Exit-monitor cadence and re-inference policy.
 *
 * Price/time/trailing tiers run every `monitor_secs`; model re-inference runs
 * at most every `signal_recheck_secs` per lot. Invalidation thresholds are
 * frozen in the intent's published trade-policy artifact.
 */
export interface ExitMonitorPolicy {
  /**
   * Whether the exit-monitor worker actively evaluates open lots.
   */
  enabled?: boolean;
  /**
   * Seconds between exit-monitor scans (price / time / trailing cadence).
   */
  monitor_secs?: number;
  opportunistic_sell?: OpportunisticSellPolicy;
  /**
   * Minimum seconds between signal re-inference checks for one lot.
   */
  signal_recheck_secs?: number;
  signal_reinference?: ExitSignalReinferencePolicy;
}
/**
 * Opportunistic-Sell advisory scale-out.
 */
export interface OpportunisticSellPolicy {
  /**
   * Whether opportunistic-Sell evaluation is active at all.
   */
  enabled?: boolean;
  /**
   * When true, the scorer runs and is audited but never submits an exit
   * (fail-safe hold; SL/time/trailing/invalidation still apply).
   */
  shadow_mode?: boolean;
}
/**
 * Model-backed thesis-invalidation re-inference.
 */
export interface ExitSignalReinferencePolicy {
  /**
   * Whether model-backed signal re-inference is active.
   */
  enabled?: boolean;
  /**
   * When true, re-inference runs and is audited, but thesis-invalidation
   * exits are suppressed (fail-safe hold; SL/time/trailing still apply).
   */
  shadow_mode?: boolean;
}
/**
 * Portfolio policy: budget governance, exposure constraints, and sizing model.
 *
 * Policy limits only — never account state. Real equity and positions come
 * from the account snapshot, never from this configuration.
 */
export interface PortfolioConfig {
  budget?: PortfolioBudget;
  constraints?: PortfolioConstraints;
  kelly_safety?: KellySafetyConfig;
  optimizer?: PortfolioOptimizerConfig;
  sizing?: SizingModelConfig;
}
/**
 * Capital budget governance caps.
 */
export interface PortfolioBudget {
  /**
   * Maximum USD allocated to one recommendation.
   */
  max_single_recommendation_usd?: string;
  /**
   * Minimum useful recommendation size in USD.
   */
  min_recommendation_usd?: string;
  /**
   * Maximum deployable capital (governance cap, all modes).
   *
   * `equity = min(real net-liquidation value, total_budget_usd)`; this value
   * **never** stands in for equity itself.
   */
  total_budget_usd?: string;
}
/**
 * Exposure / liquidity constraints.
 */
export interface PortfolioConstraints {
  correlation?: CorrelationConfig;
  /**
   * Maximum fraction of visible liquidity an allocation may consume.
   */
  liquidity_usage_cap_pct?: string;
  /**
   * Maximum USD exposure per category.
   */
  max_category_exposure_usd?: string;
  /**
   * Maximum correlated exposure in USD.
   */
  max_correlated_exposure_usd?: string;
  /**
   * Maximum USD exposure per event.
   */
  max_event_exposure_usd?: string;
  /**
   * Maximum USD exposure per market.
   */
  max_market_exposure_usd?: string;
}
/**
 * Correlation-cluster estimation policy gating `max_correlated_exposure_usd`.
 */
export interface CorrelationConfig {
  /**
   * Absolute Pearson correlation at or above which two markets are clustered.
   */
  cluster_threshold?: string;
  /**
   * Whether the correlated-exposure cap is enforced. `false` ⇒ no clustering.
   */
  enabled?: boolean;
  /**
   * Historical mid-price lookback window for co-movement estimation, in days.
   */
  lookback_days?: number;
  /**
   * Minimum paired observations before historical estimation is trusted;
   * below this the estimator falls back to event/category proxy clusters.
   */
  min_observations?: number;
}
/**
 * Kelly safety-layer knobs (edge uncertainty, aggregate cap, binding threshold).
 */
export interface KellySafetyConfig {
  /**
   * Kelly-stage binding is emitted when the dominant shrink falls below this threshold.
   */
  binding_materiality_threshold?: string;
  /**
   * Floor on the edge-uncertainty shrink multiplier.
   */
  edge_uncertainty_floor?: string;
  /**
   * Edge-uncertainty shrink coefficient `k` in `shrink = clamp(1 − k·edge_std, floor, 1)`.
   */
  edge_uncertainty_k?: string;
  /**
   * Hard cap on total simultaneous portfolio exposure as a fraction of bankroll.
   */
  max_aggregate_exposure_pct?: string;
}
/**
 * Portfolio optimizer (`good_lp` LP/MILP) policy.
 */
export interface PortfolioOptimizerConfig {
  /**
   * `true` ⇒ solve the exact binary-inclusion MILP (production primary);
   * `false` ⇒ solve the continuous LP relaxation with deterministic integer
   * recovery (cheaper, fully deterministic — also the fallback / backtest mode).
   */
  integer_inclusion?: boolean;
  /**
   * `λ ≥ 0`: weight on normalized expected return in the per-dollar objective
   * weight `wᵢ = scoreᵢ · (1 + λ · ret_normᵢ)`. `0` ⇒ pure conviction weighting
   * (semantically equivalent to the former greedy fill order).
   */
  objective_return_weight?: string;
  /**
   * LP solver backend. `highs` requires the `lp-solver-highs` build feature;
   * when that feature is absent the planner transparently downgrades to
   * `microlp` (recorded in the plan's optimizer metadata).
   */
  solver?: 'highs' | 'microlp';
}
/**
 * Position-sizing model.
 */
export interface SizingModelConfig {
  /**
   * Confidence-driven shrinkage of the Kelly fraction (estimation
   * uncertainty): `confidence` high → near fractional Kelly, low → compressed.
   */
  confidence_weighting?: 'linear' | 'step';
  /**
   * Drawdown-driven scaling policy.
   */
  drawdown_scaling?: 'conservative' | 'fixed';
  /**
   * Fraction of full Kelly to apply, in `(0, 1]` (half-Kelly ≈ `0.5`).
   */
  kelly_fraction?: string;
  /**
   * Maximum single-position size as a fraction of equity (`(0, 1]`).
   */
  max_position_pct?: string;
}
/**
 * Execution reconciliation policy.
 */
export interface ReconciliationPolicy {
  /**
   * Whether execution reconciliation is enabled.
   */
  enabled?: boolean;
  /**
   * Reconciliation sweep interval in seconds.
   */
  interval_secs?: number;
  /**
   * Seconds an order may remain unreconciled (resting open, or unreadable at
   * the venue) before the worker forces a terminal resolution: a stale
   * resting order is actively cancelled, an unreadable order is escalated to
   * `Unresolvable`. Bounds how long capital can stay in-flight.
   */
  stale_open_secs?: number;
}
/**
 * On-chain settlement redemption worker policy.
 */
export interface SettlementRedeemPolicy {
  /**
   * Whether automatic redeem may sign new transactions in emergency halt.
   */
  allow_during_emergency?: boolean;
  /**
   * Maximum condition-level redeem batches processed per sweep.
   */
  batch_size?: number;
  /**
   * Polygon confirmations required before closing the strategy lots.
   */
  confirmation_blocks?: number;
  /**
   * Whether the worker may submit standard CTF redeem transactions.
   */
  enabled?: boolean;
  /**
   * Sweep interval in seconds.
   */
  interval_secs?: number;
  /**
   * Maximum failed submit/confirm attempts before manual escalation.
   */
  max_attempts?: number;
  /**
   * Base retry backoff in seconds.
   */
  retry_backoff_secs?: number;
}
/**
 * Active, shadow, and exit artifact routing.
 */
export interface ModelRouting {
  model?: ModelConfig;
  /**
   * A monotonic schema version for feature / factor / label / config schemas.
   *
   * Wrapping the version prevents accidentally mixing it with unrelated integers
   * (counts, ids, ordinals) and makes "which schema generated this row" explicit
   * in every signature. Versions are `>= 1` by convention; untrusted wire and DB
   * values are validated through [`SchemaVersion::try_new`].
   */
  schema_version?: number;
}
/**
 * Active and shadow model references.
 */
export interface ModelConfig {
  /**
   * Active published Sell-side hold-vs-exit scorer version. The
   * opportunistic-Sell exit evaluator loads this; a distinct pointer from
   * `active_model_version_id` so Buy and Sell models are governed separately.
   */
  active_exit_model_version_id?: ModelVersionRef | null;
  /**
   * Active published model version id.
   */
  active_model_version_id?: ModelVersionRef | null;
  calibration?: ModelCalibrationConfig;
  /**
   * Minimum candidate score to enter portfolio pruning.
   */
  candidate_score_floor?: string;
  /**
   * Category-specific Buy-side model pointers (`ModelRouting`).
   *
   * A market whose category has a pointer here scores through that artifact
   * (which may consume the category's domain slice); only categories without
   * a pointer use the generic `active_model_version_id`. A configured route
   * that cannot load, validate its exact scope, or infer fails the entire
   * report round. Governed exactly like the active/shadow pointers.
   */
  category_model_pointers?: {
    crypto?: ModelVersionRef;
    culture?: ModelVersionRef;
    economics?: ModelVersionRef;
    finance?: ModelVersionRef;
    geopolitics?: ModelVersionRef;
    other?: ModelVersionRef;
    politics?: ModelVersionRef;
    sports?: ModelVersionRef;
    tech?: ModelVersionRef;
    weather?: ModelVersionRef;
  };
  /**
   * Minimum model confidence.
   */
  min_model_confidence?: string;
  /**
   * Maximum age of a quality-gate report before model load is denied.
   * Consumed by governance (`ModelQualityGate` / load-time deny), not by
   * the `ModelRunner` inference path.
   */
  min_quality_gate_age_secs?: number;
  /**
   * Shadow/live diff threshold.
   */
  shadow_diff_threshold?: string;
  /**
   * Shadow model version id.
   */
  shadow_model_version_id?: ModelVersionRef | null;
}
/**
 * Model-score probability-calibrator fit policy.
 */
export interface ModelCalibrationConfig {
  /**
   * Two-sided confidence level for reliability-bin Wilson intervals.
   */
  ci_confidence?: string;
  /**
   * Minimum embargo gap (seconds) between a model's training-dataset window
   * and its calibration-dataset window.
   */
  embargo_secs?: number;
  /**
   * Default calibrator fitting method (`isotonic` or `platt`).
   */
  method?: 'isotonic' | 'platt';
  /**
   * Minimum samples required to select isotonic (below ⇒ fit must use Platt).
   */
  min_samples_isotonic?: number;
}
/**
 * Durable report schedule resource, isolated from report decision semantics.
 */
export interface ReportSchedule {
  schedules?: ReportScheduleConfig[];
  /**
   * A monotonic schema version for feature / factor / label / config schemas.
   *
   * Wrapping the version prevents accidentally mixing it with unrelated integers
   * (counts, ids, ordinals) and makes "which schema generated this row" explicit
   * in every signature. Versions are `>= 1` by convention; untrusted wire and DB
   * values are validated through [`SchemaVersion::try_new`].
   */
  schema_version?: number;
}
/**
 * One report schedule.
 */
export interface ReportScheduleConfig {
  /**
   * How often this schedule fires (fixed interval or cron).
   */
  cadence?:
    | {
        /**
         * 6-field cron expression.
         */
        expr: string;
        kind: 'cron';
        /**
         * Optional IANA timezone (e.g. `America/New_York`).
         */
        timezone?: null | string;
      }
    | {
        /**
         * Interval between fires, in seconds.
         */
        interval_secs: number;
        kind: 'interval';
      };
  /**
   * Whether this schedule is enabled.
   */
  enabled?: boolean;
  /**
   * Global knowledge lag in seconds.
   */
  knowledge_lag_secs?: number;
  /**
   * Stable schedule id.
   */
  schedule_id?: string;
  /**
   * `TopN` size for this schedule.
   */
  top_n?: number;
}
/**
 * Immediate operational admission controls and notification routing.
 */
export interface OperationalControl {
  attribution?: AttributionPolicy;
  entry_condition?: EntryConditionWorkerConfig;
  kill_switch?: KillSwitchPolicy;
  notifications?: NotificationPolicies;
  /**
   * A monotonic schema version for feature / factor / label / config schemas.
   *
   * Wrapping the version prevents accidentally mixing it with unrelated integers
   * (counts, ids, ordinals) and makes "which schema generated this row" explicit
   * in every signature. Versions are `>= 1` by convention; untrusted wire and DB
   * values are validated through [`SchemaVersion::try_new`].
   */
  schema_version?: number;
}
export interface AttributionPolicy {
  /**
   * Maximum terminal recommendation/intent candidates processed per sweep.
   */
  batch_size?: number;
  /**
   * Whether the final recommendation-attribution worker is enabled.
   */
  enabled?: boolean;
  /**
   * Attribution sweep interval in seconds.
   */
  sweep_secs?: number;
}
/**
 * Durable condition evaluator cadence, lease, and bounded-pass policy.
 */
export interface EntryConditionWorkerConfig {
  /**
   * Millisecond cadence of the safety backstop scan. Source notifications,
   * book wakes, and clock deadlines remain the primary wake paths.
   */
  backstop_interval_ms?: number;
  /**
   * Maximum number of expired instances transitioned in one expiry sweep.
   */
  expiry_batch_limit?: number;
  /**
   * Duration in seconds of an exclusive instance-processing lease.
   */
  lease_duration_secs?: number;
  /**
   * Renewal cadence in seconds for a held lease; must remain shorter than
   * the lease duration so takeover is explicit and auditable.
   */
  lease_renew_interval_secs?: number;
  /**
   * Milliseconds before a still-active instance becomes eligible for its
   * next scheduled evaluation after one worker pass.
   */
  next_evaluation_delay_ms?: number;
  /**
   * Maximum number of due condition instances evaluated in one worker pass.
   */
  pass_limit?: number;
}
/**
 * Execution kill-switch default policy.
 *
 * Operational state lives in the `system_kill_switch` singleton. Runtime
 * config only carries the policy to apply when that state escalates.
 */
export interface KillSwitchPolicy {
  emergency_exit?: EmergencyExitPolicy;
}
/**
 * Emergency-exit behavior for kill-switch escalation.
 */
export interface EmergencyExitPolicy {
  /**
   * Emergency-exit behavior.
   */
  kind?: 'liquidate_all' | 'manual_only';
  /**
   * Maximum slippage for automated emergency liquidation, in basis points.
   */
  max_slippage_bps?: number;
}
/**
 * Notification routing policy flags.
 */
export interface NotificationPolicies {
  /**
   * Notify operators when a recommendation report is published.
   */
  report_published?: boolean;
}
/**
 * Explicit authorization for semi-automatic and automatic execution.
 */
export interface ExecutionAuthorization {
  auto_execution?: AutoExecutionConfig;
  /**
   * A monotonic schema version for feature / factor / label / config schemas.
   *
   * Wrapping the version prevents accidentally mixing it with unrelated integers
   * (counts, ids, ordinals) and makes "which schema generated this row" explicit
   * in every signature. Versions are `>= 1` by convention; untrusted wire and DB
   * values are validated through [`SchemaVersion::try_new`].
   */
  schema_version?: number;
  semi_auto?: SemiAutoConfig;
}
/**
 * Auto-execution policy.
 */
export interface AutoExecutionConfig {
  /**
   * Whether auto-execution policy may approve intents.
   */
  enabled?: boolean;
  /**
   * Maximum orders auto-created per report.
   */
  max_orders_per_report?: number;
  /**
   * Maximum total USD auto-executed per report.
   */
  max_total_usd_per_report?: string;
  /**
   * Minimum confidence for auto-execution.
   */
  min_confidence?: string;
  /**
   * Minimum score for auto-execution.
   */
  min_score?: string;
}
/**
 * Semi-auto approval policy.
 */
export interface SemiAutoConfig {
  /**
   * Approval time-to-live in seconds.
   */
  approval_ttl_secs?: number;
  canary?: SemiAutoCanaryConfig;
}
/**
 * Policy-bound, fail-closed production canary limits.
 */
export interface SemiAutoCanaryConfig {
  /**
   * Exact validated total cash-budget tiers admitted by this canary (v14: only `$25`).
   */
  allowed_cash_budget_tiers_usd?: DecimalValue[];
  /**
   * Whether this exact policy-bound authorization admits new `SemiAuto` intents.
   */
  enabled?: boolean;
  /**
   * RFC3339 authorization deadline; intents may not outlive this instant.
   */
  expires_at?: null | string;
  /**
   * Transactional global cap on capital-holding or in-flight intents.
   */
  max_open_intents?: number;
  /**
   * Validated decimal value serialized as a JSON string without losing precision.
   */
  max_total_cash_per_report?: string;
  /**
   * Content-addressed Published trade-policy artifact id authorized to run.
   */
  policy_artifact_id?: null | string;
  /**
   * Canonical content hash that must match the authorized policy artifact.
   */
  policy_content_hash?: null | string;
}
/**
 * Typed validation evidence persisted with a validated policy revision.
 */
export interface PolicyValidationEvidence {
  issues?: PolicyValidationIssue[];
  preflight?: PolicyPreflightResult[];
  /**
   * Exact active bundle against which this revision was validated.
   */
  subject?: null | PolicyValidationSubject;
}
/**
 * One stable, machine-readable validation diagnostic.
 */
export interface PolicyValidationIssue {
  code: PolicyValidationCode;
  message: string;
  /**
   * Canonical field path. A path is data, not a categorical state, so a
   * validated string is the correct representation.
   */
  path: string;
  severity: PolicyValidationSeverity;
}
/**
 * One dependency or consumer preflight result.
 */
export interface PolicyPreflightResult {
  check: PolicyPreflightCheckKind;
  detail_code: PolicyPreflightDetailCode;
  /**
   * Optional machine-produced diagnostic for a failed dependency. Stable
   * success and skip explanations are represented by `detail_code`.
   */
  failure_detail?: null | string;
  outcome: CheckOutcome;
}
/**
 * Immutable subject bound to typed validation, preflight and approval.
 */
export interface PolicyValidationSubject {
  base_generation: number;
  base_revision_vector: PolicyRevisionBundle;
  candidate_bundle_hash: string;
}
/**
 * Revision identities frozen at a decision boundary.
 */
export interface PolicyRevisionBundle {
  execution_authorization?: null | string;
  execution_risk_policy?: null | string;
  model_routing?: null | string;
  operational_control?: null | string;
  recommendation_policy?: null | string;
  report_schedule?: null | string;
}
/**
 * Immutable approval record exposed by the Config API.
 */
export interface PolicyApprovalView {
  created_at: string;
  decided_at: string;
  decided_by: PolicyActorView;
  decision: PolicyApprovalDecision;
  expires_at?: null | string;
  policy_approval_id: string;
  policy_revision_id: string;
  reason: string;
  resource_kind: ConfigResourceKind;
  revision_hash: string;
  validation_subject?: null | PolicyValidationSubject;
}
export interface ApprovePolicyDraftRequest {
  decision: PolicyApprovalDecision;
  expires_at?: null | string;
  reason: string;
}
export interface CreatePolicyDraftRequest {
  document: PolicyDocument;
  reason: string;
}
export interface CurrentPolicyResourceView {
  activation?: null | PolicyActivationView;
  resource: ConfigResourceKind;
  revision?: null | PolicyRevisionView;
}
export interface DeploymentConfigView {
  credential_health: CredentialHealthView[];
  environment: string;
  restart_required: boolean;
  snapshot: DeploymentConfigSnapshotView;
}
export interface CredentialHealthView {
  credential: CredentialKind;
  status: CredentialHealthStatus;
}
export interface DeploymentConfigSnapshotView {
  endpoints: DeploymentEndpointView[];
  identity: DeploymentIdentityView;
  resource_budgets: DeploymentResourceBudgetView[];
}
export interface DeploymentEndpointView {
  /**
   * Redacted or non-secret endpoint suitable for operator display.
   */
  address: string;
  kind: DeploymentEndpointKind;
}
export interface DeploymentIdentityView {
  deployment_id: string;
  instance_id: string;
}
export interface DeploymentResourceBudgetView {
  kind: ResourceBudgetKind;
  limits: DeploymentResourceLimitView[];
}
export interface DeploymentResourceLimitView {
  metric: ResourceBudgetMetric;
  unit: ResourceBudgetUnit;
  value: number;
}
export interface LifecycleView {
  active_policy_bundle_hash?: null | string;
  baseline: LifecycleBaseline;
  build_commit?: null | string;
  checks: LifecycleCheckView[];
  clickhouse_schema_fingerprint?: null | string;
  environment: string;
  postgres_schema_fingerprint?: null | string;
  production_baseline?: null | ProductionBaselineView;
  required_confirmation_phrase?: null | string;
  state: ProjectLifecycleState;
}
export interface LifecycleCheckView {
  detail: LifecycleCheckDetail;
  kind: LifecycleCheckKind;
  outcome: CheckOutcome;
}
/**
 * Append-only production baseline exposed by the lifecycle endpoint.
 */
export interface ProductionBaselineView {
  build_commit: string;
  clickhouse_schema_fingerprint: string;
  created_at: string;
  decision_policy_snapshot_id: string;
  environment: string;
  evidence: ProductionSealEvidence;
  lifecycle_policy_hash: string;
  policy_bundle_generation: number;
  policy_bundle_hash: string;
  postgres_schema_fingerprint: string;
  production_baseline_id: string;
  sealed_at: string;
  sealed_by: PolicyActorView;
}
/**
 * Evidence persisted with the production baseline. The physical column is
 * JSONB because this is an immutable aggregate, while `SeaORM` exposes the
 * strongly typed structure end to end.
 */
export interface ProductionSealEvidence {
  backup_evidence_hash?: null | string;
  checks?: ProductionSealCheck[];
  config_e2e_evidence_hash?: null | string;
}
/**
 * One typed item in the irreversible production-seal evidence bundle.
 */
export interface ProductionSealCheck {
  checked_at: string;
  detail: LifecycleCheckDetail;
  kind: LifecycleCheckKind;
  outcome: CheckOutcome;
}
export interface PolicyResourceSchemaView {
  consumers: PolicyConsumer[];
  effective_boundary: PolicyApplyBoundary;
  json_schema: unknown;
  kind: ConfigResourceKind;
  schema_version: SchemaVersion;
}
export interface ConfigResourcesView {
  active_bundle_generation: number;
  active_policy_bundle_hash?: null | string;
  active_snapshot_id?: null | string;
  resources: ConfigResourceSummaryView[];
}
export interface ConfigResourceSummaryView {
  active_revision_hash?: null | string;
  active_revision_id?: null | string;
  effective_boundary: PolicyApplyBoundary;
  kind: ConfigResourceKind;
  last_activated_at?: null | string;
  pending_approval_count: number;
  restart_required: boolean;
  schema_version: SchemaVersion;
}
export interface SchedulePreviewRequest {
  cadence: ScheduleCadence;
  count?: number;
}
export interface SchedulePreviewView {
  next_fire_times: string[];
}
export interface SealProductionRequest {
  confirmation_phrase: string;
  environment: string;
  reason: string;
}
export interface ConfigSnapshotOptionsQuery {
  limit?: null | number;
}
export interface DecisionPolicySnapshotOptionView {
  bundle_generation: number;
  created_at: string;
  decision_policy_snapshot_id: string;
  revision_vector: PolicyRevisionBundle;
  snapshot_hash: string;
  source: DecisionPolicySnapshotSource;
}
export interface ValidatePolicyDraftRequest {
  reason: string;
}
export interface PolicyValidationView {
  affected_consumers: PolicyConsumer[];
  effective_boundary: PolicyApplyBoundary;
  policy_revision_id: string;
  preflight_expires_at?: null | string;
  preflight_token?: null | string;
  resource_kind: ConfigResourceKind;
  valid: boolean;
  validation_evidence: PolicyValidationEvidence;
}
