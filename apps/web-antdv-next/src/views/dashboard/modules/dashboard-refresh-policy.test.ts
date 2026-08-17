import { describe, expect, it, vi } from 'vitest';

import {
  DASHBOARD_FALLBACK_INTERVAL_MS,
  DASHBOARD_WS_STALE_MS,
  dashboardWsHealth,
  isVisibilityRecovery,
  isWsRecovery,
  latestWsActivity,
  shouldPollDashboard,
} from './dashboard-refresh-policy';

const NOW = Date.parse('2026-07-29T03:30:00.000Z');

describe('dashboard refresh policy', () => {
  it('uses the latest client-clock sync or heartbeat as WS activity', () => {
    expect(
      latestWsActivity('2026-07-29T03:29:50.000Z', '2026-07-29T03:29:40.000Z'),
    ).toBe('2026-07-29T03:29:50.000Z');
    expect(latestWsActivity('invalid', null)).toBeNull();
  });

  it('classifies connected WS as healthy only with recent activity', () => {
    expect(
      dashboardWsHealth('connected', '2026-07-29T03:29:50.000Z', NOW),
    ).toBe('healthy');
    expect(
      dashboardWsHealth(
        'connected',
        new Date(NOW - DASHBOARD_WS_STALE_MS - 1).toISOString(),
        NOW,
      ),
    ).toBe('stale');
    expect(dashboardWsHealth('connected', null, NOW)).toBe('stale');
    expect(
      dashboardWsHealth('reconnecting', '2026-07-29T03:29:59.000Z', NOW),
    ).toBe('connecting');
    expect(dashboardWsHealth('connecting', null, NOW)).toBe('connecting');
  });

  it('runs the 30s fallback only while visible and disconnected or stale', () => {
    expect(DASHBOARD_FALLBACK_INTERVAL_MS).toBe(30_000);
    expect(shouldPollDashboard('healthy', 'visible')).toBe(false);
    expect(shouldPollDashboard('connecting', 'visible')).toBe(false);
    expect(shouldPollDashboard('disconnected', 'hidden')).toBe(false);
    expect(shouldPollDashboard('stale', 'hidden')).toBe(false);
    expect(shouldPollDashboard('disconnected', 'visible')).toBe(true);
    expect(shouldPollDashboard('stale', 'visible')).toBe(true);
  });

  it('does not refresh when heartbeat activity advances on a healthy socket', () => {
    const refresh = vi.fn();
    let activity = '2026-07-29T03:29:40.000Z';
    const fallbackTick = () => {
      const health = dashboardWsHealth('connected', activity, NOW);
      if (shouldPollDashboard(health, 'visible')) {
        refresh();
      }
    };

    activity = '2026-07-29T03:29:55.000Z';
    fallbackTick();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes exactly on reconnect and hidden-to-visible recovery', () => {
    expect(isWsRecovery('connected', 'reconnecting')).toBe(true);
    expect(isWsRecovery('connected', 'connecting')).toBe(false);
    expect(isWsRecovery('connected', 'connected')).toBe(false);
    expect(isWsRecovery('reconnecting', 'connected')).toBe(false);
    expect(isVisibilityRecovery('visible', 'hidden')).toBe(true);
    expect(isVisibilityRecovery('visible', 'visible')).toBe(false);
    expect(isVisibilityRecovery('hidden', 'visible')).toBe(false);
  });
});
