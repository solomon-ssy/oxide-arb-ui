import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_HEARTBEAT_STALE_MS,
  feedbackLivenessState,
  feedbackTransportHealth,
} from './feedback-liveness';

const connectedAt = '2026-07-31T00:00:00.000Z';
const connectedAtMs = Date.parse(connectedAt);

describe('feedback liveness coordinator', () => {
  it('becomes stale after exactly 45 seconds without a heartbeat', () => {
    expect(
      feedbackTransportHealth({
        connectedAt,
        connectingAt: null,
        lastHeartbeatAt: null,
        nowMs: connectedAtMs + FEEDBACK_HEARTBEAT_STALE_MS - 1,
        recoveryRequired: false,
        status: 'connected',
      }),
    ).toBe('healthy');
    expect(
      feedbackTransportHealth({
        connectedAt,
        connectingAt: null,
        lastHeartbeatAt: null,
        nowMs: connectedAtMs + FEEDBACK_HEARTBEAT_STALE_MS,
        recoveryRequired: false,
        status: 'connected',
      }),
    ).toBe('degraded');
  });

  it('presents the initial handshake as connecting until its bounded deadline', () => {
    expect(
      feedbackTransportHealth({
        connectedAt: null,
        connectingAt: connectedAt,
        lastHeartbeatAt: null,
        nowMs: connectedAtMs + FEEDBACK_HEARTBEAT_STALE_MS - 1,
        recoveryRequired: false,
        status: 'connecting',
      }),
    ).toBe('connecting');
    expect(
      feedbackTransportHealth({
        connectedAt: null,
        connectingAt: connectedAt,
        lastHeartbeatAt: null,
        nowMs: connectedAtMs + FEEDBACK_HEARTBEAT_STALE_MS,
        recoveryRequired: false,
        status: 'connecting',
      }),
    ).toBe('degraded');
  });

  it('uses the newest heartbeat and rejects malformed liveness evidence', () => {
    expect(
      feedbackTransportHealth({
        connectedAt,
        connectingAt: null,
        lastHeartbeatAt: '2026-07-31T00:00:30.000Z',
        nowMs: connectedAtMs + 60_000,
        recoveryRequired: false,
        status: 'connected',
      }),
    ).toBe('healthy');
    expect(
      feedbackTransportHealth({
        connectedAt,
        connectingAt: null,
        lastHeartbeatAt: 'not-a-timestamp',
        nowMs: connectedAtMs,
        recoveryRequired: false,
        status: 'connected',
      }),
    ).toBe('degraded');
  });

  it('polls only while visible and exposes a bounded recovered state', () => {
    expect(
      feedbackLivenessState({
        health: 'degraded',
        nowMs: connectedAtMs,
        recoveredUntilMs: null,
        visible: true,
      }),
    ).toBe('polling');
    expect(
      feedbackLivenessState({
        health: 'degraded',
        nowMs: connectedAtMs,
        recoveredUntilMs: null,
        visible: false,
      }),
    ).toBe('stale');
    expect(
      feedbackLivenessState({
        health: 'healthy',
        nowMs: connectedAtMs,
        recoveredUntilMs: connectedAtMs + 1,
        visible: true,
      }),
    ).toBe('recovered');
    expect(
      feedbackLivenessState({
        health: 'healthy',
        nowMs: connectedAtMs + 1,
        recoveredUntilMs: connectedAtMs + 1,
        visible: true,
      }),
    ).toBe('connected');
    expect(
      feedbackLivenessState({
        health: 'connecting',
        nowMs: connectedAtMs,
        recoveredUntilMs: null,
        visible: true,
      }),
    ).toBe('connecting');
  });
});
