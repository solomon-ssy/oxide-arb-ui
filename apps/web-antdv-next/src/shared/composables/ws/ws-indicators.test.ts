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
    catalog: { state: 'warming' },
    checked_at: '2026-06-17T00:00:00Z',
    execution_recovery: {
      policy_automatic_blocked: false,
      has_unresolvable_reconciliation: false,
      kill_switch_requires_ack: false,
      kill_switch_state: 'closed',
      next_steps: [],
      entry_authorization_policy: 'operator_approval_required',
      unresolvable_count: 0,
    },
    kill_switch: {
      changed_at: '2026-06-17T00:00:00Z',
      changed_by: 'system',
      last_reason: 'bootstrap',
      requires_operator_ack: false,
      revision: 0,
      state: 'closed',
    },
    market_data: {
      last_message_age_ms: null,
      ready: false,
      ws_shards: {
        connected_ratio_bps: 5000,
        disconnected: 1,
        oldest_disconnected_secs: null,
        total: 2,
      },
    },
    operational_phase,
    entry_authorization_policy: 'operator_approval_required',
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
        baseStatus({ phase: 'degraded', reasons: ['market_data_stale'] }),
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
        ws_shards: {
          connected_ratio_bps: 7500,
          disconnected: 1,
          oldest_disconnected_secs: 5,
          total: 4,
        },
      }),
    ).toBe(3);
  });
});
