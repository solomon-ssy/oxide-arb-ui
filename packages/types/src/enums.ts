/**
 * Wire values mirror Rust `pg_enum!` / `wire_enum!` serde output.
 *
 * Each enum is an `as const` object (runtime values) plus a derived union type.
 * Object keys are camelCase; wire values stay snake_case (or CLOB UPPERCASE for
 * `Side`). Prefer importing the const object when comparing or iterating.
 */

/** Derive the wire-value union from a string enum object. */
export type WireEnum<T extends Record<string, string>> = T[keyof T];

// ── Auth / RBAC ─────────────────────────────────────────────────────────────

export const USER_STATUSES = {
  active: 'active',
  disabled: 'disabled',
} as const;

export type UserStatus = WireEnum<typeof USER_STATUSES>;

export const ROLE_STATUSES = {
  disabled: 'disabled',
  enabled: 'enabled',
} as const;

export type RoleStatus = WireEnum<typeof ROLE_STATUSES>;

export const ROLE_KINDS = {
  builtin: 'builtin',
  custom: 'custom',
} as const;

export type RoleKind = WireEnum<typeof ROLE_KINDS>;

export const MENU_KINDS = {
  button: 'button',
  directory: 'directory',
  menu: 'menu',
} as const;

export type MenuKind = WireEnum<typeof MENU_KINDS>;

/** Authoritative RBAC resource catalog (mirrors Rust `ResourceType`). */
export const RESOURCE_TYPES = {
  accountSnapshot: 'account_snapshot',
  equitySnapshot: 'equity_snapshot',
  executionOrder: 'execution_order',
  factorDefinition: 'factor_definition',
  market: 'market',
  materialization: 'materialization',
  menu: 'menu',
  operationLog: 'operation_log',
  orderIntent: 'order_intent',
  permission: 'permission',
  position: 'position',
  publication: 'publication',
  quantReport: 'quant_report',
  reconciliation: 'reconciliation',
  replay: 'replay',
  role: 'role',
  config: 'config',
  settlementRedeem: 'settlement_redeem',
  system: 'system',
  user: 'user',
} as const;

export type ResourceType = WireEnum<typeof RESOURCE_TYPES>;

export const EXECUTION_WALLET_KINDS = {
  depositWallet: 'deposit_wallet',
  eoa: 'eoa',
  gnosisSafe: 'gnosis_safe',
  proxy: 'proxy',
} as const;

export type ExecutionWalletKind = WireEnum<typeof EXECUTION_WALLET_KINDS>;

/** Authoritative RBAC operation verbs (mirrors Rust `Operation`). */
export const OPERATIONS = {
  activate: 'activate',
  approve: 'approve',
  assign: 'assign',
  cancel: 'cancel',
  create: 'create',
  delete: 'delete',
  emergency: 'emergency',
  enqueue: 'enqueue',
  halt: 'halt',
  publish: 'publish',
  read: 'read',
  reject: 'reject',
  resolve: 'resolve',
  resume: 'resume',
  retire: 'retire',
  revoke: 'revoke',
  rollback: 'rollback',
  submit: 'submit',
  switchMode: 'switch_mode',
  update: 'update',
} as const;

export type Operation = WireEnum<typeof OPERATIONS>;

// ── Runtime governance ──────────────────────────────────────────────────────

/** Quant runtime mode — the only runtime-mode axis (no dry-run/paper/live). */
export const QUANT_RUNTIME_MODES = {
  autoExecution: 'auto_execution',
  reportOnly: 'report_only',
  semiAuto: 'semi_auto',
} as const;

export type QuantRuntimeMode = WireEnum<typeof QUANT_RUNTIME_MODES>;

export const QUANT_RUNTIME_MODE_OPTIONS: readonly QuantRuntimeMode[] = [
  QUANT_RUNTIME_MODES.reportOnly,
  QUANT_RUNTIME_MODES.semiAuto,
  QUANT_RUNTIME_MODES.autoExecution,
];

/** Operational kill-switch state (mirrors Rust `KillSwitchState`). */
export const KILL_SWITCH_STATES = {
  closed: 'closed',
  emergencyHalted: 'emergency_halted',
  executionHalted: 'execution_halted',
  exitOnly: 'exit_only',
} as const;

export type KillSwitchState = WireEnum<typeof KILL_SWITCH_STATES>;

