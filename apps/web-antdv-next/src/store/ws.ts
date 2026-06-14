import type {
  AlertLevel,
  IsoDateTime,
  SystemAlertEvent,
  SystemStatus,
} from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

import {
  isSystemRunning,
  RECOVERABLE_EXECUTION_EMERGENCY_KEY,
} from '#/shared/composables/ws/ws-indicators';

/** Alert severities that push the header indicator to degraded (phase 7.2 §2.1). */
const DEGRADED_ALERT_LEVELS: ReadonlySet<AlertLevel> = new Set([
  'critical',
  'emergency',
  'warning',
]);

/** UI-facing connection state of the oxide WebSocket. */
export type WsConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * WebSocket connection telemetry: status badge tri-state, last successful
 * `sync` instant, and application-heartbeat liveness.
 */
export const useWsStore = defineStore('oxide-ws', () => {
  const status = ref<WsConnectionStatus>('disconnected');
  const lastSyncAt = ref<IsoDateTime | null>(null);
  const lastHeartbeatAt = ref<IsoDateTime | null>(null);
  /** Last `system.status` push or sync snapshot carrying system status. */
  const lastSystemStatusAt = ref<IsoDateTime | null>(null);
  /** Most recent trading-affecting alert at warning or above (cleared on recovery). */
  const recentAlertLevel = ref<AlertLevel | null>(null);
  /** Idempotency key paired with `recentAlertLevel` for targeted recovery. */
  const recentAlertKey = ref<null | string>(null);

  function setStatus(next: WsConnectionStatus) {
    status.value = next;
  }

  function markSync() {
    lastSyncAt.value = new Date().toISOString();
  }

  function markHeartbeat() {
    lastHeartbeatAt.value = new Date().toISOString();
  }

  /** Record a system-status heartbeat (WS push or authorized sync section). */
  function markSystemStatus(iso?: string) {
    lastSystemStatusAt.value = iso ?? new Date().toISOString();
  }

  /** Record only trading-affecting alerts for the aggregated header indicator. */
  function recordAlert(alert: SystemAlertEvent) {
    if (alert.affects_trading && DEGRADED_ALERT_LEVELS.has(alert.level)) {
      recentAlertLevel.value = alert.level;
      recentAlertKey.value = alert.idempotency_key;
    }
  }

  /**
   * Drop a latched emergency alert once the authoritative system snapshot
   * confirms trading readiness. Infrastructure warnings with other keys are
   * preserved.
   */
  function reconcileAlertOnSystemStatus(systemStatus: SystemStatus) {
    if (!isSystemRunning(systemStatus)) {
      return;
    }
    if (recentAlertKey.value === RECOVERABLE_EXECUTION_EMERGENCY_KEY) {
      clearRecentAlert();
    }
  }

  function clearRecentAlert() {
    recentAlertLevel.value = null;
    recentAlertKey.value = null;
  }

  function $reset() {
    status.value = 'disconnected';
    lastSyncAt.value = null;
    lastHeartbeatAt.value = null;
    lastSystemStatusAt.value = null;
    recentAlertLevel.value = null;
    recentAlertKey.value = null;
  }

  return {
    $reset,
    clearRecentAlert,
    lastHeartbeatAt,
    lastSyncAt,
    lastSystemStatusAt,
    markHeartbeat,
    markSync,
    markSystemStatus,
    recentAlertKey,
    recentAlertLevel,
    recordAlert,
    reconcileAlertOnSystemStatus,
    setStatus,
    status,
  };
});
