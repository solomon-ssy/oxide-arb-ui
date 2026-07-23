import { describe, expect, it } from 'vitest';

import {
  degradeReasonKey,
  degradeReasonParams,
} from '#/shared/composables/ws/degrade-reason';

describe('degradeReasonKey', () => {
  it('passes through unit wire strings', () => {
    expect(degradeReasonKey('market_data_stale')).toBe('market_data_stale');
    expect(degradeReasonKey('breaker_open')).toBe('breaker_open');
  });

  it('unwraps object-shaped reasons', () => {
    expect(
      degradeReasonKey({ subsystem_unhealthy: { name: 'postgres' } }),
    ).toBe('subsystem_unhealthy');
    expect(
      degradeReasonKey({
        kill_switch_tightened: { state: 'exit_only' },
      }),
    ).toBe('kill_switch_tightened');
  });
});

describe('degradeReasonParams', () => {
  it('extracts interpolation fields', () => {
    expect(
      degradeReasonParams({ subsystem_unhealthy: { name: 'redis' } }),
    ).toEqual({ name: 'redis' });
    expect(
      degradeReasonParams({
        kill_switch_tightened: { state: 'exit_only' },
      }),
    ).toEqual({ state: 'exit_only' });
    expect(degradeReasonParams('market_data_stale')).toBeUndefined();
  });
});