/** Runtime authority for creating new settlement writes. */
export const SETTLEMENT_WRITE_POLICIES = {
  auto: 'auto',
  disabled: 'disabled',
  governedCanary: 'governed_canary',
  semiAuto: 'semi_auto',
} as const;

export type SettlementWritePolicy = WireEnum<typeof SETTLEMENT_WRITE_POLICIES>;

/** Ordered operator recovery step (mirrors Rust `ExecutionRecoveryStep`). */
export const EXECUTION_RECOVERY_STEPS = {
  acknowledgeKillSwitch: 'acknowledge_kill_switch',
  resolveUnresolvableReconciliations: 'resolve_unresolvable_reconciliations',
  verifyModePreflight: 'verify_mode_preflight',
} as const;

export type ExecutionRecoveryStep = WireEnum<typeof EXECUTION_RECOVERY_STEPS>;

// ── Alerts ──────────────────────────────────────────────────────────────────

/** Operational alert severity, lowest → highest. */
export const ALERT_LEVELS = {
  critical: 'critical',
  emergency: 'emergency',
  info: 'info',
  warning: 'warning',
} as const;

export type AlertLevel = WireEnum<typeof ALERT_LEVELS>;

export const ALERT_CATEGORIES = {
  infrastructure: 'infrastructure',
  operatorNotice: 'operator_notice',
  schedulerHealth: 'scheduler_health',
  tradingSafety: 'trading_safety',
} as const;

export type AlertCategory = WireEnum<typeof ALERT_CATEGORIES>;

export const ALERT_SOURCES = {
  dataPipeline: 'data_pipeline',
  execution: 'execution',
  healthChecker: 'health_checker',
  reportGenerator: 'report_generator',
  riskEngine: 'risk_engine',
  scheduler: 'scheduler',
  settlement: 'settlement',
  system: 'system',
} as const;

export type AlertSource = WireEnum<typeof ALERT_SOURCES>;

/** Alert severities that degrade the header status light (warning and above). */
export const DEGRADED_ALERT_LEVELS: ReadonlySet<AlertLevel> = new Set([
  ALERT_LEVELS.critical,
  ALERT_LEVELS.emergency,
  ALERT_LEVELS.warning,
]);

// ── Market domain ───────────────────────────────────────────────────────────

/** Order side — the one UPPERCASE wire enum (Polymarket CLOB convention). */
export const SIDES = {
  buy: 'BUY',
  sell: 'SELL',
} as const;

export type Side = WireEnum<typeof SIDES>;

/** Recommendation / position outcome side (YES / NO token). */
export const OUTCOME_SIDES = {
  no: 'no',
  yes: 'yes',
} as const;

export type OutcomeSide = WireEnum<typeof OUTCOME_SIDES>;

/** Polymarket event category for fee lookup and scoring. */
export const MARKET_CATEGORIES = {
  crypto: 'crypto',
  culture: 'culture',
  economics: 'economics',
  finance: 'finance',
  geopolitics: 'geopolitics',
  other: 'other',
  politics: 'politics',
  sports: 'sports',
  tech: 'tech',
  weather: 'weather',
} as const;

export type MarketCategory = WireEnum<typeof MARKET_CATEGORIES>;

/** Market lifecycle state in the local registry. */
export const MARKET_STATUSES = {
  active: 'active',
  delisted: 'delisted',
  discovered: 'discovered',
  filtered: 'filtered',
  manuallyBlocked: 'manually_blocked',
  paused: 'paused',
  settled: 'settled',
} as const;

export type MarketStatus = WireEnum<typeof MARKET_STATUSES>;

/** Minimum price increment of a CLOB market (wire value is the literal step). */
export const TICK_SIZES = {
  hundredth: '0.01',
  tenThousandth: '0.0001',
  tenth: '0.1',
  thousandth: '0.001',
} as const;

export type TickSize = WireEnum<typeof TICK_SIZES>;

// ── Report plane ────────────────────────────────────────────────────────────

export const REPORT_KINDS = {
  postRunAudit: 'post_run_audit',
  shadowTopN: 'shadow_top_n',
  topN: 'top_n',
} as const;

export type ReportKind = WireEnum<typeof REPORT_KINDS>;

export const REPORT_TRIGGER_KINDS = {
  adHoc: 'ad_hoc',
  scheduled: 'scheduled',
} as const;

