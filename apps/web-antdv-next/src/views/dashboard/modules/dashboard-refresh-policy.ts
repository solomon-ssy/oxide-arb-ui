import type { IsoDateTime } from '@vben/types';

import type { WsConnectionStatus } from '#/store';

export const DASHBOARD_FALLBACK_INTERVAL_MS = 30_000;
export const DASHBOARD_WS_STALE_MS = 45_000;

export type DashboardWsHealth =
  | 'connecting'
  | 'disconnected'
  | 'healthy'
  | 'stale';

function activityTime(value: IsoDateTime | null): null | number {
  if (value === null) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** Latest client-clock liveness evidence without deriving a refresh signal. */
export function latestWsActivity(
  heartbeatAt: IsoDateTime | null,
  syncAt: IsoDateTime | null,
): IsoDateTime | null {
  const heartbeatTime = activityTime(heartbeatAt);
  const syncTime = activityTime(syncAt);
  if (heartbeatTime === null) {
    return syncTime === null ? null : syncAt;
  }
  if (syncTime === null || heartbeatTime >= syncTime) {
    return heartbeatAt;
  }
  return syncAt;
}

/** Fail-closed WS health sampled only by the bounded fallback tick. */
export function dashboardWsHealth(
  status: WsConnectionStatus,
  activityAt: IsoDateTime | null,
  nowMs: number,
): DashboardWsHealth {
  if (status === 'connecting' || status === 'reconnecting') {
    return 'connecting';
  }
  if (status !== 'connected') {
    return 'disconnected';
  }
  const timestamp = activityTime(activityAt);
  if (
    timestamp === null ||
    timestamp > nowMs ||
    nowMs - timestamp > DASHBOARD_WS_STALE_MS
  ) {
    return 'stale';
  }
  return 'healthy';
}

export function shouldPollDashboard(
  health: DashboardWsHealth,
  visibility: DocumentVisibilityState,
): boolean {
  return (
    visibility === 'visible' &&
    (health === 'disconnected' || health === 'stale')
  );
}

export function isWsRecovery(
  next: WsConnectionStatus,
  previous: undefined | WsConnectionStatus,
): boolean {
  return (
    next === 'connected' &&
    (previous === 'disconnected' || previous === 'reconnecting')
  );
}

export function isVisibilityRecovery(
  next: DocumentVisibilityState,
  previous: DocumentVisibilityState | undefined,
): boolean {
  return next === 'visible' && previous !== undefined && previous !== next;
}
