import type {
  AlertLevel,
  RiskEngineStateView,
  SystemStatus,
} from '@vben/types';

import { BREAKER_STATES, DEGRADED_ALERT_LEVELS } from '@vben/types';

/** Aggregated header status light. */
export type SystemIndicator = 'critical' | 'degraded' | 'running' | 'unknown';

/**
 * Aggregate the header status light from the live system + risk snapshots
 * (phase 7.2 §2.1, extended with catalog warmup):
 *
 * - `critical` — halted, or the breaker FSM is `halted`
 * - `degraded` — breaker `open`/`half_open`, catalog warming, or a recent
 *   `system.alert` at warning or above
 * - `running`  — breaker `closed`/`recovered`, not halted, catalog ready
 * - `unknown`  — no system snapshot received yet
 */
function hasRecentWarnAlert(level: AlertLevel | null): boolean {
  return level !== null && DEGRADED_ALERT_LEVELS.has(level);
}

export function deriveSystemIndicator(
  system: null | SystemStatus,
  risk: null | RiskEngineStateView,
  recentAlertLevel: AlertLevel | null = null,
): SystemIndicator {
  if (!system) {
    return 'unknown';
  }
  const halted =
    risk?.is_halted || system.breaker_state === BREAKER_STATES.halted;
  if (halted) {
    return 'critical';
  }
  const breaker = system.breaker_state;
  if (
    breaker === BREAKER_STATES.open ||
    breaker === BREAKER_STATES.halfOpen ||
    system.catalog.state === 'warming' ||
    hasRecentWarnAlert(recentAlertLevel)
  ) {
    return 'degraded';
  }
  return 'running';
}