export type ReportTriggerKind = WireEnum<typeof REPORT_TRIGGER_KINDS>;

export const RECOMMENDATION_REPORT_STATUSES = {
  expired: 'expired',
  obsolete: 'obsolete',
  prepared: 'prepared',
  published: 'published',
  revoked: 'revoked',
  superseded: 'superseded',
} as const;

export type RecommendationReportStatus = WireEnum<
  typeof RECOMMENDATION_REPORT_STATUSES
>;

export const REPORT_FACT_DELIVERY_STATUSES = {
  cancelled: 'cancelled',
  delivering: 'delivering',
  failed: 'failed',
  pending: 'pending',
  retrying: 'retrying',
  verified: 'verified',
} as const;

export type ReportFactDeliveryStatus = WireEnum<
  typeof REPORT_FACT_DELIVERY_STATUSES
>;

export const RECOMMENDATION_STATUSES = {
  executed: 'executed',
  expired: 'expired',
  intentCreated: 'intent_created',
  obsolete: 'obsolete',
  prepared: 'prepared',
  published: 'published',
  revoked: 'revoked',
  superseded: 'superseded',
} as const;

export type RecommendationStatus = WireEnum<typeof RECOMMENDATION_STATUSES>;

export const REPORT_RUN_STATUSES = {
  abandoned: 'abandoned',
  failed: 'failed',
  queued: 'queued',
  running: 'running',
  skipped: 'skipped',
  succeeded: 'succeeded',
} as const;

export type ReportRunStatus = WireEnum<typeof REPORT_RUN_STATUSES>;

export const REPORT_RUN_TERMINAL_REASONS = {
  buildFailed: 'build_failed',
  coalescedByNewerOccurrence: 'coalesced_by_newer_occurrence',
  leaseExpired: 'lease_expired',
  queueExpired: 'queue_expired',
  scheduleReconfigured: 'schedule_reconfigured',
} as const;

export type ReportRunTerminalReason = WireEnum<
  typeof REPORT_RUN_TERMINAL_REASONS
>;

export const REPORT_SCHEDULE_GAP_REASONS = {
  coalescedByNewerOccurrence: 'coalesced_by_newer_occurrence',
  restartCoalesced: 'restart_coalesced',
  scheduleReconfigured: 'schedule_reconfigured',
} as const;

export type ReportScheduleGapReason = WireEnum<
  typeof REPORT_SCHEDULE_GAP_REASONS
>;

export const ACCOUNT_SOURCES = {
  polymarket: 'polymarket',
} as const;

export type AccountSource = WireEnum<typeof ACCOUNT_SOURCES>;

// ── Recommendation scoring ──────────────────────────────────────────────────

export const PRICE_COMPARISONS = {
  atOrAbove: 'at_or_above',
  atOrBelow: 'at_or_below',
} as const;
export type PriceComparison = WireEnum<typeof PRICE_COMPARISONS>;

export const FILL_REQUIREMENTS = {
  allOrNothing: 'all_or_nothing',
  allowPartial: 'allow_partial',
} as const;
export type FillRequirement = WireEnum<typeof FILL_REQUIREMENTS>;

/** Signed direction a factor pushed the composite score. */
export const FACTOR_DIRECTIONS = {
  negative: 'negative',
  neutral: 'neutral',
  positive: 'positive',
} as const;

export type FactorDirection = WireEnum<typeof FACTOR_DIRECTIONS>;

/** Cross-sectional normalization method a factor is mapped through. */
export const FACTOR_NORMALIZATIONS = {
  minMax: 'min_max',
  rank: 'rank',
  winsorizedZscore: 'winsorized_zscore',
} as const;

export type FactorNormalization = WireEnum<typeof FACTOR_NORMALIZATIONS>;

/** How a factor's normalized score was derived. */
export const NORMALIZATION_SOURCES = {
  crossSection: 'cross_section',
  frozenReferenceQuantile: 'frozen_reference_quantile',
  perMarket: 'per_market',
} as const;

export type NormalizationSource = WireEnum<typeof NORMALIZATION_SOURCES>;

/** Why a factor produced no normalized score (never a silent neutral). */
export const FACTOR_INDETERMINATE_REASONS = {
  crossSectionTooSmall: 'cross_section_too_small',
  legBookMissing: 'leg_book_missing',
  noFrozenReference: 'no_frozen_reference',
  zeroVariance: 'zero_variance',
} as const;

