import { afterEach, describe, expect, it, vi } from 'vitest';

import { DashboardRefreshCoordinator } from './dashboard-refresh-coordinator';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe('dashboardRefreshCoordinator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs one request at a time and collapses a burst into one trailing read', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    let active = 0;
    let maxActive = 0;
    const fetchOverview = vi.fn(() => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      const pending = fetchOverview.mock.calls.length === 1 ? first : second;
      return pending.promise.finally(() => {
        active -= 1;
      });
    });
    const onSnapshot = vi.fn();
    const onPendingChange = vi.fn();
    const coordinator = new DashboardRefreshCoordinator({
      fetchOverview,
      initialWindow: '7d',
      onError: vi.fn(),
      onPendingChange,
      onSnapshot,
    });

    coordinator.refresh();
    coordinator.refresh();
    coordinator.refresh();
    expect(fetchOverview).toHaveBeenCalledOnce();

    first.resolve('superseded');
    await vi.waitFor(() => expect(fetchOverview).toHaveBeenCalledTimes(2));
    expect(onSnapshot).not.toHaveBeenCalled();

    second.resolve('latest');
    await vi.waitFor(() => expect(onSnapshot).toHaveBeenCalledWith('latest'));
    expect(maxActive).toBe(1);
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });

  it('coalesces semantic invalidations at the 300ms trailing edge', async () => {
    vi.useFakeTimers();
    const fetchOverview = vi.fn(async () => 'coalesced');
    const onSnapshot = vi.fn();
    const coordinator = new DashboardRefreshCoordinator({
      fetchOverview,
      initialWindow: '7d',
      onError: vi.fn(),
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    coordinator.invalidate();
    await vi.advanceTimersByTimeAsync(200);
    coordinator.invalidate();
    await vi.advanceTimersByTimeAsync(299);
    expect(fetchOverview).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    expect(fetchOverview).toHaveBeenCalledOnce();
    expect(onSnapshot).toHaveBeenCalledWith('coalesced');
  });

  it('aborts a changed window and rejects the superseded generation', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const signals: AbortSignal[] = [];
    const windows: string[] = [];
    const fetchOverview = vi.fn((window: string, signal: AbortSignal) => {
      windows.push(window);
      signals.push(signal);
      return fetchOverview.mock.calls.length === 1
        ? first.promise
        : second.promise;
    });
    const onSnapshot = vi.fn();
    const onError = vi.fn();
    const coordinator = new DashboardRefreshCoordinator({
      fetchOverview,
      initialWindow: '7d',
      onError,
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    coordinator.refresh();
    coordinator.changeWindow('30d');
    expect(signals[0]?.aborted).toBe(true);

    first.resolve('wrong-window');
    await vi.waitFor(() => expect(fetchOverview).toHaveBeenCalledTimes(2));
    second.resolve('right-window');
    await vi.waitFor(() =>
      expect(onSnapshot).toHaveBeenCalledWith('right-window'),
    );
    expect(windows).toEqual(['7d', '30d']);
    expect(onSnapshot).not.toHaveBeenCalledWith('wrong-window');
    expect(onError).not.toHaveBeenCalled();
  });

  it('aborts on dispose without publishing or scheduling trailing work', async () => {
    vi.useFakeTimers();
    const pending = deferred<string>();
    let signal: AbortSignal | undefined;
    const fetchOverview = vi.fn(
      async (_window: string, requestSignal: AbortSignal) => {
        signal = requestSignal;
        return pending.promise;
      },
    );
    const onSnapshot = vi.fn();
    const coordinator = new DashboardRefreshCoordinator({
      fetchOverview,
      initialWindow: '24h',
      onError: vi.fn(),
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    coordinator.refresh();
    coordinator.invalidate();
    coordinator.dispose();
    expect(signal?.aborted).toBe(true);

    pending.resolve('must-not-publish');
    await vi.runAllTimersAsync();
    await Promise.resolve();
    expect(fetchOverview).toHaveBeenCalledOnce();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('surfaces only the latest failure and releases pending state', async () => {
    const failure = new Error('dashboard unavailable');
    const onError = vi.fn();
    const onPendingChange = vi.fn();
    const coordinator = new DashboardRefreshCoordinator({
      fetchOverview: vi.fn(async () => {
        throw failure;
      }),
      initialWindow: '7d',
      onError,
      onPendingChange,
      onSnapshot: vi.fn(),
    });

    coordinator.refresh();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(failure));
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });
});
