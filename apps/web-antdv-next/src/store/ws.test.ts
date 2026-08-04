import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWsStore } from './ws';

describe('websocket connection evidence', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('separates initial handshake and connected heartbeat epochs', () => {
    const store = useWsStore();
    expect(store.status).toBe('disconnected');
    expect(store.connectingAt).toBeNull();

    store.setStatus('connecting');
    expect(store.connectingAt).toBe('2026-08-01T00:00:00.000Z');
    expect(store.connectedAt).toBeNull();

    vi.setSystemTime(new Date('2026-08-01T00:00:01.000Z'));
    store.setStatus('connected');
    expect(store.connectingAt).toBeNull();
    expect(store.connectedAt).toBe('2026-08-01T00:00:01.000Z');
    expect(store.lastHeartbeatAt).toBeNull();

    store.markHeartbeat();
    expect(store.lastHeartbeatAt).toBe('2026-08-01T00:00:01.000Z');
    store.setStatus('reconnecting');
    expect(store.connectedAt).toBeNull();
    expect(store.lastHeartbeatAt).toBeNull();
  });
});