export type FactorIndeterminateReason = WireEnum<
  typeof FACTOR_INDETERMINATE_REASONS
>;

/** Authoritative persisted outcome state for a factor value. */
export const FACTOR_VALUE_STATES = {
  scored: 'scored',
  missingInput: 'missing_input',
  notApplicable: 'not_applicable',
  indeterminate: 'indeterminate',
} as const;

export type FactorValueState = WireEnum<typeof FACTOR_VALUE_STATES>;

/** Why a recommendation is ineligible for execution in a given mode. */
export const INELIGIBILITY_REASONS = {
  automationCapExceeded: 'automation_cap_exceeded',
  reportOnlyMode: 'report_only_mode',
} as const;

export type IneligibilityReason = WireEnum<typeof INELIGIBILITY_REASONS>;

/** Why a report could not publish any recommendation (empty report). */
export const EMPTY_REPORT_REASONS = {
  availableCashExhausted: 'available_cash_exhausted',
  emptySelection: 'empty_selection',
  insufficientDataQuality: 'insufficient_data_quality',
  noPositiveSignal: 'no_positive_signal',
  portfolioBudgetExhausted: 'portfolio_budget_exhausted',
} as const;

export type EmptyReportReason = WireEnum<typeof EMPTY_REPORT_REASONS>;

// ── Execution plane ─────────────────────────────────────────────────────────

export const ORDER_INTENT_STATUSES = {
  admissionPending: 'admission_pending',
  admissionRejected: 'admission_rejected',
  approved: 'approved',
  approvedByPolicy: 'approved_by_policy',
  cancelled: 'cancelled',
  draft: 'draft',
  expired: 'expired',
  failed: 'failed',
  filled: 'filled',
  invalidated: 'invalidated',
  partiallyFilled: 'partially_filled',
  pendingApproval: 'pending_approval',
  rejected: 'rejected',
  submitted: 'submitted',
} as const;

export type OrderIntentStatus = WireEnum<typeof ORDER_INTENT_STATUSES>;

export const APPROVAL_STATUSES = {
  approved: 'approved',
  expired: 'expired',
  notRequired: 'not_required',
  pending: 'pending',
  rejected: 'rejected',
} as const;

export type ApprovalStatus = WireEnum<typeof APPROVAL_STATUSES>;

export const ORDER_INTENT_KINDS = {
  buy: 'buy',
} as const;

export type OrderIntentKind = WireEnum<typeof ORDER_INTENT_KINDS>;

export const EXECUTION_ORDER_STATES = {
  accepted: 'accepted',
  ambiguous: 'ambiguous',
  cancelled: 'cancelled',
  cancelRequested: 'cancel_requested',
  failed: 'failed',
  filled: 'filled',
  partiallyFilled: 'partially_filled',
  planned: 'planned',
  submitted: 'submitted',
} as const;

export type ExecutionOrderState = WireEnum<typeof EXECUTION_ORDER_STATES>;

export const EXECUTION_ORDER_PHASES = {
  entry: 'entry',
  exit: 'exit',
} as const;

export type ExecutionOrderPhase = WireEnum<typeof EXECUTION_ORDER_PHASES>;

export const ORDER_TYPE_KINDS = {
  fok: 'fok',
  gtc: 'gtc',
  gtd: 'gtd',
} as const;

export type OrderTypeKind = WireEnum<typeof ORDER_TYPE_KINDS>;

/** Whether an exit lot leaves the book early or holds through resolution. */
export const EXIT_SETTLEMENT_MODES = {
  exitBeforeResolution: 'exit_before_resolution',
  holdToResolution: 'hold_to_resolution',
} as const;

export type ExitSettlementMode = WireEnum<typeof EXIT_SETTLEMENT_MODES>;

/** Whether a resolved hold-to-resolution lot is redeemed automatically. */
export const REDEEM_POLICIES = {
  auto: 'auto',
  manual: 'manual',
} as const;

export type RedeemPolicy = WireEnum<typeof REDEEM_POLICIES>;

