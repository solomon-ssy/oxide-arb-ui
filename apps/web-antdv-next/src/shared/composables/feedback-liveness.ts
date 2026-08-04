import type { IsoDateTime } from '@vben/types';

import type { WsConnectionStatus } from '#/store';

export const FEEDBACK_HEARTBEAT_STALE_MS = 45_000;
export const FEEDBACK_RECOVERED_VISIBLE_MS = 15_000;

export type FeedbackLivenessState =
  | 'connected'
  | 'connecting'
  | 'polling'
  | 'recovered'
  | 'stale';
export type FeedbackTransportHealth = 'connecting' | 'degraded' | 'healthy';

export interface FeedbackTransportLiveness {
  connectedAt: IsoDateTime | null;
  connectingAt: IsoDateTime | null;
  lastHeartbeatAt: IsoDateTime | null;
  nowMs: number;
  recoveryRequired: boolean;
  status: WsConnectionStatus;
}

export interface FeedbackLivenessPresentation {
  health: FeedbackTransportHealth;
  nowMs: number;
  recoveredUntilMs: null | number;
  visible: boolean;
}

function parseTimestamp(value: IsoDateTime | null): null | number {
  if (value === null) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Classify transport evidence without presenting an in-flight initial
 * handshake as a degraded connection. A stuck handshake and a newly connected
 * socket each receive one full liveness window; later pongs advance the latter.
 */
export function feedbackTransportHealth(
  liveness: FeedbackTransportLiveness,
): FeedbackTransportHealth {
  if (liveness.recoveryRequired) {
    return 'degraded';
  }
  if (liveness.status === 'connecting') {
    const connectingAt = parseTimestamp(liveness.connectingAt);
    if (connectingAt === null) {
      return 'degraded';
    }
    const connectingAge = liveness.nowMs - connectingAt;
    return connectingAge >= 0 && connectingAge < FEEDBACK_HEARTBEAT_STALE_MS
      ? 'connecting'
      : 'degraded';
  }
  if (liveness.status !== 'connected') {
    return 'degraded';
  }

  const connectedAt = parseTimestamp(liveness.connectedAt);
  const lastHeartbeatAt = parseTimestamp(liveness.lastHeartbeatAt);
  if (
    connectedAt === null ||
    (liveness.lastHeartbeatAt !== null && lastHeartbeatAt === null)
  ) {
    return 'degraded';
  }

  const latestEvidence = Math.max(connectedAt, lastHeartbeatAt ?? connectedAt);
  const heartbeatAge = liveness.nowMs - latestEvidence;
  return heartbeatAge < 0 || heartbeatAge >= FEEDBACK_HEARTBEAT_STALE_MS
    ? 'degraded'
    : 'healthy';
}

export function feedbackLivenessState(
  presentation: FeedbackLivenessPresentation,
): FeedbackLivenessState {
  if (presentation.health === 'connecting') {
    return 'connecting';
  }
  if (presentation.health === 'degraded') {
    return presentation.visible ? 'polling' : 'stale';
  }
  if (
    presentation.recoveredUntilMs !== null &&
    presentation.nowMs < presentation.recoveredUntilMs
  ) {
    return 'recovered';
  }
  return 'connected';
}
