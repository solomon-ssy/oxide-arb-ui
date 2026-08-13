import type { Buffer } from 'node:buffer';
import type {
  APIResponse,
  Page,
  Request,
  Route,
  WebSocketRoute,
} from 'playwright/test';

type DashboardReadKind = 'dashboard' | 'feedback';

interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

interface DashboardAuthorityEnvelope {
  authority: {
    state: string;
    value?: {
      system?: {
        active_markets?: number;
      };
    };
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

interface SocketConnection {
  client: WebSocketRoute;
  server: WebSocketRoute;
}

export interface WsFrame {
  action?: string;
  data?: unknown;
  type?: string;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function readKind(request: Request): DashboardReadKind | null {
  if (request.method() !== 'GET') {
    return null;
  }
  const pathname = new URL(request.url()).pathname;
  if (pathname === '/api/dashboard/overview') {
    return 'dashboard';
  }
  return pathname === '/api/research/feedback-overview' ? 'feedback' : null;
}

function parseFrame(message: Buffer | string): null | WsFrame {
  try {
    return JSON.parse(message.toString()) as WsFrame;
  } catch {
    return null;
  }
}

export class DashboardRequestLedger {
  readonly failures = new Map<Request, string>();
  readonly requests: Record<DashboardReadKind, Request[]> = {
    dashboard: [],
    feedback: [],
  };

  readonly #active: Record<DashboardReadKind, number> = {
    dashboard: 0,
    feedback: 0,
  };
  readonly #peak: Record<DashboardReadKind, number> = {
    dashboard: 0,
    feedback: 0,
  };

  constructor(page: Page) {
    page.on('request', (request) => {
      const kind = readKind(request);
      if (kind === null) {
        return;
      }
      this.requests[kind].push(request);
      this.#active[kind] += 1;
      this.#peak[kind] = Math.max(this.#peak[kind], this.#active[kind]);
    });
    page.on('requestfailed', (request) => {
      const kind = readKind(request);
      if (kind === null) {
        return;
      }
      this.failures.set(
        request,
        request.failure()?.errorText ?? 'unknown request failure',
      );
      this.#finish(kind);
    });
    page.on('requestfinished', (request) => {
      const kind = readKind(request);
      if (kind !== null) {
        this.#finish(kind);
      }
    });
  }

  count(kind: DashboardReadKind): number {
    return this.requests[kind].length;
  }

  peak(kind: DashboardReadKind): number {
    return this.#peak[kind];
  }

  resetPeaks(): void {
    for (const kind of ['dashboard', 'feedback'] as const) {
      if (this.#active[kind] !== 0) {
        throw new Error(`cannot reset ${kind} peak while a request is active`);
      }
      this.#peak[kind] = 0;
    }
  }

  #finish(kind: DashboardReadKind): void {
    this.#active[kind] = Math.max(0, this.#active[kind] - 1);
  }
}

export class HeldDashboardRead {
  get completion(): Promise<void> {
    return this.#done.promise;
  }
  readonly #done = deferred<undefined>();
  #released = false;
  readonly #response: APIResponse;

  readonly #route: Route;

  constructor(
    readonly kind: DashboardReadKind,
    readonly request: Request,
    response: APIResponse,
    route: Route,
  ) {
    this.#response = response;
    this.#route = route;
  }

  async fail(status: number): Promise<void> {
    await this.#release(async () => {
      await this.#route.fulfill({
        body: JSON.stringify({
          code: status,
          data: null,
          message: 'w4_e05_controlled_failure',
        }),
        contentType: 'application/json',
        status,
      });
    });
  }

  async release(): Promise<void> {
    await this.#release(async () => {
      await this.#route.fulfill({ response: this.#response });
    });
  }

  async releaseAfterAbort(): Promise<void> {
    await this.#release(async () => {
      try {
        await this.#route.fulfill({ response: this.#response });
      } catch {
        // The test separately requires this exact Request to appear in the
        // requestfailed ledger. A routed request already cancelled by the
        // browser no longer has a response channel to fulfill.
      }
    });
  }

  async releaseWithActiveMarkets(activeMarkets: number): Promise<void> {
    if (this.kind !== 'dashboard') {
      throw new TypeError('only Dashboard responses carry active_markets');
    }
    const envelope =
      (await this.#response.json()) as ApiEnvelope<DashboardAuthorityEnvelope>;
    const system = envelope.data.authority.value?.system;
    if (
      (envelope.data.authority.state !== 'ready' &&
        envelope.data.authority.state !== 'stale') ||
      system === undefined ||
      typeof system.active_markets !== 'number'
    ) {
      throw new TypeError(
        'Dashboard response does not expose a ready/stale active_markets value',
      );
    }
    system.active_markets = activeMarkets;
    await this.#release(async () => {
      await this.#route.fulfill({
        json: envelope,
        response: this.#response,
      });
    });
  }

  async #release(action: () => Promise<void>): Promise<void> {
    if (this.#released) {
      throw new Error(`controlled ${this.kind} response was released twice`);
    }
    this.#released = true;
    try {
      await action();
    } finally {
      this.#done.resolve(undefined);
    }
  }
}

