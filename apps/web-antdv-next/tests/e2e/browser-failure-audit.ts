import type { ConsoleMessage, Page, Request, Response } from 'playwright/test';

const UNHANDLED_REJECTION_BRIDGE =
  '__quantPivotReportUnhandledRejection' as const;
const EXPECTED_RECONNECT_FAILURE =
  /ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|aborted/i;
const FORBIDDEN_RUNTIME_HOSTS = new Set([
  'api.iconify.design',
  'api.simplesvg.com',
  'api.unisvg.com',
]);

export interface ExpectedResponse {
  method: string;
  pathname: RegExp | string;
  status: number;
}

export interface ExpectedConsole {
  text: RegExp | string;
  type: 'error' | 'warning';
}

export interface ExpectedRequestFailure {
  errorText: string;
  method: string;
  pathname: string;
  search: string;
}

interface ConsoleAllowance {
  consumed: boolean;
  expected: ExpectedConsole;
}

export class BrowserFailureAudit {
  get failures(): readonly string[] {
    return this.#failures;
  }
  readonly #consoleAllowances: ConsoleAllowance[] = [];
  readonly #failures: string[] = [];
  readonly #httpInFlight = new Map<Page, number>();
  readonly #httpWaiters = new Map<Page, Set<() => void>>();

  readonly #pages = new Set<Page>();
  readonly #requestFailureAllowances: ExpectedRequestFailure[] = [];
  readonly #responseAllowances: ExpectedResponse[] = [];
  #webSocketReconnectDepth = 0;

