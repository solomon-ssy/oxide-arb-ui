/** Wire values mirror Rust `active_string_enum!` serde output (snake_case). */

export type UserStatus = 'active' | 'disabled';
export type RoleStatus = 'disabled' | 'enabled';
export type RoleKind = 'builtin' | 'custom';
export type MenuKind = 'button' | 'directory' | 'menu';

export type ExecutionMode = 'dry_run' | 'live' | 'paper';
export type BreakerStateName =
  | 'closed'
  | 'half_open'
  | 'halted'
  | 'open'
  | 'recovered';

export type ResourceType =
  | 'analytics'
  | 'audit'
  | 'blacklist'
  | 'control_factor'
  | 'market'
  | 'materialization'
  | 'menu'
  | 'operation_log'
  | 'opportunity'
  | 'permission'
  | 'pnl'
  | 'publication'
  | 'replay'
  | 'risk'
  | 'role'
  | 'runtime_config'
  | 'system'
  | 'trade'
  | 'user';

export type Operation =
  | 'activate'
  | 'assign'
  | 'create'
  | 'delete'
  | 'emergency'
  | 'enqueue'
  | 'halt'
  | 'publish'
  | 'read'
  | 'reject'
  | 'reset'
  | 'resume'
  | 'rollback'
  | 'shadow'
  | 'switch_mode'
  | 'update';
