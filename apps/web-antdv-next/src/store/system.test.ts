import type { RuntimeControlSnapshot } from '@vben/types';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSystemStore } from './system';

function controls(
  revision: number,
  overrides: Partial<RuntimeControlSnapshot> = {},
): RuntimeControlSnapshot {
  return {
    changed_at: '2026-07-23T09:00:00Z',
    changed_by: 'system-admin',
    kill_switch_requires_ack: false,
    kill_switch_state: 'closed',
    quant_runtime_mode: 'report_only',
    reason: 'test fixture',
    revision,
    settlement_write_policy: 'disabled',
    ...overrides,
  };
}

describe('useSystemStore runtime controls', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('publishes one coherent snapshot and rejects stale multi-instance reads', () => {
    const store = useSystemStore();
    store.applyRuntimeControls(controls(4));
    store.applyRuntimeControls(
      controls(3, {
        quant_runtime_mode: 'auto_execution',
        settlement_write_policy: 'auto',
      }),
    );

    expect(store.runtimeControls).toEqual(controls(4));
  });

  it('accepts the exact CAS response and resets all runtime truth', () => {
    const store = useSystemStore();
    const next = controls(5, {
      changed_by: 'settlement-admin',
      reason: 'enable exact canary',
      settlement_write_policy: 'governed_canary',
    });
    store.applyRuntimeControls(next);
    expect(store.runtimeControls).toEqual(next);

    store.$reset();
    expect(store.runtimeControls).toBeNull();
  });
});
