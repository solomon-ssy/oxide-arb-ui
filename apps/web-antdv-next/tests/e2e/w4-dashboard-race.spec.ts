import type { Page } from 'playwright/test';

import { expect, login, test } from './fixtures';
import {
  DashboardRequestLedger,
  DashboardResponseOwner,
  DashboardWebSocketOwner,
  installControlledBrowserEnvironment,
  setControlledOnline,
  setControlledVisibility,
} from './w4-dashboard-race-harness';

const OLD_MARKER = 910_001;
const LATEST_MARKER = 920_001;
const RECOVERY_MARKER = 930_001;
const INVALID_FEEDBACK_WARNING =
  '[qp-ws] invalid research.feedback frame: {occurred_at: not-a-time, profile_id: , revision: -1, subject_id: , subject_kind: unknown}';

function reportFrame(ordinal: number) {
  return {
    data: {
      decision_at: '2026-07-29T10:00:00Z',
      empty_reason: null,
      error_code: null,
      event: 'published',
      profile_id: 'crypto_price_15m',
      published_at: '2026-07-29T10:00:00Z',
      recommendation_count: ordinal,
      recommendation_report_id: `00000000-0000-7000-8000-${String(
        ordinal,
      ).padStart(12, '0')}`,
      report_kind: 'periodic',
      runtime_mode: 'report_only',
      status: 'published',
      status_reason: null,
    },
    timestamp: '2026-07-29T10:00:00Z',
    type: 'quant.report',
  };
}

function dashboardActiveMarkets(page: Page) {
  return page
    .getByText(/Active markets|活跃市场/i, { exact: true })
    .locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " rounded-lg ")][1]',
    );
}

function markerText(marker: number): string {
  return marker.toLocaleString('en-US');
}

async function installRaceOwners(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: Date.now() });
  await installControlledBrowserEnvironment(page);
  const responses = await DashboardResponseOwner.install(page);
  const websocket = await DashboardWebSocketOwner.install(page);
  websocket.isolateInbound();
  const requests = new DashboardRequestLedger(page);
  return { requests, responses, websocket };
}

async function pauseBrowserClock(page: Page) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
}

async function expectReadDelta(
  requests: DashboardRequestLedger,
  baseline: { dashboard: number; feedback: number },
  delta: number,
) {
  await expect
    .poll(() => ({
      dashboard: requests.count('dashboard') - baseline.dashboard,
      feedback: requests.count('feedback') - baseline.feedback,
    }))
    .toEqual({ dashboard: delta, feedback: delta });
}

