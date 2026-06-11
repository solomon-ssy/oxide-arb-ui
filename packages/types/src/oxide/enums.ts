/**
 * Cross-cutting enums mirroring `oxide-arb-models/src/enums/` serde output.
 *
 * Values are the exact JSON wire strings (snake_case via
 * `#[serde(rename_all = "snake_case")]`). Modeled as `as const` objects with
 * derived union types so values stay greppable and exhaustive switches type
 * check.
 *
 * Known wire-format exceptions (handled where they live):
 * - `SourceHealth` serializes PascalCase (`Healthy` / `Degraded` / `Down`) — see `system.ts`.
 * - `WsChannel` uses dot names (`system.status`) — see `ws.ts`.
 */

/** Trading execution mode (`ExecutionMode`). */
export const ExecutionMode = {
  DryRun: 'dry_run',
  Live: 'live',
  Paper: 'paper',
} as const;
export type ExecutionMode = (typeof ExecutionMode)[keyof typeof ExecutionMode];

/** Circuit-breaker FSM state (`BreakerStateName`). */
export const BreakerStateName = {
  Closed: 'closed',
  HalfOpen: 'half_open',
  Halted: 'halted',
  Open: 'open',
  Recovered: 'recovered',
} as const;
export type BreakerStateName =
  (typeof BreakerStateName)[keyof typeof BreakerStateName];

/** RBAC user account status (`UserStatus`). */
export const UserStatus = {
  Active: 'active',
  Disabled: 'disabled',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** RBAC role status (`RoleStatus`). */
export const RoleStatus = {
  Disabled: 'disabled',
  Enabled: 'enabled',
} as const;
export type RoleStatus = (typeof RoleStatus)[keyof typeof RoleStatus];

/** Menu node kind (`MenuKind`): directory / page / button-level permission. */
export const MenuKind = {
  Button: 'button',
  Directory: 'directory',
  Menu: 'menu',
} as const;
export type MenuKind = (typeof MenuKind)[keyof typeof MenuKind];

/** Operation log outcome (`OperationOutcome`). */
export const OperationOutcome = {
  Denied: 'denied',
  Failure: 'failure',
  Success: 'success',
} as const;
export type OperationOutcome =
  (typeof OperationOutcome)[keyof typeof OperationOutcome];

/** Casbin RBAC resource (`ResourceType`) — first half of a permission code. */
export const ResourceType = {
  Analytics: 'analytics',
  Audit: 'audit',
  Blacklist: 'blacklist',
  ControlFactor: 'control_factor',
  Market: 'market',
  Materialization: 'materialization',
  Menu: 'menu',
  OperationLog: 'operation_log',
  Opportunity: 'opportunity',
  Permission: 'permission',
  Pnl: 'pnl',
  Publication: 'publication',
  Replay: 'replay',
  Risk: 'risk',
  Role: 'role',
  RuntimeConfig: 'runtime_config',
  System: 'system',
  Trade: 'trade',
  User: 'user',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

/** Casbin RBAC operation (`Operation`) — second half of a permission code. */
export const Operation = {
  Activate: 'activate',
  Assign: 'assign',
  Create: 'create',
  Delete: 'delete',
  Emergency: 'emergency',
  Enqueue: 'enqueue',
  Halt: 'halt',
  Publish: 'publish',
  Read: 'read',
  Reject: 'reject',
  Reset: 'reset',
  Resume: 'resume',
  Rollback: 'rollback',
  Shadow: 'shadow',
  SwitchMode: 'switch_mode',
  Update: 'update',
} as const;
export type Operation = (typeof Operation)[keyof typeof Operation];

/**
 * Permission code as used by Casbin, menu button nodes and `v-access:code`:
 * `{resource}:{operation}` (45 valid pairs seeded backend-side).
 */
export type PermissionCode = `${ResourceType}:${Operation}`;
