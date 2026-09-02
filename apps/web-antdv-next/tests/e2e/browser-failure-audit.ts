import type { ConsoleMessage, Page, Request, Response } from 'playwright/test';

import type { SystemAlertEvent } from '@vben/types';

import type { NoticeCaptureWitness } from './notice-capture-witness';

import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';

const UNHANDLED_RUNTIME_BRIDGE = '__quantPivotReportUnhandledRuntime' as const;
const EXPECTED_RECONNECT_FAILURE =
  /ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|aborted/i;
const FORBIDDEN_RUNTIME_HOSTS = new Set([
  'api.iconify.design',
  'api.simplesvg.com',
  'api.unisvg.com',
]);
const ALERT_FIELDS = [
  'affects_trading',
  'category',
  'dedupe_secs',
  'idempotency_key',
  'level',
  'message',
  'source',
  'title',
  'visible_toast',
] as const;
// Bound retained alert evidence; the production protocol owns whole-frame limits.
const MAX_ALERT_BYTES = 16_384;
const MAX_ALERT_COUNT = 128;

export interface AlertWitness {
  readonly [field: string]: boolean | null | number | string;
}

interface ExpectedAlert {
  event: SystemAlertEvent;
  historyIndex: number;
  verify: (deadline: number) => Promise<AlertWitness>;
  witness: AlertWitness;
}

export interface ObservedSystemAlert {
  acknowledged_at: null | string;
  event: SystemAlertEvent;
  expected: boolean;
  received_at: string;
  timestamp: string;
  validated_at: null | string;
  witness: AlertWitness | null;
}

export function remainingBudget(deadline: number): number {
  const remaining = deadline - performance.now();
  if (remaining <= 0) throw new Error('UI semantic capture deadline expired');
  return remaining;
}

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

interface UnhandledRuntimeFailure {
  kind: 'unhandledrejection' | 'window.error';
  message: string;
}

export class BrowserFailureAudit {
  get failures(): readonly string[] {
    return this.#failures;
  }
  get systemAlerts(): readonly ObservedSystemAlert[] {
    return this.#systemAlerts;
  }
  #alertCapacityExceeded = false;
  readonly #alertWitnesses: AlertWitness[] = [];
  readonly #consoleAllowances: ConsoleAllowance[] = [];

  readonly #expectedAlerts: ExpectedAlert[] = [];
  readonly #failures: string[] = [];
  readonly #httpInFlight = new Map<Page, number>();
  readonly #httpWaiters = new Map<Page, Set<() => void>>();
  readonly #pages = new Set<Page>();
  readonly #requestFailureAllowances: ExpectedRequestFailure[] = [];
  readonly #responseAllowances: ExpectedResponse[] = [];
  readonly #systemAlerts: ObservedSystemAlert[] = [];

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

