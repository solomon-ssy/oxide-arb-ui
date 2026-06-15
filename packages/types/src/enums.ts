/**
 * Wire values mirror Rust `active_string_enum!` serde output.
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

// ── System / risk ───────────────────────────────────────────────────────────

export const EXECUTION_MODES = {
  dryRun: 'dry_run',
  live: 'live',
  paper: 'paper',
} as const;

export type ExecutionMode = WireEnum<typeof EXECUTION_MODES>;

/** UI display order for mode switchers (dry → paper → live). */
export const EXECUTION_MODE_OPTIONS: readonly ExecutionMode[] = [
  EXECUTION_MODES.dryRun,
  EXECUTION_MODES.paper,
  EXECUTION_MODES.live,
];

export const BREAKER_STATES = {
  closed: 'closed',
  halfOpen: 'half_open',
  halted: 'halted',
  open: 'open',
  recovered: 'recovered',
} as const;

export type BreakerStateName = WireEnum<typeof BREAKER_STATES>;

/** Breaker FSM states considered nominal (non-alert) operation. */
export const BREAKER_NOMINAL_STATES: ReadonlySet<BreakerStateName> = new Set([
  BREAKER_STATES.closed,
  BREAKER_STATES.recovered,
]);

/** Circuit-breaker escalation tier (`risk.circuit_breaker` payload `level` is its numeric form). */
export const CIRCUIT_BREAKER_LEVELS = {
  daily: 'daily',
  session: 'session',
  system: 'system',
  trade: 'trade',
} as const;

export type CircuitBreakerLevel = WireEnum<typeof CIRCUIT_BREAKER_LEVELS>;

export const BLACKLIST_SCOPES = {
  dataPath: 'data_path',
  full: 'full',
  tradingPath: 'trading_path',
} as const;

export type BlacklistScope = WireEnum<typeof BLACKLIST_SCOPES>;

export const BLACKLIST_REASONS = {
  consecutiveFokFailures: 'consecutive_fok_failures',
  dataNotFound: 'data_not_found',
  depthDrop: 'depth_drop',
  manual: 'manual',
  tickChange: 'tick_change',
  tradeFailedAfterMatched: 'trade_failed_after_matched',
} as const;

export type BlacklistReason = WireEnum<typeof BLACKLIST_REASONS>;

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

// ── Trading ─────────────────────────────────────────────────────────────────

/** Order side — the one UPPERCASE wire enum (Polymarket CLOB convention). */
export const SIDES = {
  buy: 'BUY',
  sell: 'SELL',
} as const;

export type Side = WireEnum<typeof SIDES>;

/** Durable trade lifecycle FSM (single source of truth on the trade row). */
export const TRADE_STATES = {
  failObserved: 'fail_observed',
  failProcessing: 'fail_processing',
  failed: 'failed',
  fillObserved: 'fill_observed',
  fillProcessing: 'fill_processing',
  intent: 'intent',
  missObserved: 'miss_observed',
  missProcessing: 'miss_processing',
  missed: 'missed',
  orphaned: 'orphaned',
  settled: 'settled',
  submitted: 'submitted',
} as const;

export type TradeState = WireEnum<typeof TRADE_STATES>;

/** Business-outcome bucket derived from the trade FSM. */
export const TRADE_BUSINESS_OUTCOMES = {
  failed: 'failed',
  miss: 'miss',
  success: 'success',
} as const;

export type TradeBusinessOutcome = WireEnum<typeof TRADE_BUSINESS_OUTCOMES>;

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

export const POSITION_STATUSES = {
  closed: 'closed',
  open: 'open',
  settled: 'settled',
} as const;

export type PositionStatus = WireEnum<typeof POSITION_STATUSES>;

