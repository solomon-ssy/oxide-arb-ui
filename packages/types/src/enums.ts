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

/** Operational alert severity, lowest → highest. */
export const ALERT_LEVELS = {
  critical: 'critical',
  emergency: 'emergency',
  info: 'info',
  warning: 'warning',
} as const;

export type AlertLevel = WireEnum<typeof ALERT_LEVELS>;

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
  incident: 'incident',
  scheduled: 'scheduled',
} as const;

export type MaterializationRunKind = WireEnum<typeof MATERIALIZATION_RUN_KINDS>;

export const RUN_TRIGGER_TYPES = {
  backfill: 'backfill',
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