  assertExpectedNotices(witness: NoticeCaptureWitness): void {
    this.assertHealthy();
    if (witness.overflow || witness.notices.length === 0) {
      throw new Error(
        'A transient notice could not be identified within the capture witness',
      );
    }
    for (const notice of witness.notices) {
      const observed = this.#systemAlerts.findLast(
        (alert) =>
          alert.expected &&
          alert.event.title === notice.title &&
          alert.event.message === notice.message,
      );
      if (
        notice.kind !== 'notification' ||
        !notice.error ||
        !observed ||
        !this.#expectedAlerts.some((candidate) =>
          this.#sameAlert(candidate.event, observed.event),
        )
      ) {
        const failure = `unexpected transient notice inside captured pixels: ${JSON.stringify(notice)}`;
        this.#failures.push(failure);
        throw new Error(failure);
      }
    }
  }

  assertHealthy(): void {
    if (this.#failures.length > 0) throw new Error(this.#failures.join('\n'));
  }

  async assertNoTransientNotices(page: Page, deadline: number): Promise<void> {
    this.assertHealthy();
    remainingBudget(deadline);
    if (
      await page
        .locator('.ant-notification-notice, .ant-message-notice')
        .count()
    ) {
      throw new Error(
        'UI screenshot boundary still has an unacknowledged transient notice',
      );
    }
    remainingBudget(deadline);
  }

  async dismissExpectedAlerts(page: Page, deadline: number): Promise<boolean> {
    this.assertHealthy();
    await this.verifyExpectedState(deadline);
    if (page.isClosed()) return false;
    let dismissed = false;
    const notices = page.locator('.ant-notification-notice-error');
    while (await notices.count()) {
      remainingBudget(deadline);
      const notice = notices.first();
      const titleText = await notice
        .locator('.ant-notification-notice-title')
        .textContent({ timeout: remainingBudget(deadline) });
      const messageText = await notice
        .locator('.ant-notification-notice-description')
        .textContent({ timeout: remainingBudget(deadline) });
      const title = titleText?.trim();
      const message = messageText?.trim();
      const observed = this.#systemAlerts.findLast(
        (alert) =>
          alert.expected &&
          alert.event.title === title &&
          alert.event.message === message,
      );
      const expectation =
        observed &&
        this.#expectedAlerts.find((candidate) =>
          this.#sameAlert(candidate.event, observed.event),
        );
      if (!observed || !expectation) {
        const failure = `unexpected error notification without verified system.alert: ${title}: ${message}`;
        this.#failures.push(failure);
        throw new Error(failure);
      }
      // Hover is the normal UI mechanism to keep a toast available for inspection.
      await notice.hover({ timeout: remainingBudget(deadline) });
      const witness = await expectation.verify(deadline);
      remainingBudget(deadline);
      const element = await notice.elementHandle({
        timeout: remainingBudget(deadline),
      });
      if (!element)
        throw new Error(
          'Expected alert disappeared before user acknowledgement',
        );
      try {
        await notice
          .getByRole('button', { name: 'Close', exact: true })
          .click({ timeout: remainingBudget(deadline) });
        await element.waitForElementState('hidden', {
          timeout: remainingBudget(deadline),
        });
      } finally {
        await element.dispose();
      }
      observed.acknowledged_at = new Date().toISOString();
      observed.witness = structuredClone(witness);
      observed.validated_at = observed.acknowledged_at;
      dismissed = true;
      await page.mouse.move(0, 0);
      this.assertHealthy();
    }
    if (
      await page.locator('.ant-message-notice:has(.ant-message-error)').count()
    ) {
      const failure = 'unexpected error message at the UI evidence boundary';
      this.#failures.push(failure);
      throw new Error(failure);
    }
    remainingBudget(deadline);
    return dismissed;
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

  async revalidatePendingAlerts(deadline: number): Promise<void> {
    this.assertHealthy();
    for (const alert of this.#systemAlerts) {
      if (!alert.expected || alert.validated_at !== null) continue;
      const expectation = this.#expectedAlerts.find((candidate) =>
        this.#sameAlert(candidate.event, alert.event),
      );
      if (!expectation)
        throw new Error(
          'Expected alert outlived its explicit verification scope',
        );
      remainingBudget(deadline);
      const witness = await expectation.verify(deadline);
      remainingBudget(deadline);
      alert.witness = structuredClone(witness);
      alert.validated_at = new Date().toISOString();
      this.assertHealthy();
    }
  }

  semanticEvidence() {
    return {
      expected_fault_witnesses: structuredClone(this.#alertWitnesses),
      observed_system_alerts: structuredClone(this.#systemAlerts),
      unexpected_critical_count: this.#systemAlerts.filter(
        (alert) =>
          !alert.expected &&
          ['critical', 'emergency'].includes(alert.event.level),
      ).length,
    };
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

    page.on('websocket', (socket) => {
      socket.on('framereceived', ({ payload }) => {
        const text = payload.toString();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          this.#failures.push(
            'non-JSON WebSocket frame at the browser semantic boundary',
          );
          return;
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          this.#failures.push(
            'non-object WebSocket envelope at the browser semantic boundary',
          );
          return;
        }
        const envelope = parsed as {
          data?: unknown;
          timestamp?: unknown;
          type?: unknown;
        };
        if (envelope.type !== 'system.alert') return;
        if (this.#alertCapacityExceeded) return;
        if (
          Buffer.byteLength(text) > MAX_ALERT_BYTES ||
          this.#systemAlerts.length >= MAX_ALERT_COUNT
        ) {
          this.#alertCapacityExceeded = true;
          this.#failures.push('system.alert audit capacity exceeded');
          return;
        }
        const event = envelope.data;
        if (
          !this.#isSystemAlert(event) ||
          typeof envelope.timestamp !== 'string' ||
          Number.isNaN(Date.parse(envelope.timestamp))
        ) {
          this.#failures.push(
            'invalid system.alert envelope at the browser boundary',
          );
          return;
        }
        const expectation = this.#expectedAlerts.find((candidate) =>
          this.#sameAlert(candidate.event, event),
        );
        const registeredKey = this.#expectedAlerts.some(
          (candidate) =>
            candidate.event.idempotency_key === event.idempotency_key,
        );
        const expected = expectation !== undefined;
        this.#systemAlerts.push({
          acknowledged_at: null,
          event: structuredClone(event),
          expected,
          received_at: new Date().toISOString(),
          timestamp: envelope.timestamp,
          validated_at: null,
          witness: null,
        });
        if (
          !expected &&
          (registeredKey || ['critical', 'emergency'].includes(event.level))
        ) {
          this.#failures.push(
            `unexpected system.alert ${event.idempotency_key}: ${JSON.stringify(event)}`,
          );
        }
      });
    });

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
      UNHANDLED_RUNTIME_BRIDGE,
      ({ page: sourcePage }, detail: UnhandledRuntimeFailure) => {
        this.#failures.push(
          `${detail.kind} ${sourcePage.url()}: ${detail.message}`,
        );
      },
    );
    await page.addInitScript((bridgeName) => {
      const reportFailure = (detail: UnhandledRuntimeFailure) => {
        const bridge = (
          globalThis as unknown as Record<
            string,
            ((value: UnhandledRuntimeFailure) => Promise<void>) | undefined
          >
        )[bridgeName];
        if (!bridge) {
          console.error('browser runtime audit bridge is unavailable');
          return;
        }
        void bridge(detail);
      };
      globalThis.addEventListener('error', (event) => {
        const message =
          event.error instanceof Error
            ? `${event.error.name}: ${event.error.message}`
            : event.message || String(event.error);
        const source = event.filename
          ? ` @ ${event.filename}:${event.lineno}:${event.colno}`
          : '';
        reportFailure({ kind: 'window.error', message: `${message}${source}` });
      });
      globalThis.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        reportFailure({
          kind: 'unhandledrejection',
          message:
            reason instanceof Error
              ? `${reason.name}: ${reason.message}`
              : String(reason),
        });
      });
    }, UNHANDLED_RUNTIME_BRIDGE);
    page.on('close', () => {
      this.#httpInFlight.set(page, 0);
      this.#resolveDrains(page);
    });
  }

  async verifyExpectedState(deadline: number): Promise<void> {
    this.assertHealthy();
    for (const expectation of this.#expectedAlerts) {
      remainingBudget(deadline);
      const witness = await expectation.verify(deadline);
      remainingBudget(deadline);
      expectation.witness = structuredClone(witness);
      this.#alertWitnesses[expectation.historyIndex] = structuredClone(witness);
    }
    await this.revalidatePendingAlerts(deadline);
  }

  async withExpectedAlert<T>(
    event: SystemAlertEvent,
    verify: (deadline: number) => Promise<AlertWitness>,
    action: () => Promise<T>,
  ): Promise<T> {
    const witness = await verify(performance.now() + 10_000);
    const expectation = {
      event: structuredClone(event),
      historyIndex: this.#alertWitnesses.length,
      verify,
      witness: structuredClone(witness),
    };
    this.#expectedAlerts.push(expectation);
    this.#alertWitnesses.push(structuredClone(witness));
    try {
      const result = await action();
      await this.revalidatePendingAlerts(performance.now() + 10_000);
      return result;
    } finally {
      this.#expectedAlerts.splice(this.#expectedAlerts.indexOf(expectation), 1);
    }
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

  #isSystemAlert(value: unknown): value is SystemAlertEvent {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return false;
    const event = value as Record<string, unknown>;
    return (
      Object.keys(event).toSorted().join(',') === ALERT_FIELDS.join(',') &&
      [
        'idempotency_key',
        'category',
        'level',
        'message',
        'source',
        'title',
      ].every((key) => typeof event[key] === 'string') &&
      ['critical', 'emergency', 'info', 'warning'].includes(
        String(event.level),
      ) &&
      [
        'infrastructure',
        'operator_notice',
        'scheduler_health',
        'trading_safety',
      ].includes(String(event.category)) &&
      [
        'data_pipeline',
        'execution',
        'health_checker',
        'report_generator',
        'risk_engine',
        'scheduler',
        'settlement',
        'system',
      ].includes(String(event.source)) &&
      typeof event.affects_trading === 'boolean' &&
      typeof event.visible_toast === 'boolean' &&
      typeof event.dedupe_secs === 'number' &&
      Number.isSafeInteger(event.dedupe_secs) &&
      event.dedupe_secs >= 0
    );
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

  #sameAlert(left: SystemAlertEvent, right: SystemAlertEvent): boolean {
    return ALERT_FIELDS.every((field) => left[field] === right[field]);
  }
}
