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
  recommendationAttribution: 'recommendation_attribution',
  reconciliation: 'reconciliation',
  replay: 'replay',
  role: 'role',
  runtimeConfig: 'runtime_config',
  settlementRedeem: 'settlement_redeem',
  system: 'system',
  user: 'user',
} as const;

export type ResourceType = WireEnum<typeof RESOURCE_TYPES>;

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
  reportOnlyForced: 'report_only_forced',
} as const;

export type KillSwitchState = WireEnum<typeof KILL_SWITCH_STATES>;

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
  adhoc: 'adhoc',
  scheduled: 'scheduled',
} as const;

export type ReportKind = WireEnum<typeof REPORT_KINDS>;

export const REPORT_TRIGGER_KINDS = {
  manual: 'manual',
  schedule: 'schedule',
} as const;

export type ReportTriggerKind = WireEnum<typeof REPORT_TRIGGER_KINDS>;

export const RECOMMENDATION_REPORT_STATUSES = {
  empty: 'empty',
  expired: 'expired',
  failed: 'failed',
  generating: 'generating',
  published: 'published',
  revoked: 'revoked',
} as const;

export type RecommendationReportStatus = WireEnum<
  typeof RECOMMENDATION_REPORT_STATUSES
>;

export const RECOMMENDATION_STATUSES = {
  active: 'active',
  expired: 'expired',
  revoked: 'revoked',
  superseded: 'superseded',
} as const;

export type RecommendationStatus = WireEnum<typeof RECOMMENDATION_STATUSES>;

export const ACCOUNT_SOURCES = {
  venueClob: 'venue_clob',
  venueDataApi: 'venue_data_api',
} as const;

export type AccountSource = WireEnum<typeof ACCOUNT_SOURCES>;

// ── Execution plane ─────────────────────────────────────────────────────────

export const ORDER_INTENT_STATUSES = {
  admitted: 'admitted',
  cancelled: 'cancelled',
  expired: 'expired',
  invalidated: 'invalidated',
  pendingApproval: 'pending_approval',
  rejected: 'rejected',
  submitted: 'submitted',
} as const;

export type OrderIntentStatus = WireEnum<typeof ORDER_INTENT_STATUSES>;

export const APPROVAL_STATUSES = {
  approved: 'approved',
  notRequired: 'not_required',
  pending: 'pending',
  rejected: 'rejected',
} as const;

export type ApprovalStatus = WireEnum<typeof APPROVAL_STATUSES>;

export const ORDER_INTENT_KINDS = {
  entry: 'entry',
  exit: 'exit',
} as const;

export type OrderIntentKind = WireEnum<typeof ORDER_INTENT_KINDS>;

export const EXECUTION_ORDER_STATES = {
  cancelled: 'cancelled',
  failed: 'failed',
  filled: 'filled',
  pending: 'pending',
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

export const POSITION_LEDGER_STATES = {
  closed: 'closed',
  open: 'open',
  redeemed: 'redeemed',
  settled: 'settled',
} as const;

export type PositionLedgerState = WireEnum<typeof POSITION_LEDGER_STATES>;

export const RECONCILIATION_RESULTS = {
  matched: 'matched',
  pending: 'pending',
  resolved: 'resolved',
  unresolvable: 'unresolvable',
} as const;

export type ReconciliationResult = WireEnum<typeof RECONCILIATION_RESULTS>;

export const SETTLEMENT_REDEEM_STATES = {
  confirmed: 'confirmed',
  failed: 'failed',
  pending: 'pending',
  submitted: 'submitted',
} as const;

export type SettlementRedeemState = WireEnum<typeof SETTLEMENT_REDEEM_STATES>;

// ── Research / governance ───────────────────────────────────────────────────

/** Model / factor publication lifecycle (mirrors Rust `PublicationStatus`). */
export const PUBLICATION_STATUSES = {
  candidate: 'candidate',
  draft: 'draft',
  published: 'published',
  rejected: 'rejected',
  retired: 'retired',
  shadow: 'shadow',
} as const;

export type PublicationStatus = WireEnum<typeof PUBLICATION_STATUSES>;

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

// ── Operation log ───────────────────────────────────────────────────────────

export const OPERATION_CATEGORIES = {
  auth: 'auth',
  governance: 'governance',
  market: 'market',
  other: 'other',
  rbac: 'rbac',
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

// ── Runtime config ──────────────────────────────────────────────────────────

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
