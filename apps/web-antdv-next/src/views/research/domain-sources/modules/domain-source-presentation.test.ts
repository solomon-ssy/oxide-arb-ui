import type { DomainSourceExpectationView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { summarizeDomainSources } from './domain-source-presentation';

function expectation(
  index: number,
  overrides: Partial<DomainSourceExpectationView> = {},
): DomainSourceExpectationView {
  return {
    expectation_id: `expectation-${index}`,
    family: index < 100 ? 'crypto' : 'weather',
    source_id: `source-${index}`,
    instrument_key: `instrument-${index}`,
    capability_registry_hash: `blake3:capability-${index}`,
    binding_hash: `blake3:binding-${index}`,
    required: true,
    credential_required: false,
    freshness_secs: 300,
    affected_market_ids: [`market-${index}`],
    affected_profile_ids: [`profile-${index}`],
    status: 'live',
    status_reason: null,
    cursor_status: 'live',
    checkpoint: { kind: 'binance_kline' },
    checkpoint_hash: `blake3:checkpoint-${index}`,
    last_event_time: '2026-07-28T00:00:00Z',
    freshness_observed_at: '2026-07-28T00:00:00Z',
    lag_secs: index,
    cursor_updated_at: '2026-07-28T00:00:00Z',
    observed_at: '2026-07-28T00:00:00Z',
    ...overrides,
  };
}

describe('domain Sources presentation', () => {
  it('preserves all 190 authoritative expectation rows', () => {
    const rows = Array.from({ length: 190 }, (_, index) => expectation(index));
    const summary = summarizeDomainSources(rows);

    expect(rows).toHaveLength(190);
    expect(summary.total).toBe(190);
    expect(summary.crypto).toBe(100);
    expect(summary.weather).toBe(90);
    expect(summary.observed).toBe(190);
    expect(summary.notObserved).toBe(0);
    expect(summary.worstLagSecs).toBe(189);
  });

  it('keeps missing cursor health null instead of fabricating zero lag', () => {
    const notStarted = expectation(0, {
      checkpoint: null,
      checkpoint_hash: null,
      cursor_status: null,
      cursor_updated_at: null,
      freshness_observed_at: null,
      lag_secs: null,
      last_event_time: null,
      status: 'not_started',
      status_reason: 'cursor_not_created',
    });

    const summary = summarizeDomainSources([notStarted]);
    expect(summary.worstLagSecs).toBeNull();
    expect(summary.observed).toBe(0);
    expect(summary.notObserved).toBe(1);
    expect(summary.stale).toBe(0);
    expect(summary.errors).toBe(0);
  });

  it('uses server-derived expectation status rather than client lag thresholds', () => {
    const rows = [
      expectation(0, { lag_secs: 900, status: 'live' }),
      expectation(1, {
        lag_secs: null,
        status: 'stale',
        status_reason: 'freshness_budget_exceeded',
      }),
      expectation(2, { lag_secs: 1, status: 'error' }),
    ];

    expect(summarizeDomainSources(rows)).toMatchObject({
      errors: 1,
      stale: 1,
      worstLagSecs: 900,
    });
  });
});
