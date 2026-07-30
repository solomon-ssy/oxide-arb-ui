const DEFAULT_SEMANTIC_COALESCE_MS = 300;

export interface AuthoritativeReadCoordinatorOptions<Key, Snapshot> {
  coalesceMs?: number;
  fetchSnapshot: (key: Key, signal: AbortSignal) => Promise<Snapshot>;
  initialKey: Key;
  onError: (error: unknown) => void;
  onPendingChange: (pending: boolean) => void;
  onSnapshot: (snapshot: Snapshot) => void;
}

interface ActiveAuthoritativeRead {
  controller: AbortController;
  generation: number;
}

/**
 * Serializes authoritative reads and collapses invalidation bursts.
 *
 * A semantic invalidation never aborts useful transport work. It marks the
 * active result stale and schedules exactly one trailing read. Key changes are
 * different: their old response can no longer be used, so they cancel it.
 */
export class AuthoritativeReadCoordinator<Key, Snapshot> {
  private active: ActiveAuthoritativeRead | null = null;
  private coalesceTimer: ReturnType<typeof setTimeout> | undefined;
  private desiredGeneration = 0;
  private dirty = false;
  private disposed = false;
  private readonly idleWaiters = new Set<() => void>();
  private key: Key;
  private pending = false;

  constructor(
    private readonly options: AuthoritativeReadCoordinatorOptions<
      Key,
      Snapshot
    >,
  ) {
    this.key = options.initialKey;
  }

  /** Cancel current work without permanently disposing the coordinator. */
  cancel() {
    if (this.disposed) {
      return;
    }
    this.desiredGeneration += 1;
    this.dirty = false;
    this.clearCoalesceTimer();
    if (this.active) {
      this.active.controller.abort();
    } else {
      this.setPending(false);
    }
  }

  /** Cancel a superseded key and queue one read for the latest key. */
  changeKey(key: Key) {
    if (!this.replaceKey(key)) {
      return;
    }
    this.enqueue(true);
  }

  /** Stop timers and prevent any in-flight result from being published. */
  dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.desiredGeneration += 1;
    this.dirty = false;
    this.clearCoalesceTimer();
    this.active?.controller.abort();
    this.resolveIdle();
  }

  /** Coalesce semantic invalidations at one 300ms trailing edge. */
  invalidate() {
    if (this.disposed) {
      return;
    }
    this.desiredGeneration += 1;
    this.dirty = true;
    this.clearCoalesceTimer();
    this.coalesceTimer = setTimeout(() => {
      this.coalesceTimer = undefined;
      if (this.active) {
        return;
      }
      this.dirty = false;
      this.start();
    }, this.options.coalesceMs ?? DEFAULT_SEMANTIC_COALESCE_MS);
  }

  /** Request an authoritative read immediately and wait for trailing work. */
  refresh(): Promise<void> {
    if (this.disposed) {
      return Promise.resolve();
    }
    this.clearCoalesceTimer();
    this.enqueue(false);
    return this.whenIdle();
  }

  /** Replace a paused key without starting transport work. */
  setKey(key: Key) {
    if (!this.replaceKey(key)) {
      return;
    }
    this.desiredGeneration += 1;
    this.dirty = false;
    if (this.active) {
      this.active.controller.abort();
    } else {
      this.setPending(false);
    }
  }

  private canPublish(active: ActiveAuthoritativeRead) {
    return (
      !this.disposed &&
      !this.dirty &&
      this.active?.generation === active.generation &&
      active.generation === this.desiredGeneration
    );
  }

  private clearCoalesceTimer() {
    if (this.coalesceTimer === undefined) {
      return;
    }
    clearTimeout(this.coalesceTimer);
    this.coalesceTimer = undefined;
  }

  private enqueue(abortActive: boolean) {
    this.desiredGeneration += 1;
    if (this.active) {
      this.dirty = true;
      if (abortActive) {
        this.active.controller.abort();
      }
      return;
    }
    this.start();
  }

  private async execute(active: ActiveAuthoritativeRead, key: Key) {
    try {
      const snapshot = await this.options.fetchSnapshot(
        key,
        active.controller.signal,
      );
      if (this.canPublish(active)) {
        this.options.onSnapshot(snapshot);
      }
    } catch (error) {
      if (this.canPublish(active) && !active.controller.signal.aborted) {
        this.options.onError(error);
      }
    } finally {
      if (this.active?.generation === active.generation) {
        this.active = null;
      }
      if (!this.disposed) {
        if (this.dirty && this.coalesceTimer === undefined) {
          this.dirty = false;
          this.start();
        } else if (!this.dirty) {
          this.setPending(false);
        }
      }
    }
  }

  private replaceKey(key: Key) {
    if (this.disposed || Object.is(key, this.key)) {
      return false;
    }
    this.key = key;
    this.clearCoalesceTimer();
    return true;
  }

  private resolveIdle() {
    for (const resolve of this.idleWaiters) {
      resolve();
    }
    this.idleWaiters.clear();
  }

  private setPending(pending: boolean) {
    if (this.pending === pending) {
      return;
    }
    this.pending = pending;
    this.options.onPendingChange(pending);
    if (!pending) {
      this.resolveIdle();
    }
  }

  private start() {
    if (this.disposed || this.active) {
      return;
    }
    const active = {
      controller: new AbortController(),
      generation: this.desiredGeneration,
    };
    const key = this.key;
    this.active = active;
    this.dirty = false;
    this.setPending(true);
    void this.execute(active, key);
  }

  private whenIdle(): Promise<void> {
    if (!this.pending && this.active === null) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.idleWaiters.add(resolve));
  }
}