export const EXIT_REASONS = {
  dataStale: 'data_stale',
  killSwitchEmergency: 'kill_switch_emergency',
  manual: 'manual',
  marketAbnormal: 'market_abnormal',
  opportunistic: 'opportunistic',
  partialExit: 'partial_exit',
  resolutionRedeem: 'resolution_redeem',
  riskEnvelopeBreached: 'risk_envelope_breached',
  settlementHold: 'settlement_hold',
  signalInvalidated: 'signal_invalidated',
  stopLoss: 'stop_loss',
  takeProfit: 'take_profit',
  timeExit: 'time_exit',
} as const;
export type ExitReason = WireEnum<typeof EXIT_REASONS>;

export const EXIT_STATES = {
  exited: 'exited',
  failed: 'failed',
  manualRequired: 'manual_required',
  monitoring: 'monitoring',
  notStarted: 'not_started',
  orderSubmitted: 'order_submitted',
  partiallyExited: 'partially_exited',
  triggered: 'triggered',
} as const;
export type ExitState = WireEnum<typeof EXIT_STATES>;

export const POSITION_LEDGER_STATES = {
  closed: 'closed',
  closing: 'closing',
  open: 'open',
  settled: 'settled',
} as const;

export type PositionLedgerState = WireEnum<typeof POSITION_LEDGER_STATES>;

export const POSITION_PLANES = {
  systemLot: 'system_lot',
} as const;

export type PositionPlane = WireEnum<typeof POSITION_PLANES>;

export const RECONCILIATION_RESULTS = {
  cancelled: 'cancelled',
  filled: 'filled',
  notFilled: 'not_filled',
  partiallyFilled: 'partially_filled',
  pending: 'pending',
  unresolvable: 'unresolvable',
} as const;

export type ReconciliationResult = WireEnum<typeof RECONCILIATION_RESULTS>;

/** Provenance of one entry in a reconciliation evidence chain. */
export const RECONCILIATION_EVIDENCE_KINDS = {
  accountBalanceDelta: 'account_balance_delta',
  bookContext: 'book_context',
  clobOrderStatus: 'clob_order_status',
  clobTrades: 'clob_trades',
  operatorNote: 'operator_note',
  tokenBalanceDelta: 'token_balance_delta',
} as const;

export type ReconciliationEvidenceKind = WireEnum<
  typeof RECONCILIATION_EVIDENCE_KINDS
>;

export const SETTLEMENT_CASE_STATES = {
  confirmed: 'confirmed',
  discovered: 'discovered',
  manualRequired: 'manual_required',
  prepared: 'prepared',
  reconciliationRequired: 'reconciliation_required',
  retryScheduled: 'retry_scheduled',
  submitted: 'submitted',
} as const;

export type SettlementCaseState = WireEnum<typeof SETTLEMENT_CASE_STATES>;

export const SETTLEMENT_EFFECTIVE_POLICIES = {
  automaticEligible: 'automatic_eligible',
  manualOnly: 'manual_only',
} as const;

export type SettlementEffectivePolicy = WireEnum<
  typeof SETTLEMENT_EFFECTIVE_POLICIES
>;

export const SETTLEMENT_ROUTES = {
  negRiskV2: 'neg_risk_v2',
  standardV2: 'standard_v2',
} as const;

export type SettlementRoute = WireEnum<typeof SETTLEMENT_ROUTES>;

export const SETTLEMENT_READINESS_STATUSES = {
  blocked: 'blocked',
  ready: 'ready',
  unchecked: 'unchecked',
} as const;

export type SettlementReadinessStatus = WireEnum<
  typeof SETTLEMENT_READINESS_STATUSES
>;

export const SETTLEMENT_AUTHORIZATION_STATES = {
  approved: 'approved',
  consumed: 'consumed',
  expired: 'expired',
  notRequired: 'not_required',
  pending: 'pending',
  revoked: 'revoked',
} as const;

export type SettlementAuthorizationState = WireEnum<
  typeof SETTLEMENT_AUTHORIZATION_STATES
>;

export const SETTLEMENT_GOVERNED_ACTION_KINDS = {
  canaryGrant: 'canary_grant',
  outcomeTokenApproval: 'outcome_token_approval',
  outcomeTokenRevocation: 'outcome_token_revocation',
} as const;

export type SettlementGovernedActionKind = WireEnum<
  typeof SETTLEMENT_GOVERNED_ACTION_KINDS
>;