/** Market lifecycle state in the local registry. */
export const MARKET_STATUSES = {
  active: 'active',
  delisted: 'delisted',
  discovered: 'discovered',
  filtered: 'filtered',
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

/** Staleness classification of the market-data snapshot behind a decision. */
export const STALENESS_LEVELS = {
  acceptable: 'acceptable',
  expired: 'expired',
  fresh: 'fresh',
  stale: 'stale',
} as const;

export type StalenessLevel = WireEnum<typeof STALENESS_LEVELS>;

/** Endgame calibration price zone (winning-side token price bucket). */
export const PRICE_ZONES = {
  z95: 'z95',
  z96: 'z96',
  z97: 'z97',
  z98: 'z98',
  z99: 'z99',
} as const;

export type PriceZone = WireEnum<typeof PRICE_ZONES>;

/** Convergence-duration calibration bucket. */
export const DURATION_BUCKETS = {
  long: 'long',
  medium: 'medium',
  short: 'short',
  veryLong: 'very_long',
} as const;

export type DurationBucket = WireEnum<typeof DURATION_BUCKETS>;

// ── Opportunity audit lifecycle ─────────────────────────────────────────────

/** Audit-trail lifecycle stage of an opportunity (one row per stage). */
export const OPPORTUNITY_AUDIT_STAGES = {
  detected: 'detected',
  factorValidationRejected: 'factor_validation_rejected',
  failed: 'failed',
  filled: 'filled',
  missed: 'missed',
  riskRejected: 'risk_rejected',
  settled: 'settled',
  sizingRejected: 'sizing_rejected',
  validationRejected: 'validation_rejected',
} as const;

export type OpportunityAuditStage = WireEnum<typeof OPPORTUNITY_AUDIT_STAGES>;

/** Lifecycle display order for the funnel / timeline (mirrors backend `order()`). */
export const OPPORTUNITY_AUDIT_STAGE_ORDER: readonly OpportunityAuditStage[] = [
  OPPORTUNITY_AUDIT_STAGES.detected,
  OPPORTUNITY_AUDIT_STAGES.validationRejected,
  OPPORTUNITY_AUDIT_STAGES.factorValidationRejected,
  OPPORTUNITY_AUDIT_STAGES.riskRejected,
  OPPORTUNITY_AUDIT_STAGES.sizingRejected,
  OPPORTUNITY_AUDIT_STAGES.filled,
  OPPORTUNITY_AUDIT_STAGES.missed,
  OPPORTUNITY_AUDIT_STAGES.failed,
  OPPORTUNITY_AUDIT_STAGES.settled,
];

/** Terminal business conclusion recorded on an audit row. */
export const AUDIT_OUTCOMES = {
  failed: 'failed',
  miss: 'miss',
  rejected: 'rejected',
  settled: 'settled',
  success: 'success',
} as const;

export type AuditOutcome = WireEnum<typeof AUDIT_OUTCOMES>;

/** Pipeline stage at which an opportunity was rejected. */
export const REJECTION_STAGES = {
  factorValidation: 'factor_validation',
  other: 'other',
  risk: 'risk',
  sizing: 'sizing',
  submitPersist: 'submit_persist',
  validation: 'validation',
} as const;

export type RejectionStage = WireEnum<typeof REJECTION_STAGES>;

/** Win/loss conclusion of a settled position. */
export const SETTLEMENT_OUTCOMES = {
  lost: 'lost',
  won: 'won',
} as const;

export type SettlementOutcome = WireEnum<typeof SETTLEMENT_OUTCOMES>;

/** Source that triggered market settlement processing. */
export const SETTLEMENT_TRIGGERS = {
  manual: 'manual',
  periodicRetry: 'periodic_retry',
  ws: 'ws',
} as const;

export type SettlementTrigger = WireEnum<typeof SETTLEMENT_TRIGGERS>;

/** Post-redeem accounting lifecycle status. */
export const SETTLEMENT_ACCOUNTING_STATUSES = {
  accounted: 'accounted',
  failed: 'failed',
  pending: 'pending',
  redeemed: 'redeemed',
} as const;

export type SettlementAccountingStatus = WireEnum<
  typeof SETTLEMENT_ACCOUNTING_STATUSES
>;

/** Risk audit event type (`GET /trades/decisions` rows). */
export const RISK_AUDIT_EVENT_TYPES = {
  accountingRollover: 'accounting_rollover',
  blacklistAdded: 'blacklist_added',
  blacklistRemoved: 'blacklist_removed',
  breakerRecovered: 'breaker_recovered',
  breakerReset: 'breaker_reset',
  breakerTripped: 'breaker_tripped',
  engineHalted: 'engine_halted',
  engineResumed: 'engine_resumed',
  postTradeUpdate: 'post_trade_update',
  reconciliationCompleted: 'reconciliation_completed',
  tradeAllowed: 'trade_allowed',
  tradeDenied: 'trade_denied',
} as const;

export type RiskAuditEventType = WireEnum<typeof RISK_AUDIT_EVENT_TYPES>;

export const REDEEM_STATUSES = {
  completed: 'completed',
  failed: 'failed',
  notRequired: 'not_required',
  pending: 'pending',
} as const;

export type RedeemStatus = WireEnum<typeof REDEEM_STATUSES>;

// ── Control / governance ────────────────────────────────────────────────────

/** Control-factor publication mode (`control.published` payload). */
export const PUBLICATION_MODES = {
  published: 'published',
  shadow: 'shadow',
} as const;

export type PublicationMode = WireEnum<typeof PUBLICATION_MODES>;

export const FACTOR_STATUSES = {
  candidate: 'candidate',
  draft: 'draft',
  expired: 'expired',
  published: 'published',
  rejected: 'rejected',
  reportOnly: 'report_only',
  rolledBack: 'rolled_back',
  shadow: 'shadow',
  superseded: 'superseded',
} as const;

export type FactorStatus = WireEnum<typeof FACTOR_STATUSES>;

export const PUBLICATION_STATUSES = {
  active: 'active',
  expired: 'expired',
  pending: 'pending',
  rejected: 'rejected',
  rolledBack: 'rolled_back',
  superseded: 'superseded',
} as const;

export type PublicationStatus = WireEnum<typeof PUBLICATION_STATUSES>;

export const SHADOW_DECISION_TYPES = {
  noEffect: 'no_effect',
  wouldReject: 'would_reject',
  wouldScore: 'would_score',
  wouldSize: 'would_size',
} as const;

export type ShadowDecisionType = WireEnum<typeof SHADOW_DECISION_TYPES>;

export const CONTROL_AUDIT_EVENT_TYPES = {
  factorCreated: 'factor_created',
  factorExpired: 'factor_expired',
  factorRejected: 'factor_rejected',
  factorTransitioned: 'factor_transitioned',
  publicationActivated: 'publication_activated',
  publicationCreated: 'publication_created',
  publicationExpired: 'publication_expired',
  publicationRolledBack: 'publication_rolled_back',
  runtimeConfigActivated: 'runtime_config_activated',
  runtimeConfigRolledBack: 'runtime_config_rolled_back',
  runtimeConfigVersionCreated: 'runtime_config_version_created',
  snapshotLoadFailed: 'snapshot_load_failed',
} as const;

export type ControlAuditEventType = WireEnum<typeof CONTROL_AUDIT_EVENT_TYPES>;

export const AUDIT_RESOURCE_TYPES = {
  factor: 'factor',
  materializationRun: 'materialization_run',
  publication: 'publication',
  runtimeConfigVersion: 'runtime_config_version',
  snapshot: 'snapshot',
} as const;

export type AuditResourceType = WireEnum<typeof AUDIT_RESOURCE_TYPES>;

export const RUNTIME_CONFIG_VERSION_SOURCES = {
  bootstrap: 'bootstrap',
  import: 'import',
  operator: 'operator',
} as const;

export type RuntimeConfigVersionSource = WireEnum<
  typeof RUNTIME_CONFIG_VERSION_SOURCES
>;

export const RUNTIME_CONFIG_ACTIVATION_KINDS = {
  initial: 'initial',
  promote: 'promote',
  rollback: 'rollback',
} as const;

export type RuntimeConfigActivationKind = WireEnum<
  typeof RUNTIME_CONFIG_ACTIVATION_KINDS
>;

export const OPERATION_CATEGORIES = {
  auth: 'auth',
  governance: 'governance',
  market: 'market',
  other: 'other',
  rbac: 'rbac',
  replay: 'replay',
  risk: 'risk',
  runtimeConfig: 'runtime_config',
  system: 'system',
} as const;

export type OperationCategory = WireEnum<typeof OPERATION_CATEGORIES>;

export const OPERATION_OUTCOMES = {
  denied: 'denied',
  failure: 'failure',
  success: 'success',
} as const;

export type OperationOutcome = WireEnum<typeof OPERATION_OUTCOMES>;

export const MATERIALIZATION_RUN_STATUSES = {
  cancelled: 'cancelled',
  completed: 'completed',
  completedWithRejectedFactors: 'completed_with_rejected_factors',
  failed: 'failed',
  queued: 'queued',
  reportOnly: 'report_only',
  running: 'running',
} as const;

export type MaterializationRunStatus = WireEnum<
  typeof MATERIALIZATION_RUN_STATUSES
>;

export const MATERIALIZATION_RUN_KINDS = {
  backfill: 'backfill',
  configComparison: 'config_comparison',
  forensicReport: 'forensic_report',
  incident: 'incident',
  scheduled: 'scheduled',
} as const;

export type MaterializationRunKind = WireEnum<typeof MATERIALIZATION_RUN_KINDS>;

export const RUN_TRIGGER_TYPES = {
  backfill: 'backfill',
  configComparison: 'config_comparison',
  forensicReport: 'forensic_report',
  incident: 'incident',
  scheduled: 'scheduled',
} as const;

export type RunTriggerType = WireEnum<typeof RUN_TRIGGER_TYPES>;

export const MATERIALIZATION_OUTPUT_POLICIES = {
  emitDraftCandidates: 'emit_draft_candidates',
  emitDraftOnly: 'emit_draft_only',
  reportOnly: 'report_only',
} as const;

export type MaterializationOutputPolicy = WireEnum<
  typeof MATERIALIZATION_OUTPUT_POLICIES
>;

export const EVIDENCE_STAGE_STATUSES = {
  completed: 'completed',
  completedWithWarnings: 'completed_with_warnings',
  failed: 'failed',
  insufficientCoverage: 'insufficient_coverage',
  pending: 'pending',
  productionIneligible: 'production_ineligible',
  running: 'running',
  skippedNotRequired: 'skipped_not_required',
} as const;

export type EvidenceStageStatus = WireEnum<typeof EVIDENCE_STAGE_STATUSES>;

export const MATERIALIZATION_STAGE_NAMES = {
  bookReconstruction: 'book_reconstruction',
  detectorEvidence: 'detector_evidence',
  draftWrite: 'draft_write',
  executionEvidence: 'execution_evidence',
  factorBuild: 'factor_build',
  portfolioRiskEvidence: 'portfolio_risk_evidence',
  qualityGateEvaluation: 'quality_gate_evaluation',
  resolveInputs: 'resolve_inputs',
  settlementReconciliationEvidence: 'settlement_reconciliation_evidence',
  trainingExampleBuild: 'training_example_build',
} as const;

export type MaterializationStageName = WireEnum<
  typeof MATERIALIZATION_STAGE_NAMES
>;

export const CONTROL_FACTOR_TYPES = {
  bucketRisk: 'bucket_risk',
  executionQuality: 'execution_quality',
  marketAnomaly: 'market_anomaly',
  portfolioRisk: 'portfolio_risk',
  reconciliationHealth: 'reconciliation_health',
} as const;

export type ControlFactorType = WireEnum<typeof CONTROL_FACTOR_TYPES>;

export const RESOURCE_TYPES = {
  analytics: 'analytics',
  audit: 'audit',
  blacklist: 'blacklist',
  controlFactor: 'control_factor',
  market: 'market',
  materialization: 'materialization',
  menu: 'menu',
  operationLog: 'operation_log',
  opportunity: 'opportunity',
  permission: 'permission',
  pnl: 'pnl',
  publication: 'publication',
  replay: 'replay',
  risk: 'risk',
  role: 'role',
  runtimeConfig: 'runtime_config',
  system: 'system',
  trade: 'trade',
  user: 'user',
} as const;

export type ResourceType = WireEnum<typeof RESOURCE_TYPES>;

export const OPERATIONS = {
  activate: 'activate',
  assign: 'assign',
  create: 'create',
  delete: 'delete',
  emergency: 'emergency',
  enqueue: 'enqueue',
  halt: 'halt',
  publish: 'publish',
  read: 'read',
  reject: 'reject',
  reset: 'reset',
  resume: 'resume',
  rollback: 'rollback',
  shadow: 'shadow',
  switchMode: 'switch_mode',
  update: 'update',
} as const;

export type Operation = WireEnum<typeof OPERATIONS>;
