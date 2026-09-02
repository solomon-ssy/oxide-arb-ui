// @vitest-environment node
import type { APIRequestContext, Page } from 'playwright/test';

import type { SystemAlertEvent } from '@vben/types';

import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

import { Window } from 'happy-dom';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BrowserFailureAudit } from '../apps/web-antdv-next/tests/e2e/browser-failure-audit';
import { readBrowserContainment } from '../apps/web-antdv-next/tests/e2e/fixtures';
import {
  beginNoticeWitness,
  disposeNoticeWitness,
  finishNoticeWitness,
} from '../apps/web-antdv-next/tests/e2e/notice-capture-witness';
import { captureSemanticScreenshot } from '../apps/web-antdv-next/tests/e2e/stable-screenshot';

const alert: SystemAlertEvent = {
  affects_trading: true,
  category: 'trading_safety',
  dedupe_secs: 900,
  idempotency_key: 'quant-report-health:no-current',
  level: 'critical',
  message:
    'No global current Published authority exists; new entry is unavailable.',
  source: 'scheduler',
  title: 'No current recommendation report',
  visible_toast: true,
};
const timestamp = '2026-08-31T12:00:00.000Z';
let browserWindow: Window;

class BrowserEventSource extends EventTarget {
  emit(type: string, payload: unknown) {
    return this.dispatchEvent(new CustomEvent(type, { detail: payload }));
  }

  on(type: string, callback: (payload: unknown) => void) {
    this.addEventListener(type, (event) =>
      callback((event as CustomEvent<unknown>).detail),
    );
    return this;
  }
}

beforeEach(() => {
  browserWindow = new Window();
  vi.stubGlobal('window', browserWindow);
  vi.stubGlobal('document', browserWindow.document);
  vi.stubGlobal('Element', browserWindow.Element);
  vi.stubGlobal('MutationObserver', browserWindow.MutationObserver);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(performance.now()));
    return 1;
  });
});

afterEach(async () => {
  await browserWindow.happyDOM.abort();
  browserWindow.close();
  vi.unstubAllGlobals();
});

function png(tone: number) {
  const image = new PNG({ width: 16, height: 8 });
  for (let offset = 0; offset < image.data.length; offset += 4)
    image.data.set([tone, tone, tone, 255], offset);
  return PNG.sync.write(image);
}

function notice(title = alert.title, message = alert.message) {
  const node = document.createElement('div');
  node.className = 'ant-notification-notice ant-notification-notice-error';
  const heading = document.createElement('div');
  heading.className = 'ant-notification-notice-title';
  heading.textContent = title;
  const description = document.createElement('div');
  description.className = 'ant-notification-notice-description';
  description.textContent = message;
  const close = document.createElement('button');
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => node.remove());
  node.append(heading, description, close);
  document.body.append(node);
  return node;
}

