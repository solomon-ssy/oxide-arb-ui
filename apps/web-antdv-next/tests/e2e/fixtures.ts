import type { Buffer } from 'node:buffer';
import type { APIRequestContext, Page, WebSocket } from 'playwright/test';

import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, request } from 'playwright/test';

import { BrowserFailureAudit } from './browser-failure-audit';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'system-test-bootstrap-admin';

interface AuthenticatedApi {
  context: APIRequestContext;
  token: string;
}

interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

interface ApiPage<T> {
  has_next: boolean;
  items: T[];
  page: number;
  size: number;
  total: number;
}

interface BrowserFixtures {
  authenticatedPage: Page;
  browserAudit: BrowserFailureAudit;
}

export interface WebSocketAuditFrame {
  action?: string;
  after_revision?: number;
  channel?: string;
  data?: {
    job_id?: string;
    revision?: number;
    status?: string;
    subject_id?: string;
  };
  type?: string;
}

export interface WebSocketAudit {
  received: WebSocketAuditFrame[];
  sent: WebSocketAuditFrame[];
  sockets: WebSocket[];
}

interface WorkerFixtures {
  adminApi: AuthenticatedApi;
  backendUrl: string;
  namespace: string;
}

export const test = base.extend<BrowserFixtures, WorkerFixtures>({
  adminApi: [
    async ({ backendUrl }, use) => {
      const bootstrap = await request.newContext({ baseURL: backendUrl });
      const response = await bootstrap.post('/api/auth/login', {
        data: { password: ADMIN_PASSWORD, username: ADMIN_USERNAME },
        headers: { 'accept-api-version': 'v1' },
      });
      expect(response.ok(), await response.text()).toBeTruthy();
      const payload = (await response.json()) as {
        data: { access_token: string };
      };
      await bootstrap.dispose();

      const context = await request.newContext({
        baseURL: backendUrl,
        extraHTTPHeaders: {
          'accept-api-version': 'v1',
          authorization: `Bearer ${payload.data.access_token}`,
        },
      });
      await use({ context, token: payload.data.access_token });
      await context.dispose();
    },
    { scope: 'worker' },
  ],
  authenticatedPage: async ({ browserAudit, page }, use) => {
    await browserAudit.track(page);
    await login(page);
    await use(page);
  },
  browserAudit: [
    async ({ page }, use) => {
      const audit = new BrowserFailureAudit();
      await audit.track(page);
      await use(audit);
      await audit.settle();
      expect(audit.failures, audit.failures.join('\n')).toEqual([]);
    },
    { auto: true },
  ],
  backendUrl: [
    async ({}, use) => {
      await use(process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://127.0.0.1:8088');
    },
    { scope: 'worker' },
  ],
  namespace: [
    async ({}, use, workerInfo) => {
      await use(`pw-${process.pid}-${workerInfo.workerIndex}`);
    },
    { scope: 'worker' },
  ],
});

export { expect } from 'playwright/test';

function parseWebSocketFrame(payload: Buffer | string) {
  try {
    return JSON.parse(payload.toString()) as WebSocketAuditFrame;
  } catch {
    return null;
  }
}

export function installWebSocketAudit(page: Page): WebSocketAudit {
  const received: WebSocketAuditFrame[] = [];
  const sent: WebSocketAuditFrame[] = [];
  const sockets: WebSocket[] = [];

  page.on('websocket', (socket) => {
    sockets.push(socket);
    socket.on('framesent', ({ payload }) => {
      const frame = parseWebSocketFrame(payload);
      if (frame) sent.push(frame);
    });
    socket.on('framereceived', ({ payload }) => {
      const frame = parseWebSocketFrame(payload);
      if (frame) received.push(frame);
    });
  });

  return { received, sent, sockets };
}

export async function login(page: Page) {
  await loginAs(page, ADMIN_USERNAME, ADMIN_PASSWORD);
}

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/auth/login');
  await page.locator("input[name='username']").fill(username);
  await page.locator("input[name='password']").fill(password);
  await page.getByRole('button', { name: /登录|Login/i }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/dashboard');
  await waitForShell(page);
  await expect(page.getByTestId('dashboard-command-center')).toBeVisible();
}

export async function waitForShell(page: Page) {
  await expect(page.getByText(/加载菜单中|Loading menu/i)).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.locator('.ant-skeleton')).toHaveCount(0, {
    timeout: 15_000,
  });
}

export async function expectAccessible(page: Page, selector: string) {
  const result = await new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = result.violations.filter(
    ({ impact }) => impact === 'critical' || impact === 'serious',
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

export async function readFirstApiItem<T>(
  context: APIRequestContext,
  path: string,
  predicate: (item: T) => boolean = () => true,
): Promise<T> {
  const page = await readApiData<ApiPage<T>>(context, path);
  const item = page.items.find((candidate) => predicate(candidate));
  if (!item) {
    throw new Error(`GET ${path} did not contain the required fixture row`);
  }
  return item;
}

export async function readApiData<T>(
  context: APIRequestContext,
  path: string,
): Promise<T> {
  let response;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await context.get(path);
      break;
    } catch (error) {
      if (
        attempt >= 2 ||
        !(error instanceof Error) ||
        !error.message.includes('ECONNRESET')
      ) {
        throw error;
      }
      await delay(100 * (attempt + 1));
    }
  }
  const body = await response.text();
  if (!response.ok()) {
    throw new Error(`GET ${path} failed with ${response.status()}: ${body}`);
  }
  const envelope = JSON.parse(body) as ApiEnvelope<T>;
  if (envelope.code !== 200 || !envelope.data) {
    throw new Error(
      `GET ${path} returned an invalid success envelope: ${body}`,
    );
  }
  return envelope.data;
}