export const SETTLEMENT_GOVERNED_ACTION_STATES = {
  authorized: 'authorized',
  consumed: 'consumed',
  expired: 'expired',
  failed: 'failed',
  reconciliationRequired: 'reconciliation_required',
  retryScheduled: 'retry_scheduled',
  revoked: 'revoked',
} as const;

export type SettlementGovernedActionState = WireEnum<
  typeof SETTLEMENT_GOVERNED_ACTION_STATES
>;

export const SETTLEMENT_SUBMISSION_KINDS = {
  directEoa: 'direct_eoa',
  externallyObserved: 'externally_observed',
  relayer: 'relayer',
} as const;

export type SettlementSubmissionKind = WireEnum<
  typeof SETTLEMENT_SUBMISSION_KINDS
>;

export const SETTLEMENT_SUBMISSION_PURPOSES = {
  outcomeTokenApproval: 'outcome_token_approval',
  outcomeTokenRevocation: 'outcome_token_revocation',
  redeem: 'redeem',
} as const;

export type SettlementSubmissionPurpose = WireEnum<
  typeof SETTLEMENT_SUBMISSION_PURPOSES
>;

export const SETTLEMENT_SUBMISSION_STATES = {
  awaitingChainHash: 'awaiting_chain_hash',
  awaitingFinality: 'awaiting_finality',
  confirmed: 'confirmed',
  dispatching: 'dispatching',
  failed: 'failed',
  prepared: 'prepared',
} as const;

export type SettlementSubmissionState = WireEnum<
  typeof SETTLEMENT_SUBMISSION_STATES
>;

export const SETTLEMENT_RECONCILIATION_STATES = {
  awaitingReceipt: 'awaiting_receipt',
  awaitingRelayerHash: 'awaiting_relayer_hash',
  evidenceMismatch: 'evidence_mismatch',
  notRequired: 'not_required',
  operatorReviewRequired: 'operator_review_required',
  reconciled: 'reconciled',
} as const;

export type SettlementReconciliationState = WireEnum<
  typeof SETTLEMENT_RECONCILIATION_STATES
>;

// ── Research / governance ───────────────────────────────────────────────────

export const MATERIALIZATION_RUN_STATUSES = {
  cancelled: 'cancelled',
  completed: 'completed',
  failed: 'failed',
  queued: 'queued',
  running: 'running',
} as const;

export type MaterializationRunStatus = WireEnum<
  typeof MATERIALIZATION_RUN_STATUSES
>;

/** Which materialization job a run-update describes (mirrors Rust `MaterializationRunKind`). */
export const MATERIALIZATION_RUN_KINDS = {
  backtest: 'backtest',
  biasTableFit: 'bias_table_fit',
  cpcvBacktest: 'cpcv_backtest',
  dataset: 'dataset',
  featureParity: 'feature_parity',
  modelCalibrationFit: 'model_calibration_fit',
  tradePolicyFit: 'trade_policy_fit',
  training: 'training',
} as const;

export type MaterializationRunKind = WireEnum<typeof MATERIALIZATION_RUN_KINDS>;

/** Durable research-job kind (mirrors Rust `ResearchJobKind`). */
export const RESEARCH_JOB_KINDS = {
  backtest: 'backtest',
  biasTableFit: 'bias_table_fit',
  cpcvBacktest: 'cpcv_backtest',
  datasetBuild: 'dataset_build',
  featureParity: 'feature_parity',
  modelCalibrationFit: 'model_calibration_fit',
  modelTrain: 'model_train',
  tradePolicyFit: 'trade_policy_fit',
} as const;

/** Calibration artifact family (mirrors Rust `CalibrationKind`). */
export const CALIBRATION_KINDS = {
  marketPriceBias: 'market_price_bias',
  modelScore: 'model_score',
  weatherStationLeadBias: 'weather_station_lead_bias',
} as const;

export type CalibrationKind = WireEnum<typeof CALIBRATION_KINDS>;

/** Model-score calibrator fitting method (mirrors Rust `CalibrationMethod`). */
export const CALIBRATION_METHODS = {
  isotonic: 'isotonic',
  platt: 'platt',
} as const;

export type CalibrationMethod = WireEnum<typeof CALIBRATION_METHODS>;

/** Calibrated return-model downside source (mirrors Rust `DownsideSource`). */
export const DOWNSIDE_SOURCES = {
  mfeMae: 'mfe_mae',
} as const;

export type DownsideSource = WireEnum<typeof DOWNSIDE_SOURCES>;