async function scenario() {
  const events = new BrowserEventSource();
  const socket = new BrowserEventSource();
  const click = vi.fn();
  const dispose = vi.fn();
  const hover = vi.fn();
  const screenshot = vi.fn().mockResolvedValue(png(255));
  const locator = (find: () => Element[]) => ({
    count: async () => find().length,
    first: () => locator(() => find().slice(0, 1)),
    locator: (selector: string) =>
      locator(() =>
        find().flatMap((element) => [...element.querySelectorAll(selector)]),
      ),
    textContent: async () => find()[0]?.textContent ?? null,
    hover: async () => {
      hover();
    },
    elementHandle: async () => {
      const element = find()[0];
      return element
        ? {
            dispose: async () => {
              dispose();
            },
            waitForElementState: async () => {
              if (element.isConnected)
                throw new Error('Closed notice is still connected');
            },
          }
        : null;
    },
    getByRole: (_role: string, options: { name: string }) => ({
      click: async () => {
        click();
        const button = find()[0]?.querySelector<HTMLButtonElement>(
          `button[aria-label="${options.name}"]`,
        );
        if (!button) throw new Error('Close button missing');
        button.click();
      },
    }),
  });
  const page = Object.assign(events, {
    addInitScript: vi.fn().mockResolvedValue(undefined),
    evaluate: async (
      callback: (argument: unknown) => unknown,
      argument?: unknown,
    ) => callback(argument),
    exposeBinding: vi.fn().mockResolvedValue(undefined),
    isClosed: () => false,
    locator: (selector: string) =>
      locator(() => [...document.querySelectorAll(selector)]),
    mouse: { move: vi.fn().mockResolvedValue(undefined) },
    screenshot,
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Page;
  const audit = new BrowserFailureAudit();
  await audit.track(page);
  events.emit('websocket', socket);
  return {
    audit,
    click,
    dispose,
    hover,
    page,
    screenshot,
    emit: (event: SystemAlertEvent) =>
      socket.emit('framereceived', {
        payload: JSON.stringify({
          type: 'system.alert',
          timestamp,
          data: event,
        }),
      }),
    emitRaw: (payload: string) => socket.emit('framereceived', { payload }),
  };
}

describe('scoped system alert evidence', () => {
  it('rejects unknown critical alerts even without a visible toast', async () => {
    const state = await scenario();
    state.emit(alert);
    expect(() => state.audit.assertHealthy()).toThrow(
      'unexpected system.alert',
    );
  });

  it.each(['null', '[]', 'invalid JSON'])(
    'records malformed %s without an observer exception',
    async (payload) => {
      const state = await scenario();
      expect(() => state.emitRaw(payload)).not.toThrow();
      expect(state.audit.failures.length).toBe(1);
    },
  );

  it.each([
    { idempotency_key: 'another-cause' },
    { category: 'infrastructure' },
    { level: 'info' },
    { source: 'system' },
    { title: 'another title' },
    { message: 'another reason' },
    { affects_trading: false },
    { visible_toast: false },
    { dedupe_secs: 901 },
  ] satisfies Array<Partial<SystemAlertEvent>>)(
    'requires the exact declared alert fields: %j',
    async (change) => {
      const state = await scenario();
      await expect(
        state.audit.withExpectedAlert(
          alert,
          async () => ({ kind: 'verified-test' }),
          async () => {
            state.emit({ ...alert, ...change });
            state.audit.assertHealthy();
          },
        ),
      ).rejects.toThrow('unexpected system.alert');
    },
  );

  it('revalidates an arrived alert even when its toast already disappeared', async () => {
    const state = await scenario();
    let reads = 0;
    await state.audit.withExpectedAlert(
      alert,
      async () => ({ read: ++reads }),
      async () => {
        state.emit(alert);
        expect(state.audit.systemAlerts[0]?.witness).toBeNull();
        await state.audit.dismissExpectedAlerts(
          state.page,
          performance.now() + 1000,
        );
        expect(state.audit.systemAlerts[0]?.witness).toEqual({ read: 3 });
        expect(state.audit.systemAlerts[0]?.validated_at).not.toBeNull();
        expect(state.click).not.toHaveBeenCalled();
      },
    );
  });

  it('uses normal Close, disposes the handle, and retains the alert record', async () => {
    const state = await scenario();
    await state.audit.withExpectedAlert(
      alert,
      async () => ({ latch_open: true }),
      async () => {
        state.emit(alert);
        notice();
        expect(
          await state.audit.dismissExpectedAlerts(
            state.page,
            performance.now() + 1000,
          ),
        ).toBe(true);
        expect(state.click).toHaveBeenCalledTimes(1);
        expect(state.hover).toHaveBeenCalledTimes(1);
        expect(state.dispose).toHaveBeenCalledTimes(1);
        expect(state.audit.systemAlerts).toHaveLength(1);
        expect(state.audit.systemAlerts[0]?.acknowledged_at).not.toBeNull();
        expect(state.audit.systemAlerts[0]?.witness).toEqual({
          latch_open: true,
        });
      },
    );
  });

  it('does not accept a matching error toast without a real alert envelope', async () => {
    const state = await scenario();
    await expect(
      state.audit.withExpectedAlert(
        alert,
        async () => ({ latch_open: true }),
        async () => {
          notice();
          await state.audit.dismissExpectedAlerts(
            state.page,
            performance.now() + 1000,
          );
        },
      ),
    ).rejects.toThrow('without verified system.alert');
    expect(state.click).not.toHaveBeenCalled();
  });

  it('does not reset the deadline during fault readback', async () => {
    const state = await scenario();
    let reads = 0;
    await expect(
      state.audit.withExpectedAlert(
        alert,
        async () => {
          if (++reads > 1) await delay(40);
          return { latch_open: true };
        },
        async () =>
          captureSemanticScreenshot(
            state.page,
            {},
            state.audit,
            performance.now() + 15,
          ),
      ),
    ).rejects.toThrow(/deadline/);
    expect(state.screenshot).not.toHaveBeenCalled();
  });
});

describe('notice capture epochs', () => {
  it('retains unknown contents when a notice node is updated to expected contents', async () => {
    const state = await scenario();
    await beginNoticeWitness(state.page);
    const element = notice('Unexpected problem', 'Unknown cause');
    await delay(0);
    const title = element.querySelector('.ant-notification-notice-title');
    const description = element.querySelector(
      '.ant-notification-notice-description',
    );
    if (!title || !description) throw new Error('Notice contents are missing');
    title.textContent = alert.title;
    description.textContent = alert.message;
    await delay(0);
    const witness = await finishNoticeWitness(state.page);
    expect(witness.notices.map((value) => value.title)).toEqual(
      expect.arrayContaining(['Unexpected problem', alert.title]),
    );
    expect(witness.mutation_count).toBeGreaterThan(0);
    await disposeNoticeWitness(state.page);
  });

  it('rejects PNG contamination even when the expected toast disappears before post-check', async () => {
    const state = await scenario();
    const dirty = png(0);
    let element: HTMLElement;
    state.screenshot
      .mockImplementationOnce(async () => {
        state.emit(alert);
        element = notice();
        await delay(0);
        return dirty;
      })
      .mockImplementationOnce(async () => {
        element.remove();
        await delay(0);
        return dirty;
      });
    await expect(
      state.audit.withExpectedAlert(
        alert,
        async () => ({ latch_open: true }),
        async () => {
          await captureSemanticScreenshot(
            state.page,
            {},
            state.audit,
            performance.now() + 1000,
          );
        },
      ),
    ).rejects.toThrow(/contaminated|unexpected transient/);
    expect(state.screenshot).toHaveBeenCalledTimes(2);
    expect(state.click).not.toHaveBeenCalled();
    expect(
      (window as unknown as Record<string, unknown>).__quantPivotNoticeCapture,
    ).toBeUndefined();
  });

  it('retakes only after verified user dismissal and returns a zero-mutation witness', async () => {
    const state = await scenario();
    const dirty = png(0);
    const clean = png(255);
    state.screenshot
      .mockImplementationOnce(async () => {
        state.emit(alert);
        notice();
        await delay(0);
        return dirty;
      })
      .mockResolvedValueOnce(dirty)
      .mockResolvedValue(clean);
    await state.audit.withExpectedAlert(
      alert,
      async () => ({ latch_open: true }),
      async () => {
        const capture = await captureSemanticScreenshot(
          state.page,
          {},
          state.audit,
          performance.now() + 1000,
        );
        expect(capture.image).toBe(clean);
        expect(capture.notice_witness).toEqual({
          initial_notice_count: 0,
          mutation_count: 0,
          notices: [],
          overflow: false,
        });
        expect(state.click).toHaveBeenCalledTimes(1);
        expect(state.screenshot).toHaveBeenCalledTimes(4);
      },
    );
  });

  it('cleans up its observer after a screenshot error', async () => {
    const state = await scenario();
    state.screenshot.mockRejectedValue(new Error('capture failed'));
    await expect(
      captureSemanticScreenshot(
        state.page,
        {},
        state.audit,
        performance.now() + 1000,
      ),
    ).rejects.toThrow('capture failed');
    expect(
      (window as unknown as Record<string, unknown>).__quantPivotNoticeCapture,
    ).toBeUndefined();
  });
});

describe('canonical browser containment witness', () => {
  function api(change: (state: Record<string, unknown>) => void = () => {}) {
    const sampled = {
      parity_run_id: 'sampled',
      report_id: 'report',
      kind: 'sampled',
      status: 'mismatched',
      containment_completed_at: timestamp,
    };
    const integrity = {
      last_sampled_run: sampled,
      last_full_run: { parity_run_id: 'full', status: 'mismatched' },
      latch: { open: true, blocking_run_id: 'full' },
    };
    const health = { observed_at: timestamp, current_reports: [] };
    const report = {
      recommendation_report_id: 'report',
      status: 'revoked',
      revoked_at: timestamp,
      status_reason: 'feature parity containment for run sampled',
    };
    const state = { integrity, health, report };
    change(state);
    return {
      get: vi.fn(async (path: string) => {
        let data: unknown = report;
        if (path.includes('/summary')) {
          data = integrity;
        } else if (path.includes('/health')) {
          data = health;
        }
        return {
          ok: () => true,
          text: async () => JSON.stringify({ code: 200, message: 'OK', data }),
        };
      }),
    } as unknown as APIRequestContext;
  }

  it('binds sampled revocation and the current unsafe full latch without clearing either', async () => {
    const witness = await readBrowserContainment(
      api(),
      performance.now() + 1000,
    );
    expect(witness).toMatchObject({
      report_id: 'report',
      sampled_run_id: 'sampled',
      latch_run_id: 'full',
      latch_open: true,
      current_published_reports: 0,
    });
  });

  it.each(['healthy-head', 'wrong-reason', 'clear-latch', 'passed-sampled'])(
    'rejects %s instead of allowing the critical alert',
    async (kind) => {
      const context = api((state) => {
        const integrity = state.integrity as {
          last_sampled_run: { status: string };
          latch: { open: boolean };
        };
        const health = state.health as { current_reports: unknown[] };
        const report = state.report as { status_reason: string };
        if (kind === 'healthy-head')
          health.current_reports.push({ recommendation_report_id: 'healthy' });
        if (kind === 'wrong-reason') report.status_reason = 'another failure';
        if (kind === 'clear-latch') integrity.latch.open = false;
        if (kind === 'passed-sampled')
          integrity.last_sampled_run.status = 'passed';
      });
      await expect(
        readBrowserContainment(context, performance.now() + 1000),
      ).rejects.toThrow(/Browser expected-fault/);
    },
  );
});
