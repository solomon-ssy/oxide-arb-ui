import type { AlertLevel, IsoDateTime, SystemAlertEvent } from '@vben/types';

import { ref } from 'vue';

import { defineStore } from 'pinia';

/** Alert severities surfaced in the notification bell. */
const NOTIFICATION_ALERT_LEVELS: ReadonlySet<AlertLevel> = new Set([
  'critical',
  'emergency',
  'warning',
]);

/** UI-facing connection state of the quant-pivot WebSocket. */
export type WsConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'reconnecting';

/**
 * WebSocket connection telemetry: status badge tri-state, last successful
 * `sync` instant, and application-heartbeat liveness.
 */
export const useWsStore = defineStore('qp-ws', () => {
  const status = ref<WsConnectionStatus>('disconnected');
  const connectingAt = ref<IsoDateTime | null>(null);
  const connectedAt = ref<IsoDateTime | null>(null);
  const lastSyncAt = ref<IsoDateTime | null>(null);
  const lastHeartbeatAt = ref<IsoDateTime | null>(null);
  /** Last `system.status` push or sync snapshot carrying system status. */
  const lastSystemStatusAt = ref<IsoDateTime | null>(null);
  /** Most recent alert at warning or above (bell only — not the header light). */
  const recentAlertLevel = ref<AlertLevel | null>(null);

  function setStatus(next: WsConnectionStatus) {
    if (next === status.value) {
      return;
    }
    const transitionedAt = new Date().toISOString();
    if (next === 'connected' && status.value !== 'connected') {
      connectedAt.value = transitionedAt;
    } else if (next !== 'connected') {
      connectedAt.value = null;
    }
    connectingAt.value = next === 'connecting' ? transitionedAt : null;
    lastHeartbeatAt.value = null;
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

  /** Record alerts for the notification bell (does not drive the header light). */
  function recordAlert(alert: SystemAlertEvent) {
    if (NOTIFICATION_ALERT_LEVELS.has(alert.level)) {
      recentAlertLevel.value = alert.level;
    }
  }

  function clearRecentAlert() {
    recentAlertLevel.value = null;
  }

  function $reset() {
    status.value = 'disconnected';
    connectingAt.value = null;
    connectedAt.value = null;
    lastSyncAt.value = null;
    lastHeartbeatAt.value = null;
    lastSystemStatusAt.value = null;
    recentAlertLevel.value = null;
  }

  return {
    $reset,
    clearRecentAlert,
    connectingAt,
    connectedAt,
    lastHeartbeatAt,
    lastSyncAt,
    lastSystemStatusAt,
    markHeartbeat,
    markSync,
    markSystemStatus,
    recentAlertLevel,
    recordAlert,
    setStatus,
    status,
  };
});