  async allowConsole<T>(
    expected: ExpectedConsole,
    action: () => Promise<T>,
  ): Promise<T> {
    const allowance = { consumed: false, expected };
    this.#consoleAllowances.push(allowance);
    try {
      return await action();
    } finally {
      const index = this.#consoleAllowances.lastIndexOf(allowance);
      if (index !== -1) {
        this.#consoleAllowances.splice(index, 1);
      }
      if (!allowance.consumed) {
        const text =
          typeof expected.text === 'string'
            ? expected.text
            : expected.text.toString();
        this.#failures.push(
          `expected console.${expected.type} was not observed: ${text}`,
        );
      }
    }
  }

  async allowRequestFailures<T>(
    allowances: readonly ExpectedRequestFailure[],
    action: () => Promise<T>,
  ): Promise<T> {
    this.#requestFailureAllowances.push(...allowances);
    try {
      return await action();
    } finally {
      for (const allowance of allowances) {
        const index = this.#requestFailureAllowances.lastIndexOf(allowance);
        if (index !== -1) {
          this.#requestFailureAllowances.splice(index, 1);
        }
      }
    }
  }

  async allowResponse<T>(
    allowance: ExpectedResponse,
    action: () => Promise<T>,
  ): Promise<T> {
    this.#responseAllowances.push(allowance);
    try {
      return await action();
    } finally {
      const index = this.#responseAllowances.lastIndexOf(allowance);
      if (index !== -1) {
        this.#responseAllowances.splice(index, 1);
      }
    }
  }

  async allowWebSocketReconnect<T>(action: () => Promise<T>): Promise<T> {
    this.#webSocketReconnectDepth += 1;
    try {
      return await action();
    } finally {
      this.#webSocketReconnectDepth -= 1;
    }
  }

  async drainHttp(page: Page): Promise<void> {
    while (!page.isClosed()) {
      await page.evaluate(() => undefined);
      if ((this.#httpInFlight.get(page) ?? 0) === 0) {
        return;
      }
      await new Promise<void>((resolve) => {
        const waiters = this.#httpWaiters.get(page);
        if (!waiters) {
          resolve();
          return;
        }
        waiters.add(resolve);
        if ((this.#httpInFlight.get(page) ?? 0) === 0) {
          waiters.delete(resolve);
          resolve();
        }
      });
    }
  }

  async settle(): Promise<void> {
    for (const page of this.#pages) {
      if (!page.isClosed()) {
        await page.waitForTimeout(0);
      }
    }
  }

  async track(page: Page): Promise<void> {
    if (this.#pages.has(page)) {
      return;
    }
    this.#pages.add(page);
    this.#httpInFlight.set(page, 0);
    this.#httpWaiters.set(page, new Set());

    page.on('console', (message) => {
      const type = message.type();
      if (
        (type !== 'error' && type !== 'warning') ||
        this.#allowsConsole(message)
      ) {
        return;
      }
      const location = message.location();
      const source = location.url
        ? ` @ ${location.url}:${location.lineNumber ?? 0}`
        : '';
      this.#failures.push(`console.${type}: ${message.text()}${source}`);
    });
    page.on('pageerror', (error) => {
      this.#failures.push(`pageerror: ${error.message}`);
    });
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (FORBIDDEN_RUNTIME_HOSTS.has(url.hostname)) {
        this.#failures.push(
          `forbidden-runtime-request ${request.method()} ${request.url()}`,
        );
      }
      if (request.resourceType() !== 'websocket') {
        this.#httpInFlight.set(page, (this.#httpInFlight.get(page) ?? 0) + 1);
      }
    });
    page.on('requestfailed', (request) => {
      if (!this.#allowsRequestFailure(request)) {
        const failure =
          request.failure()?.errorText ?? 'unknown request failure';
        this.#failures.push(
          `requestfailed ${request.method()} ${request.url()}: ${failure}`,
        );
      }
      this.#finishHttp(page, request);
    });
    page.on('requestfinished', (request) => {
      this.#finishHttp(page, request);
    });
    page.on('response', (response) => {
      if (response.status() >= 400 && !this.#allowsResponse(response)) {
        this.#failures.push(
          `response ${response.status()} ${response.request().method()} ${response.url()}`,
        );
      }
    });
    await page.exposeBinding(
      UNHANDLED_REJECTION_BRIDGE,
      ({ page: sourcePage }, detail: string) => {
        this.#failures.push(
          `unhandledrejection ${sourcePage.url()}: ${detail}`,
        );
      },
    );
    await page.addInitScript((bridgeName) => {
      globalThis.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const detail =
          reason instanceof Error
            ? `${reason.name}: ${reason.message}`
            : String(reason);
        const bridge = (
          globalThis as unknown as Record<
            string,
            ((value: string) => Promise<void>) | undefined
          >
        )[bridgeName];
        if (!bridge) {
          throw new TypeError('browser rejection audit bridge is unavailable');
        }
        void bridge(detail);
      });
    }, UNHANDLED_REJECTION_BRIDGE);
    page.on('close', () => {
      this.#httpInFlight.set(page, 0);
      this.#resolveDrains(page);
    });
  }

  #allowsConsole(message: ConsoleMessage): boolean {
    const exactAllowance = this.#consoleAllowances.find((allowance) => {
      if (allowance.consumed || allowance.expected.type !== message.type()) {
        return false;
      }
      return this.#matchesText(message.text(), allowance.expected.text);
    });
    if (exactAllowance) {
      exactAllowance.consumed = true;
      return true;
    }
    if (
      message.type() !== 'error' ||
      !message.text().startsWith('Failed to load resource:')
    ) {
      return false;
    }
    const sourceUrl = message.location().url;
    if (!sourceUrl) {
      return false;
    }
    const url = new URL(sourceUrl);
    const allowedRequestFailure = this.#requestFailureAllowances.some(
      (allowance) =>
        message.text().includes(allowance.errorText) &&
        url.pathname === allowance.pathname &&
        url.search === allowance.search,
    );
    if (allowedRequestFailure) {
      return true;
    }
    return this.#responseAllowances.some(
      (allowance) =>
        message.text().includes(`status of ${allowance.status}`) &&
        this.#matchesPath(url.pathname, allowance.pathname),
    );
  }

  #allowsRequestFailure(request: Request): boolean {
    const failure = request.failure()?.errorText ?? '';
    if (
      this.#webSocketReconnectDepth > 0 &&
      request.resourceType() === 'websocket' &&
      EXPECTED_RECONNECT_FAILURE.test(failure)
    ) {
      return true;
    }
    const url = new URL(request.url());
    return this.#requestFailureAllowances.some(
      (allowance) =>
        failure === allowance.errorText &&
        request.method() === allowance.method &&
        url.pathname === allowance.pathname &&
        url.search === allowance.search,
    );
  }

  #allowsResponse(response: Response): boolean {
    const method = response.request().method();
    const pathname = new URL(response.url()).pathname;
    return this.#responseAllowances.some((allowance) => {
      return (
        response.status() === allowance.status &&
        method === allowance.method &&
        this.#matchesPath(pathname, allowance.pathname)
      );
    });
  }

  #finishHttp(page: Page, request: Request): void {
    if (request.resourceType() === 'websocket') {
      return;
    }
    const remaining = Math.max(0, (this.#httpInFlight.get(page) ?? 0) - 1);
    this.#httpInFlight.set(page, remaining);
    if (remaining === 0) {
      this.#resolveDrains(page);
    }
  }

  #matchesPath(pathname: string, expected: RegExp | string): boolean {
    if (typeof expected === 'string') {
      return pathname === expected;
    }
    expected.lastIndex = 0;
    return expected.test(pathname);
  }

  #matchesText(text: string, expected: RegExp | string): boolean {
    if (typeof expected === 'string') {
      return text === expected;
    }
    expected.lastIndex = 0;
    return expected.test(text);
  }

  #resolveDrains(page: Page): void {
    const waiters = this.#httpWaiters.get(page);
    if (!waiters) {
      return;
    }
    for (const resolve of waiters) {
      resolve();
    }
    waiters.clear();
  }
}
