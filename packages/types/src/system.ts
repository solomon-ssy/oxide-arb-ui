import type { DecimalString, IsoDateTime } from './common';
import type {
  KillSwitchState,
  MarketCategory,
  QuantRuntimeMode,
} from './enums';
import type { ReconciliationView } from './reconciliation';

/**
 * Market-catalog warmup state (internally tagged on `state`). Ingest is gated
 * off while `warming`; the control plane stays available.
 */
export type CatalogState =
  | { markets: number; state: 'ready'; synced_at: IsoDateTime }
  | { state: 'warming' };

/** Why the runtime is in the `degraded` operational phase. */
export type OperationalDegradeReason =
  | 'market_data_coverage_degraded'
  | 'market_data_stale'
  | { subsystem_unhealthy: { name: string } };

/** Authoritative operator lifecycle (header UI + execution gate). */
export type OperationalPhase =
  | { phase: 'catalog_warming' }
  | { phase: 'degraded'; reasons: OperationalDegradeReason[] }
  | { phase: 'halted' }
  | { phase: 'market_data_connecting' }
  | { phase: 'operational' };

/** Aggregated per-shard websocket connection counters (display only). */
export interface WsShardConnectivity {
  total: number;
  disconnected: number;
  oldest_disconnected_secs: null | number;
  connected_ratio_bps: number;
}

/** CLOB websocket market-data readiness snapshot. */
export interface MarketDataConnectivity {
  ready: boolean;
  last_message_age_ms: null | number;
  ws_shards: WsShardConnectivity;
}

/** Operational kill-switch snapshot (mirrors Rust `KillSwitchView`). */
export interface KillSwitchView {
  state: KillSwitchState;
  requires_operator_ack: boolean;
  last_reason: string;
  changed_by: string;
  changed_at: IsoDateTime;
}

/** Next-step hint the recovery coordinator surfaces to operators. */
export type ExecutionRecoveryStep = string;

/** Execution-recovery rollup embedded in {@link SystemStatus}. */
export interface ExecutionRecoverySummary {
  has_unresolvable_reconciliation: boolean;
  unresolvable_count: number;
  kill_switch_requires_ack: boolean;
  kill_switch_state: KillSwitchState;
  quant_runtime_mode: QuantRuntimeMode;
  auto_execution_blocked: boolean;
  next_steps: ExecutionRecoveryStep[];
}

/** `GET /system/execution-recovery` — recovery detail with blocking rows. */
export interface ExecutionRecoveryView {
  summary: ExecutionRecoverySummary;
  blocking_reconciliations: ReconciliationView[];
  kill_switch: KillSwitchView;
}

/** `GET /system/status` — the operator system snapshot. */
export interface SystemStatus {
  quant_runtime_mode: QuantRuntimeMode;
  uptime_secs: number;
  active_markets: number;
  catalog: CatalogState;
  operational_phase: OperationalPhase;
  market_data: MarketDataConnectivity;
  kill_switch: KillSwitchView;
  execution_recovery: ExecutionRecoverySummary;
  checked_at: IsoDateTime;
}

/** `GET /system/quant-mode` — the current runtime mode. */
export interface QuantModeView {
  mode: QuantRuntimeMode;
}

/** One preflight check outcome (mirrors Rust `PreflightCheck`). */
export interface PreflightCheck {
  /** Stable check identifier (e.g. `"credentials_loaded"`). */
  name: string;
  /** Whether failing this check blocks the transition. */
  hard: boolean;
  passed: boolean;
  /** Human-readable evidence for operators and the audit trail. */
  detail: string;
}

/** Preflight evidence for an upgrade mode transition. */
export interface PreflightReport {
  target: QuantRuntimeMode;
  checks: PreflightCheck[];
  /** `true` when every hard check passed (the transition may proceed). */
  passed: boolean;
}

/**
 * `POST /system/quant-mode` result (governed mode hot-swap). `preflight` is
 * `null` for no-ops and downgrades, which skip business preflight.
 */
export interface QuantModeTransitionReport {
  from: QuantRuntimeMode;
  to: QuantRuntimeMode;
  preflight: null | PreflightReport;
}

/** `POST /system/quant-mode` request body. */
export interface SwitchQuantModeRequest {
  mode: QuantRuntimeMode;
  reason: string;
}

/** `POST /system/kill-switch` request body (`ack` clears `emergency_halted`). */
export interface SetKillSwitchRequest {
  state: KillSwitchState;
  reason: string;
  ack?: boolean;
}

export type SubsystemCheckStatus =
  | { reason: string; status: 'skipped' }
  | { status: 'healthy' }
  | { status: 'unhealthy' };

export interface SubsystemHealth {
  name: string;
  status: SubsystemCheckStatus;
  latency_ms: null | number;
  detail: null | string;
}

/** `GET /system/health` — per-subsystem health report. */
export interface HealthReport {
  overall_healthy: boolean;
  checks: SubsystemHealth[];
  checked_at: IsoDateTime;
}

/**
 * `GET /system/deploy-config` — credential-masked deploy config snapshot.
 *
 * Mirrors the hand-built masked object from `masked_deploy_view()`; secret
 * fields (`password`, `jwt.secret`) arrive as `"***"` (or `""` when unset) and
 * credentialed URLs are collapsed to `"***"`. The `quant` and `research`
 * sections are intentionally omitted server-side.
 */
export interface DeployConfigView {
  polymarket: {
    chain_id: number;
    clob_base_url: string;
    clob_ws_url: string;
    fees: {
      category_rates: Partial<Record<MarketCategory, DecimalString>>;
      exponent: number;
      unknown_category_rate: DecimalString;
    };
    onchain: { rpc_timeout_ms: number; rpc_url: string };
  };
  market_data: {
    gamma: {
      base_url: string;
      full_sync_interval_secs: number;
      page_size: number;
    };
    websocket: {
      max_reconnect_delay_ms: number;
      max_subscriptions_per_connection: number;
      reconnect_delay_ms: number;
    };
  };
  observability: { log_json: boolean; log_level: string };
  db: {
    clickhouse: {
      batch_size: number;
      database: string;
      flush_interval_secs: number;
      max_concurrent_inserts: number;
      password: string;
      url: string;
      user: string;
    };
    postgres: {
      database: string;
      host: string;
      max_connections: number;
      min_connections: number;
      password: string;
      port: number;
      schema: string;
      user: string;
    };
  };
  cache: {
    disabled: boolean;
    fail_open: boolean;
    moka: { max_capacity: number };
    operation_timeout_ms: number;
    redis: {
      database: number;
      host: string;
      key_prefix: string;
      password: string;
      pool_size: number;
      port: number;
      timeout_ms: number;
      user: string;
    };
  };
  keys: { private_key_present: boolean };
  web: {
    cors_allowed_origins: string[];
    jwt: {
      access_ttl_secs: number;
      issuer: string;
      refresh_ttl_secs: number;
      secret: string;
    };
    listen_host: string;
    listen_port: number;
    serve_static_ui: boolean;
    static_ui_dir: string;
  };
}