/** Training-dataset purpose (mirrors Rust `DatasetPurpose`). */
export const DATASET_PURPOSES = {
  calibration: 'calibration',
  evaluation: 'evaluation',
  policyFit: 'policy_fit',
  training: 'training',
} as const;

export type DatasetPurpose = WireEnum<typeof DATASET_PURPOSES>;

/** Orthogonal point-in-time cohort frozen into an Evaluation dataset. */
export const FEEDBACK_COHORTS = {
  executionLearning: 'execution_learning',
  modelLearning: 'model_learning',
  policyEvaluation: 'policy_evaluation',
} as const;

export type FeedbackCohort = WireEnum<typeof FEEDBACK_COHORTS>;

/** Stable exclusion taxonomy for one frozen feedback cohort. */
export const COHORT_EXCLUSION_REASONS = {
  executionNotAttempted: 'execution_not_attempted',
  nonPrimaryReport: 'non_primary_report',
  outsideFrozenWindow: 'outside_frozen_window',
  recommendationNotPublished: 'recommendation_not_published',
  reportOnlyNoExecutionAuthority: 'report_only_no_execution_authority',
} as const;

export type CohortExclusionReason = WireEnum<typeof COHORT_EXCLUSION_REASONS>;

/** Stable censor taxonomy for otherwise eligible but immature samples. */
export const COHORT_CENSOR_REASONS = {
  executionOutcomeUnavailableAtCutoff:
    'execution_outcome_unavailable_at_cutoff',
  resolutionUnavailableAtCutoff: 'resolution_unavailable_at_cutoff',
} as const;

export type CohortCensorReason = WireEnum<typeof COHORT_CENSOR_REASONS>;

export type ResearchJobKind = WireEnum<typeof RESEARCH_JOB_KINDS>;

export const RESEARCH_JOB_RESULT_KINDS = {
  backtestPathSet: 'backtest_path_set',
  backtestReport: 'backtest_report',
  calibrationArtifact: 'calibration_artifact',
  featureParityRun: 'feature_parity_run',
  modelVersion: 'model_version',
  tradePolicyArtifact: 'trade_policy_artifact',
  tradePolicyValidationRun: 'trade_policy_validation_run',
  trainingDataset: 'training_dataset',
} as const;

export type ResearchJobResultKind = WireEnum<typeof RESEARCH_JOB_RESULT_KINDS>;

/** Durable research-job lifecycle state (mirrors Rust `ResearchJobStatus`). */
export const RESEARCH_JOB_STATUSES = {
  awaitingEvidence: 'awaiting_evidence',
  cancelled: 'cancelled',
  failed: 'failed',
  queued: 'queued',
  retryScheduled: 'retry_scheduled',
  running: 'running',
  succeeded: 'succeeded',
} as const;

export type ResearchJobStatus = WireEnum<typeof RESEARCH_JOB_STATUSES>;

/** Whether a job is still pending/executing and may be cancelled. */
export function isActiveResearchJobStatus(status: ResearchJobStatus): boolean {
  return (
    status === RESEARCH_JOB_STATUSES.queued ||
    status === RESEARCH_JOB_STATUSES.awaitingEvidence ||
    status === RESEARCH_JOB_STATUSES.retryScheduled ||
    status === RESEARCH_JOB_STATUSES.running
  );
}

/** Whether a job has reached a terminal state (retryable). */
export function isTerminalResearchJobStatus(
  status: ResearchJobStatus,
): boolean {
  return !isActiveResearchJobStatus(status);
}

/** Training-dataset build lifecycle (mirrors Rust `TrainingDatasetStatus`). */
export const TRAINING_DATASET_STATUSES = {
  building: 'building',
  expired: 'expired',
  failed: 'failed',
  insufficientLabels: 'insufficient_labels',
  planned: 'planned',
  ready: 'ready',
} as const;

export type TrainingDatasetStatus = WireEnum<typeof TRAINING_DATASET_STATUSES>;

/** Whether a dataset status is trainable/backtestable (trainer accepts these). */
export function isTrainableDatasetStatus(
  status: TrainingDatasetStatus,
): boolean {
  return status === TRAINING_DATASET_STATUSES.ready;
}

/** Exact-replay parity run scope (mirrors Rust `FeatureParityRunKind`). */
export const FEATURE_PARITY_RUN_KINDS = {
  full: 'full',
  sampled: 'sampled',
} as const;

