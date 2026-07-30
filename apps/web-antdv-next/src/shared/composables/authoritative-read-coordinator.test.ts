import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthoritativeReadCoordinator } from './authoritative-read-coordinator';

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

describe('authoritative read coordinator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs one request at a time and resolves refresh after trailing work', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    let active = 0;
    let maxActive = 0;
    const fetchSnapshot = vi.fn(() => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      const pending = fetchSnapshot.mock.calls.length === 1 ? first : second;
      return pending.promise.finally(() => {
        active -= 1;
      });
    });
    const onSnapshot = vi.fn();
    const onPendingChange = vi.fn();
    const coordinator = new AuthoritativeReadCoordinator({
      fetchSnapshot,
      initialKey: '7d',
      onError: vi.fn(),
      onPendingChange,
      onSnapshot,
    });

    const completion = coordinator.refresh();
    void coordinator.refresh();
    void coordinator.refresh();
    expect(fetchSnapshot).toHaveBeenCalledOnce();

    first.resolve('superseded');
    await vi.waitFor(() => expect(fetchSnapshot).toHaveBeenCalledTimes(2));
    expect(onSnapshot).not.toHaveBeenCalled();

    second.resolve('latest');
    await completion;
    expect(onSnapshot).toHaveBeenCalledWith('latest');
    expect(maxActive).toBe(1);
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });

  it('coalesces semantic invalidations at the trailing edge', async () => {
    vi.useFakeTimers();
    const fetchSnapshot = vi.fn(async () => 'coalesced');
    const onSnapshot = vi.fn();
    const coordinator = new AuthoritativeReadCoordinator({
      fetchSnapshot,
      initialKey: '7d',
      onError: vi.fn(),
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    coordinator.invalidate();
    await vi.advanceTimersByTimeAsync(200);
    coordinator.invalidate();
    await vi.advanceTimersByTimeAsync(299);
    expect(fetchSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    expect(fetchSnapshot).toHaveBeenCalledOnce();
    expect(onSnapshot).toHaveBeenCalledWith('coalesced');
  });

  it('marks an active result stale before the trailing edge', async () => {
    vi.useFakeTimers();
    const first = deferred<string>();
    const second = deferred<string>();
    const fetchSnapshot = vi.fn(() =>
      fetchSnapshot.mock.calls.length === 1 ? first.promise : second.promise,
    );
    const onSnapshot = vi.fn();
    const coordinator = new AuthoritativeReadCoordinator({
      fetchSnapshot,
      initialKey: '7d',
      onError: vi.fn(),
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    const completion = coordinator.refresh();
    coordinator.invalidate();
    first.resolve('stale-before-trailing-edge');
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchSnapshot).toHaveBeenCalledOnce();
    expect(onSnapshot).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(299);
    expect(fetchSnapshot).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);

    second.resolve('authoritative');
    await completion;
    expect(onSnapshot).toHaveBeenCalledOnce();
    expect(onSnapshot).toHaveBeenCalledWith('authoritative');
  });

  it('aborts a changed key and rejects the superseded generation', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const signals: AbortSignal[] = [];
    const keys: string[] = [];
    const fetchSnapshot = vi.fn((key: string, signal: AbortSignal) => {
      keys.push(key);
      signals.push(signal);
      return fetchSnapshot.mock.calls.length === 1
        ? first.promise
        : second.promise;
    });
    const onSnapshot = vi.fn();
    const onError = vi.fn();
    const coordinator = new AuthoritativeReadCoordinator({
      fetchSnapshot,
      initialKey: '7d',
      onError,
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    void coordinator.refresh();
    coordinator.changeKey('30d');
    expect(signals[0]?.aborted).toBe(true);

    first.resolve('wrong-key');
    await vi.waitFor(() => expect(fetchSnapshot).toHaveBeenCalledTimes(2));
    second.resolve('right-key');
    await vi.waitFor(() => {
      expect(onSnapshot).toHaveBeenCalledWith('right-key');
    });
    expect(keys).toEqual(['7d', '30d']);
    expect(onSnapshot).not.toHaveBeenCalledWith('wrong-key');
    expect(onError).not.toHaveBeenCalled();
  });

  it('cancels without scheduling a replacement and remains reusable', async () => {
    const first = deferred<string>();
    const fetchSnapshot = vi
      .fn<(key: string, signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce(async (_key, signal) => {
        await first.promise;
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        return 'cancelled';
      })
      .mockResolvedValueOnce('recovered');
    const onSnapshot = vi.fn();
    const coordinator = new AuthoritativeReadCoordinator({
      fetchSnapshot,
      initialKey: '7d',
      onError: vi.fn(),
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    void coordinator.refresh();
    coordinator.cancel();
    first.resolve('release');
    await vi.waitFor(() => expect(fetchSnapshot).toHaveBeenCalledOnce());
    expect(onSnapshot).not.toHaveBeenCalled();

    await coordinator.refresh();
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(onSnapshot).toHaveBeenCalledWith('recovered');
  });

  it('synchronizes a paused key without starting transport work', async () => {
    const fetchSnapshot = vi.fn(async (key: string) => key);
    const onSnapshot = vi.fn();
    const coordinator = new AuthoritativeReadCoordinator({
      fetchSnapshot,
      initialKey: '7d',
      onError: vi.fn(),
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    coordinator.setKey('30d');
    expect(fetchSnapshot).not.toHaveBeenCalled();

    await coordinator.refresh();
    expect(fetchSnapshot).toHaveBeenCalledOnce();
    expect(fetchSnapshot).toHaveBeenCalledWith('30d', expect.any(AbortSignal));
    expect(onSnapshot).toHaveBeenCalledWith('30d');
  });

  it('aborts on dispose without publishing or scheduling trailing work', async () => {
    vi.useFakeTimers();
    const pending = deferred<string>();
    let signal: AbortSignal | undefined;
    const fetchSnapshot = vi.fn(
      async (_key: string, requestSignal: AbortSignal) => {
        signal = requestSignal;
        return pending.promise;
      },
    );
    const onSnapshot = vi.fn();
    const coordinator = new AuthoritativeReadCoordinator({
      fetchSnapshot,
      initialKey: '24h',
      onError: vi.fn(),
      onPendingChange: vi.fn(),
      onSnapshot,
    });

    void coordinator.refresh();
    coordinator.invalidate();
    coordinator.dispose();
    expect(signal?.aborted).toBe(true);

    pending.resolve('must-not-publish');
    await vi.runAllTimersAsync();
    await Promise.resolve();
    expect(fetchSnapshot).toHaveBeenCalledOnce();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('surfaces only the current failure and releases pending state', async () => {
    const failure = new Error('overview unavailable');
    const onError = vi.fn();
    const onPendingChange = vi.fn();
    const coordinator = new AuthoritativeReadCoordinator({
      fetchSnapshot: vi.fn(async () => {
        throw failure;
      }),
      initialKey: '7d',
      onError,
      onPendingChange,
      onSnapshot: vi.fn(),
    });

    await coordinator.refresh();
    expect(onError).toHaveBeenCalledWith(failure);
    expect(onPendingChange.mock.calls).toEqual([[true], [false]]);
  });
});
