import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dispatchWsEnvelope } from '#/shared/composables/ws/ws-dispatch';
import { useSystemStore } from '#/store/system';

describe('dispatchWsEnvelope config.activated', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('updates active config version revision', () => {
    const hooks = {
      onAlert: vi.fn(),
      onBreakerChanged: vi.fn(),
      onConfigActivated: vi.fn(),
      onControlPublished: vi.fn(),
      onMarketResolved: vi.fn(),
    };

    dispatchWsEnvelope(
      {
        data: { version_id: 'version-abc' },
        timestamp: '2026-06-15T00:00:00Z',
        type: 'config.activated',
      },
      hooks,
    );

    expect(useSystemStore().activeConfigVersion).toBe('version-abc');
    expect(hooks.onConfigActivated).toHaveBeenCalledWith({
      version_id: 'version-abc',
    });
  });
});