export type FeatureParityRunKind = WireEnum<typeof FEATURE_PARITY_RUN_KINDS>;

/** Durable parity-run lifecycle/outcome (mirrors Rust `FeatureParityRunStatus`). */
export const FEATURE_PARITY_RUN_STATUSES = {
  failed: 'failed',
  mismatched: 'mismatched',
  passed: 'passed',
  pendingMaterialization: 'pending_materialization',
  queued: 'queued',
  running: 'running',
} as const;

export type FeatureParityRunStatus = WireEnum<
  typeof FEATURE_PARITY_RUN_STATUSES
>;

/** Deterministic comparison stage (mirrors Rust `FeatureParityStage`). */
export const FEATURE_PARITY_STAGES = {
  capture: 'capture',
  dataQuality: 'data_quality',
  domainCrypto: 'domain_crypto',
  domainWeather: 'domain_weather',
  factor: 'factor',
  featureCell: 'feature_cell',
  modelInput: 'model_input',
  prediction: 'prediction',
  selection: 'selection',
  snapshot: 'snapshot',
} as const;

export type FeatureParityStage = WireEnum<typeof FEATURE_PARITY_STAGES>;

/** Per-evidence comparison outcome (mirrors Rust `FeatureParityEventStatus`). */
export const FEATURE_PARITY_EVENT_STATUSES = {
  matched: 'matched',
  mismatched: 'mismatched',
  pendingMaterialization: 'pending_materialization',
} as const;

export type FeatureParityEventStatus = WireEnum<
  typeof FEATURE_PARITY_EVENT_STATUSES
>;

/** Explicit feature-cell state shared by materialization and serving. */
export const FEATURE_CELL_STATES = {
  missing: 'missing',
  notApplicable: 'not_applicable',
  observed: 'observed',
  substituted: 'substituted',
} as const;

export type FeatureCellState = WireEnum<typeof FEATURE_CELL_STATES>;

/** Factor family taxonomy (mirrors Rust `FactorFamily`). */
export const FACTOR_FAMILIES = {
  activity: 'activity',
  dataQuality: 'data_quality',
  liquidity: 'liquidity',
  meanReversion: 'mean_reversion',
  microstructure: 'microstructure',
  momentum: 'momentum',
  resolution: 'resolution',
  structural: 'structural',
  volatility: 'volatility',
} as const;

export type FactorFamily = WireEnum<typeof FACTOR_FAMILIES>;

/** Model family taxonomy (mirrors Rust `ModelFamily` / `qp_model_family`). */
export const MODEL_FAMILIES = {
  classicalElasticNet: 'classical_elastic_net',
  classicalExtraTrees: 'classical_extra_trees',
  classicalGradientBoostedTrees: 'classical_gradient_boosted_trees',
  classicalLasso: 'classical_lasso',
  classicalLogisticRegression: 'classical_logistic_regression',
  classicalRandomForest: 'classical_random_forest',
  classicalRidge: 'classical_ridge',
  holdVsExitWeighted: 'hold_vs_exit_weighted',
  weightedFactor: 'weighted_factor',
} as const;

export type ModelFamily = WireEnum<typeof MODEL_FAMILIES>;

/** Factor definition scope, including category-routed external verticals. */
export const FACTOR_DEFINITION_SCOPES = {
  domainCrypto: 'domain_crypto',
  domainWeather: 'domain_weather',
  generic: 'generic',
  structural: 'structural',
} as const;

export type FactorDefinitionScope = WireEnum<typeof FACTOR_DEFINITION_SCOPES>;

// ── Operation log ───────────────────────────────────────────────────────────

export const OPERATION_CATEGORIES = {
  auth: 'auth',
  governance: 'governance',
  market: 'market',
  other: 'other',
  quantReport: 'quant_report',
  rbac: 'rbac',
  replay: 'replay',
  risk: 'risk',
  config: 'config',
  system: 'system',
} as const;

export type OperationCategory = WireEnum<typeof OPERATION_CATEGORIES>;

export const OPERATION_OUTCOMES = {
  denied: 'denied',
  failure: 'failure',
  success: 'success',
} as const;

export type OperationOutcome = WireEnum<typeof OPERATION_OUTCOMES>;

// ── Runtime config ──────────────────────────────────────────────────────────
