import type { AlertLevel, SystemStatus } from '@vben/types';

import { BREAKER_STATES, DEGRADED_ALERT_LEVELS } from '@vben/types';

/** Aggregated header status light. */
export type SystemIndicator = 'critical' | 'degraded' | 'running' | 'unknown';

/**
 * Idempotency key for unplanned execution faults. When `system.status` shows a
 * running breaker, this alert is stale and may be cleared from the header light.
 */
export const RECOVERABLE_EXECUTION_EMERGENCY_KEY = 'execution.emergency_halt';

/**
 * Whether the aggregate system snapshot represents normal trading readiness
 * (phase 7.2 §2.1): breaker closed/recovered, catalog not warming.
 */
export function isSystemRunning(status: SystemStatus): boolean {
  if (status.breaker_state === BREAKER_STATES.halted) {
    return false;
  }
  if (
    status.breaker_state === BREAKER_STATES.open ||
    status.breaker_state === BREAKER_STATES.halfOpen
  ) {
    return false;
  }
  if (status.catalog.state === 'warming') {
    return false;
  }
  return true;
}

function hasRecentWarnAlert(level: AlertLevel | null): boolean {
  return level !== null && DEGRADED_ALERT_LEVELS.has(level);
}

/**
 * Aggregate the header status light from the live `system.status` snapshot
 * (phase 7.2 §2.1, extended with catalog warmup).
 *
 * `system.status` is authoritative for breaker/halt — the detailed risk REST
 * snapshot can lag after control-plane resume.
 */
export function deriveSystemIndicator(
  system: null | SystemStatus,
  recentAlertLevel: AlertLevel | null = null,
): SystemIndicator {
  if (!system) {
    return 'unknown';
  }
  if (system.breaker_state === BREAKER_STATES.halted) {
    return 'critical';
  }
  if (
    system.breaker_state === BREAKER_STATES.open ||
    system.breaker_state === BREAKER_STATES.halfOpen ||
    system.catalog.state === 'warming' ||
    hasRecentWarnAlert(recentAlertLevel)
  ) {
    return 'degraded';
  }
  return 'running';
}