export class DashboardResponseOwner {
  readonly #holds: Record<
    DashboardReadKind,
    Array<Deferred<HeldDashboardRead>>
  > = {
    dashboard: [],
    feedback: [],
  };

  static async install(page: Page): Promise<DashboardResponseOwner> {
    const owner = new DashboardResponseOwner();
    await page.route(
      /\/api\/(?:dashboard\/overview|research\/feedback-overview)(?:\?.*)?$/,
      async (route) => {
        await owner.#handle(route);
      },
    );
    return owner;
  }

  holdNext(kind: DashboardReadKind): Promise<HeldDashboardRead> {
    const hold = deferred<HeldDashboardRead>();
    this.#holds[kind].push(hold);
    return hold.promise;
  }

  holdSnapshot(): Promise<[HeldDashboardRead, HeldDashboardRead]> {
    return Promise.all([this.holdNext('dashboard'), this.holdNext('feedback')]);
  }

  async #handle(route: Route): Promise<void> {
    const kind = readKind(route.request());
    if (kind === null) {
      await route.continue();
      return;
    }
    const hold = this.#holds[kind].shift();
    if (hold === undefined) {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const controlled = new HeldDashboardRead(
      kind,
      route.request(),
      response,
      route,
    );
    hold.resolve(controlled);
    await controlled.completion;
  }
}

export class DashboardWebSocketOwner {
  readonly received: WsFrame[] = [];
  readonly sent: WsFrame[] = [];
  get connectionCount(): number {
    return this.#connections.length;
  }
  #blockPong = false;
  readonly #connections: SocketConnection[] = [];

  #isolateInbound = false;

  static async install(page: Page): Promise<DashboardWebSocketOwner> {
    const owner = new DashboardWebSocketOwner();
    await page.routeWebSocket(/\/api\/ws(?:\?.*)?$/, (client) => {
      const server = client.connectToServer();
      owner.#connections.push({ client, server });
      client.onMessage((message) => {
        const frame = parseFrame(message);
        if (frame !== null) {
          owner.sent.push(frame);
        }
        server.send(message);
      });
      server.onMessage((message) => {
        const frame = parseFrame(message);
        if (frame !== null) {
          owner.received.push(frame);
        }
        if (owner.#isolateInbound && frame?.type !== 'pong') {
          return;
        }
        if (owner.#blockPong && frame?.type === 'pong') {
          return;
        }
        client.send(message);
      });
    });
    return owner;
  }

  blockPong(blocked: boolean): void {
    this.#blockPong = blocked;
  }

  async closeServer(): Promise<void> {
    const connection = this.#latest();
    await connection.client.close({
      code: 1012,
      reason: 'w4-e05 controlled service restart',
    });
  }

  isolateInbound(): void {
    this.#isolateInbound = true;
  }

  send(frame: WsFrame): void {
    this.#latest().client.send(JSON.stringify(frame));
  }

  sentCount(action: string): number {
    return this.sent.filter((frame) => frame.action === action).length;
  }

  #latest(): SocketConnection {
    const connection = this.#connections.at(-1);
    if (connection === undefined) {
      throw new Error('no controlled WebSocket connection is available');
    }
    return connection;
  }
}

const TEST_ENVIRONMENT_KEY = '__quantPivotW4DashboardEnvironment';

interface ControlledBrowserEnvironment {
  setOnline: (online: boolean) => void;
  setVisibility: (visibility: DocumentVisibilityState) => void;
}

export async function installControlledBrowserEnvironment(
  page: Page,
): Promise<void> {
  await page.addInitScript((key) => {
    let online = true;
    let visibility: DocumentVisibilityState = 'visible';
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => online,
    });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => visibility === 'hidden',
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
    const environment: ControlledBrowserEnvironment = {
      setOnline(next) {
        if (online === next) {
          return;
        }
        online = next;
        globalThis.dispatchEvent(new Event(next ? 'online' : 'offline'));
      },
      setVisibility(next) {
        if (visibility === next) {
          return;
        }
        visibility = next;
        document.dispatchEvent(new Event('visibilitychange'));
      },
    };
    (
      globalThis as Record<string, ControlledBrowserEnvironment> &
        typeof globalThis
    )[key] = environment;
  }, TEST_ENVIRONMENT_KEY);
}

export async function setControlledOnline(
  page: Page,
  online: boolean,
): Promise<void> {
  await page.evaluate(
    ([key, next]) => {
      (
        globalThis as Record<string, ControlledBrowserEnvironment> &
          typeof globalThis
      )[key]?.setOnline(next);
    },
    [TEST_ENVIRONMENT_KEY, online] as const,
  );
}

export async function setControlledVisibility(
  page: Page,
  visibility: DocumentVisibilityState,
): Promise<void> {
  await page.evaluate(
    ([key, next]) => {
      (
        globalThis as Record<string, ControlledBrowserEnvironment> &
          typeof globalThis
      )[key]?.setVisibility(next);
    },
    [TEST_ENVIRONMENT_KEY, visibility] as const,
  );
}
