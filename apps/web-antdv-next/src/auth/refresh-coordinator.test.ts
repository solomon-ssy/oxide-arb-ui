import type { TokenResponse } from '@vben/types';

import { useAccessStore } from '@vben/stores';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = [];

  readonly listeners: Array<(event: MessageEvent) => void> = [];
  readonly postMessage = vi.fn();

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener);
  }
}

function token(accessToken: string): TokenResponse {
  return {
    access_token: accessToken,
    expires_in: 300,
    token_type: 'Bearer',
  };
}

describe('refresh coordinator', () => {
  beforeEach(() => {
    vi.resetModules();
    setActivePinia(createPinia());
    TestBroadcastChannel.instances = [];
    vi.stubGlobal('BroadcastChannel', TestBroadcastChannel);
  });

  it('shares one refresh rotation across concurrent requests in a tab', async () => {
    const request = vi.fn(
      async (_name: string, callback: () => Promise<string>) => callback(),
    );
    vi.stubGlobal('navigator', { locks: { request } });
    const { refreshAccessToken } = await import('./refresh-coordinator');
    const rotate = vi.fn(async () => token('access-next'));

    const first = refreshAccessToken(rotate, 'Bearer access-expired');
    const second = refreshAccessToken(rotate, 'Bearer access-expired');

    await expect(Promise.all([first, second])).resolves.toEqual([
      'access-next',
      'access-next',
    ]);
    expect(first).toBe(second);
    expect(request).toHaveBeenCalledOnce();
    expect(rotate).toHaveBeenCalledOnce();
    expect(useAccessStore().accessToken).toBe('access-next');
  });

  it('fails closed instead of racing refresh families without Web Locks', async () => {
    vi.stubGlobal('navigator', {});
    const { publishAccessToken, refreshAccessToken } =
      await import('./refresh-coordinator');
    publishAccessToken('access-expired');
    const rotate = vi.fn(async () => token('must-not-be-used'));

    await expect(
      refreshAccessToken(rotate, 'Bearer access-expired'),
    ).rejects.toThrow('secure cross-tab refresh coordination is unavailable');
    expect(rotate).not.toHaveBeenCalled();
    expect(useAccessStore().accessToken).toBeNull();
  });
});
