import type { DashboardWindow } from '@vben/types';

const DEFAULT_SEMANTIC_COALESCE_MS = 300;

export interface DashboardRefreshCoordinatorOptions<T> {
  coalesceMs?: number;
  fetchOverview: (window: DashboardWindow, signal: AbortSignal) => Promise<T>;
  initialWindow: DashboardWindow;
  onError: (error: unknown) => void;
  onPendingChange: (pending: boolean) => void;
  onSnapshot: (snapshot: T) => void;
}

interface ActiveDashboardRefresh {
  controller: AbortController;
  generation: number;
}

/**
 * Owns Dashboard overview request ordering, cancellation, and invalidation
 * coalescing. At most one transport request is active at a time.
 */
export class DashboardRefreshCoordinator<T> {
  private active: ActiveDashboardRefresh | null = null;
  private coalesceTimer: ReturnType<typeof setTimeout> | undefined;
  private desiredGeneration = 0;
  private dirty = false;
  private disposed = false;
  private pending = false;
  private window: DashboardWindow;

  constructor(private readonly options: DashboardRefreshCoordinatorOptions<T>) {
    this.window = options.initialWindow;
  }

  /** Abort a superseded window and queue one read for the latest window. */
  changeWindow(window: DashboardWindow) {
    if (this.disposed || window === this.window) {
      return;
    }
    this.window = window;
    this.clearCoalesceTimer();
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
  }

  /** Coalesce semantic invalidations at one 300ms trailing edge. */
  invalidate() {
    if (this.disposed) {
      return;
    }
    this.clearCoalesceTimer();
    this.coalesceTimer = setTimeout(() => {
      this.coalesceTimer = undefined;
      this.enqueue(false);
    }, this.options.coalesceMs ?? DEFAULT_SEMANTIC_COALESCE_MS);
  }

  /** Request an authoritative read immediately. */
  refresh() {
    if (this.disposed) {
      return;
    }
    this.clearCoalesceTimer();
    this.enqueue(false);
  }

  private canPublish(active: ActiveDashboardRefresh) {
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

  private async execute(
    active: ActiveDashboardRefresh,
    window: DashboardWindow,
  ) {
    try {
      const snapshot = await this.options.fetchOverview(
        window,
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
        if (this.dirty || active.generation !== this.desiredGeneration) {
          this.dirty = false;
          this.start();
        } else {
          this.setPending(false);
        }
      }
    }
  }

  private setPending(pending: boolean) {
    if (this.pending === pending) {
      return;
    }
    this.pending = pending;
    this.options.onPendingChange(pending);
  }

  private start() {
    if (this.disposed || this.active) {
      return;
    }
    const active = {
      controller: new AbortController(),
      generation: this.desiredGeneration,
    };
    const window = this.window;
    this.active = active;
    this.dirty = false;
    this.setPending(true);
    void this.execute(active, window);
  }
}