test('semantic burst stays single-flight and old window/unmount reads abort', async ({
  browserAudit,
  page,
}) => {
  test.setTimeout(120_000);
  const { requests, responses, websocket } = await installRaceOwners(page);
  await login(page);
  await browserAudit.drainHttp(page);
  await expect(page.getByTestId('websocket-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
  await pauseBrowserClock(page);
  await page.clock.runFor(500);
  await browserAudit.drainHttp(page);
  requests.resetPeaks();

  const baseline = {
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  const coalescedPromise = responses.holdSnapshot();
  websocket.send(reportFrame(1));
  websocket.send(reportFrame(2));
  await page.clock.runFor(299);
  expect(requests.count('dashboard')).toBe(baseline.dashboard);
  expect(requests.count('feedback')).toBe(baseline.feedback);

  await page.clock.runFor(1);
  const [coalescedDashboard, coalescedFeedback] = await coalescedPromise;
  await expectReadDelta(requests, baseline, 1);

  const trailingPromise = responses.holdSnapshot();
  websocket.send(reportFrame(3));
  await page.clock.runFor(300);
  await expectReadDelta(requests, baseline, 1);

  await Promise.all([
    coalescedDashboard.releaseWithActiveMarkets(OLD_MARKER),
    coalescedFeedback.release(),
  ]);
  const [trailingDashboard, trailingFeedback] = await trailingPromise;
  await expectReadDelta(requests, baseline, 2);
  await expect(
    dashboardActiveMarkets(page).getByText(markerText(OLD_MARKER)),
  ).toHaveCount(0);
  await Promise.all([
    trailingDashboard.releaseWithActiveMarkets(LATEST_MARKER),
    trailingFeedback.release(),
  ]);
  await browserAudit.drainHttp(page);
  await page.clock.runFor(16);
  await expect(
    dashboardActiveMarkets(page).getByText(markerText(LATEST_MARKER)),
  ).toBeVisible();
  expect(requests.peak('dashboard')).toBe(1);
  expect(requests.peak('feedback')).toBe(1);

  const oldWindowPromise = responses.holdSnapshot();
  websocket.send(reportFrame(4));
  await page.clock.runFor(300);
  const [oldWindowDashboard, oldWindowFeedback] = await oldWindowPromise;
  expect(new URL(oldWindowDashboard.request.url()).search).toBe('?window=7d');
  const latestWindowPromise = responses.holdSnapshot();
  await browserAudit.allowRequestFailures(
    [
      {
        errorText: 'net::ERR_ABORTED',
        method: 'GET',
        pathname: '/api/dashboard/overview',
        search: '?window=7d',
      },
      {
        errorText: 'net::ERR_ABORTED',
        method: 'GET',
        pathname: '/api/research/feedback-overview',
        search: '',
      },
    ],
    async () => {
      await page.getByText('30D', { exact: true }).click();
      await Promise.all([
        oldWindowDashboard.releaseAfterAbort(),
        oldWindowFeedback.releaseAfterAbort(),
      ]);
      await expect
        .poll(() => [
          requests.failures.get(oldWindowDashboard.request),
          requests.failures.get(oldWindowFeedback.request),
        ])
        .toEqual(['net::ERR_ABORTED', 'net::ERR_ABORTED']);
      const [latestWindowDashboard, latestWindowFeedback] =
        await latestWindowPromise;
      expect(new URL(latestWindowDashboard.request.url()).search).toBe(
        '?window=30d',
      );
      await Promise.all([
        latestWindowDashboard.releaseWithActiveMarkets(RECOVERY_MARKER),
        latestWindowFeedback.release(),
      ]);
      await page.clock.runFor(16);
    },
  );
  await browserAudit.drainHttp(page);
  await expect(
    dashboardActiveMarkets(page).getByText(markerText(RECOVERY_MARKER)),
  ).toBeVisible();
  await expect(
    dashboardActiveMarkets(page).getByText(markerText(OLD_MARKER)),
  ).toHaveCount(0);

  const unmountPromise = responses.holdSnapshot();
  websocket.send(reportFrame(5));
  await page.clock.runFor(300);
  const [unmountDashboard, unmountFeedback] = await unmountPromise;
  const dashboardCountBeforeUnmount = requests.count('dashboard');
  await browserAudit.allowRequestFailures(
    [
      {
        errorText: 'net::ERR_ABORTED',
        method: 'GET',
        pathname: '/api/dashboard/overview',
        search: '?window=30d',
      },
      {
        errorText: 'net::ERR_ABORTED',
        method: 'GET',
        pathname: '/api/research/feedback-overview',
        search: '',
      },
    ],
    async () => {
      await page
        .getByRole('button', { name: /Open workbench|打开工作台/i })
        .click();
      await expect(page).toHaveURL(
        (url) => url.pathname === '/research/feedback',
      );
      await Promise.all([
        unmountDashboard.releaseAfterAbort(),
        unmountFeedback.releaseAfterAbort(),
      ]);
      await expect
        .poll(() => [
          requests.failures.get(unmountDashboard.request),
          requests.failures.get(unmountFeedback.request),
        ])
        .toEqual(['net::ERR_ABORTED', 'net::ERR_ABORTED']);
    },
  );
  await page.clock.runFor(1000);
  expect(requests.count('dashboard')).toBe(dashboardCountBeforeUnmount);
});

test('WS fallback is healthy, heartbeat, visibility and reconnect bounded', async ({
  browserAudit,
  page,
}) => {
  test.setTimeout(120_000);
  const { requests, websocket } = await installRaceOwners(page);
  await login(page);
  await browserAudit.drainHttp(page);
  await expect(page.getByTestId('websocket-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
  await pauseBrowserClock(page);
  await page.clock.runFor(500);
  await browserAudit.drainHttp(page);

  const initial = {
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  websocket.send({
    data: {},
    timestamp: '2026-07-29T10:00:00Z',
    type: 'pong',
  });
  await page.evaluate(() => Promise.resolve());
  await expectReadDelta(requests, initial, 0);

  const pingBaseline = websocket.sentCount('ping');
  await page.clock.runFor(15_000);
  await expect
    .poll(() => websocket.sentCount('ping'))
    .toBeGreaterThan(pingBaseline);
  await expect
    .poll(
      () => websocket.received.filter((frame) => frame.type === 'pong').length,
    )
    .toBeGreaterThan(0);
  await page.clock.runFor(15_000);
  await browserAudit.drainHttp(page);
  await expectReadDelta(requests, initial, 0);

  websocket.blockPong(true);
  const beforeStale = {
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  const browserNow = await page.evaluate(() => Date.now());
  await page.clock.setSystemTime(browserNow + 46_000);
  await page.clock.fastForward(30_000);
  await browserAudit.drainHttp(page);
  await expectReadDelta(requests, beforeStale, 1);
  websocket.blockPong(false);
  websocket.send({
    data: {},
    timestamp: '2026-07-29T10:01:00Z',
    type: 'pong',
  });

  await setControlledOnline(page, false);
  await expect(page.getByTestId('websocket-status')).toHaveAttribute(
    'data-state',
    'reconnecting',
  );
  const beforeDisconnected = {
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  await page.clock.runFor(30_000);
  await browserAudit.drainHttp(page);
  await expectReadDelta(requests, beforeDisconnected, 1);

  await setControlledVisibility(page, 'hidden');
  const beforeHidden = {
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  await page.clock.runFor(30_000);
  await browserAudit.drainHttp(page);
  await expectReadDelta(requests, beforeHidden, 0);

  await setControlledVisibility(page, 'visible');
  await browserAudit.drainHttp(page);
  await expectReadDelta(requests, beforeHidden, 1);

  const connectionsBeforeRecovery = websocket.connectionCount;
  const beforeReconnect = {
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  await setControlledOnline(page, true);
  await expect
    .poll(() => websocket.connectionCount)
    .toBe(connectionsBeforeRecovery + 1);
  await expect(page.getByTestId('websocket-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
  await browserAudit.drainHttp(page);
  await expectReadDelta(requests, beforeReconnect, 1);
});

test('section errors retain last-good and WS faults recover without poll storms', async ({
  browserAudit,
  page,
}) => {
  test.setTimeout(120_000);
  const { requests, responses, websocket } = await installRaceOwners(page);
  await login(page);
  await browserAudit.drainHttp(page);
  await expect(page.getByTestId('websocket-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
  await expect(page.getByText('crypto_price_15m')).toBeVisible();
  await pauseBrowserClock(page);
  await page.clock.runFor(500);
  await browserAudit.drainHttp(page);

  const overviewFailurePromise = responses.holdSnapshot();
  websocket.send(reportFrame(11));
  await page.clock.runFor(300);
  const [overviewFailure, feedbackSuccess] = await overviewFailurePromise;
  await browserAudit.allowResponse(
    {
      method: 'GET',
      pathname: '/api/dashboard/overview',
      status: 503,
    },
    async () => {
      await Promise.all([overviewFailure.fail(503), feedbackSuccess.release()]);
      await browserAudit.drainHttp(page);
      await expect(page.locator('.ant-alert-error')).toBeVisible();
    },
  );
  await expect(page.getByTestId('dashboard-command-center')).toBeVisible();
  await expect(page.getByText('crypto_price_15m')).toBeVisible();

  const feedbackFailurePromise = responses.holdSnapshot();
  websocket.send(reportFrame(12));
  await page.clock.runFor(300);
  const [overviewSuccess, feedbackFailure] = await feedbackFailurePromise;
  await browserAudit.allowResponse(
    {
      method: 'GET',
      pathname: '/api/research/feedback-overview',
      status: 503,
    },
    async () => {
      await Promise.all([
        overviewSuccess.releaseWithActiveMarkets(RECOVERY_MARKER),
        feedbackFailure.fail(503),
      ]);
      await browserAudit.drainHttp(page);
      await page.clock.runFor(16);
      await expect(
        dashboardActiveMarkets(page).getByText(markerText(RECOVERY_MARKER)),
      ).toBeVisible();
    },
  );
  await expect(page.getByText('crypto_price_15m')).toBeVisible();
  await expect(page.locator('.ant-alert-warning')).toBeVisible();

  const beforeUnknown = {
    connections: websocket.connectionCount,
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  const unknownWarning = page.waitForEvent('console', {
    predicate: (message) =>
      message.type() === 'warning' &&
      message.text() === '[qp-ws] unknown message type: w4.unknown',
  });
  await browserAudit.allowConsole(
    {
      text: '[qp-ws] unknown message type: w4.unknown',
      type: 'warning',
    },
    async () => {
      websocket.send({
        data: {},
        timestamp: '2026-07-29T10:02:00Z',
        type: 'w4.unknown',
      });
      await unknownWarning;
    },
  );
  await expectReadDelta(requests, beforeUnknown, 0);
  expect(websocket.connectionCount).toBe(beforeUnknown.connections);

  const beforeRecovery = {
    connections: websocket.connectionCount,
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  const invalidWarning = page.waitForEvent('console', {
    predicate: (message) =>
      message.type() === 'warning' &&
      message.text() === INVALID_FEEDBACK_WARNING,
  });
  await browserAudit.allowConsole(
    {
      text: INVALID_FEEDBACK_WARNING,
      type: 'warning',
    },
    async () => {
      websocket.send({
        data: {
          occurred_at: 'not-a-time',
          profile_id: '',
          revision: -1,
          subject_id: '',
          subject_kind: 'unknown',
        },
        timestamp: '2026-07-29T10:03:00Z',
        type: 'research.feedback',
      });
      await invalidWarning;
      await expect
        .poll(() => websocket.connectionCount)
        .toBe(beforeRecovery.connections + 1);
      await expect(page.getByTestId('websocket-status')).toHaveAttribute(
        'data-state',
        'connected',
      );
      await browserAudit.drainHttp(page);
    },
  );
  await expect
    .poll(() => ({
      dashboard: requests.count('dashboard') - beforeRecovery.dashboard,
      feedback: requests.count('feedback') - beforeRecovery.feedback,
    }))
    .toEqual({ dashboard: 1, feedback: 2 });

  const beforeRestart = {
    connections: websocket.connectionCount,
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  await websocket.closeServer();
  await expect(page.getByTestId('websocket-status')).toHaveAttribute(
    'data-state',
    'reconnecting',
  );
  await page.clock.runFor(1200);
  await expect
    .poll(() => websocket.connectionCount)
    .toBe(beforeRestart.connections + 1);
  await expect(page.getByTestId('websocket-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
  await browserAudit.drainHttp(page);
  await expectReadDelta(requests, beforeRestart, 1);
  const afterRestart = {
    dashboard: requests.count('dashboard'),
    feedback: requests.count('feedback'),
  };
  await page.clock.runFor(1000);
  await browserAudit.drainHttp(page);
  await expectReadDelta(requests, afterRestart, 0);
});
