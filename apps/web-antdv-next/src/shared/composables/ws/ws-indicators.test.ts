import type { SystemStatus } from '@vben/types';

import { describe, expect, it } from 'vitest';

import {
  deriveSystemIndicator,
  marketDataShardConnected,
} from '#/shared/composables/ws/ws-indicators';

function baseStatus(
  operational_phase: SystemStatus['operational_phase'],
): SystemStatus {
  return {
    active_markets: 0,
    breaker_state: 'closed',
    catalog: { state: 'warming' },
    checked_at: '2026-06-17T00:00:00Z',
    control_factor_live_warn: false,
    control_factor_publication_id: null,
    control_factor_snapshot_expired: false,
    daily_pnl: '0',
    execution_emergency: {
      active: false,
      class: 'venue_fault',
      last_reason: null,
      requires_operator_ack: false,
    },
    execution_mode: 'dry_run',
    market_data: {
      last_message_age_ms: null,
      ready: false,
      ws_shards: { disconnected: 1, oldest_disconnected_secs: null, total: 2 },
    },
    open_positions: 0,
    operational_phase,
    pending_reservations: 0,
    total_exposure: '0',
    uptime_secs: 0,
  };
}

describe('deriveSystemIndicator', () => {
  it('returns unknown without status', () => {
    expect(deriveSystemIndicator(null)).toBe('unknown');
  });

  it('maps lifecycle phases to header lights', () => {
    expect(
      deriveSystemIndicator(baseStatus({ phase: 'catalog_warming' })),
    ).toBe('starting');
    expect(
      deriveSystemIndicator(baseStatus({ phase: 'market_data_connecting' })),
    ).toBe('starting');
    expect(deriveSystemIndicator(baseStatus({ phase: 'operational' }))).toBe(
      'running',
    );
    expect(
      deriveSystemIndicator(
        baseStatus({ phase: 'degraded', reasons: ['breaker_open'] }),
      ),
    ).toBe('degraded');
    expect(deriveSystemIndicator(baseStatus({ phase: 'halted' }))).toBe(
      'critical',
    );
  });
});

describe('marketDataShardConnected', () => {
  it('derives connected shard count', () => {
    expect(
      marketDataShardConnected({
        last_message_age_ms: 100,
        ready: true,
        ws_shards: { disconnected: 1, oldest_disconnected_secs: 5, total: 4 },
      }),
    ).toBe(3);
  });
});
