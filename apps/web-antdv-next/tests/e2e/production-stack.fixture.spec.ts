import {
  expect,
  installWebSocketAudit,
  login,
  readApiData,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';

interface FeedbackCycleRow {
  feedback_cycle_id: string;
  status: string;
}

interface FeedbackMutation {
  cycle: FeedbackCycleRow & {
    generation: number;
  };
  replayed: boolean;
}

interface FeedbackOverview {
  revision: number;
}

interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

test('real production stack composes authenticated browser and API boundaries', async ({
  adminApi,
  authenticatedPage,
  namespace,
}) => {
  const identity = await adminApi.context.get('/api/auth/me');
  expect(identity.ok(), await identity.text()).toBeTruthy();
  await expect(identity.json()).resolves.toMatchObject({
    data: {
      roles: [{ code: 'super_admin' }],
      user: { username: 'admin' },
    },
  });

  await authenticatedPage.goto('/quant/reports');
  await waitForShell(authenticatedPage);
  await expect(
    authenticatedPage.getByTestId('reports-workspace'),
  ).toBeVisible();
  expect(namespace).toMatch(/^pw-\d+-\d+$/);
});

test('browser reconnects research feedback from its exact durable cursor', async ({
  adminApi,
  browserAudit,
  page,
}) => {
  test.setTimeout(120_000);
  const wire = installWebSocketAudit(page);
  const cancellationTarget = await readFirstApiItem<FeedbackCycleRow>(
    adminApi.context,
    '/api/research/feedback-cycles?page=1&size=100&trigger_family=scheduled',
    (cycle) => cycle.status === 'running',
  );
  let overviewReads = 0;
  page.on('response', (response) => {
    if (
      response.ok() &&
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/research/feedback-overview'
    ) {
      overviewReads += 1;
    }
  });

  await login(page);
  await browserAudit.drainHttp(page);
  await page.goto('/research/feedback');
  await waitForShell(page);
  const baseline = await readApiData<FeedbackOverview>(
    adminApi.context,
    '/api/research/feedback-overview',
  );
  const revision = page.getByTestId('feedback-overview-revision');
  await expect(revision).toHaveText(String(baseline.revision));
  const websocketStatus = page.getByTestId('websocket-status');
  await expect(websocketStatus).toHaveAttribute('data-state', 'connected');
  await expect(websocketStatus).toHaveAccessibleName(
    /Realtime connected|实时已连接/i,
  );
  await browserAudit.drainHttp(page);
  const baselineOverviewReads = overviewReads;
  const socketCount = wire.sockets.length;

  await browserAudit.allowRequestFailures(
    [
      {
        errorText: 'net::ERR_INTERNET_DISCONNECTED',
        method: 'GET',
        pathname: '/api/research/feedback-overview',
        search: '',
      },
      {
        errorText: 'net::ERR_INTERNET_DISCONNECTED',
        method: 'GET',
        pathname: '/api/research/feedback-cycles',
        search: '?page=1&size=20',
      },
      {
        errorText: 'net::ERR_INTERNET_DISCONNECTED',
        method: 'GET',
        pathname: '/api/research/model-route-activation-permits',
        search: '?page=1&size=20',
      },
      {
        errorText: 'net::ERR_INTERNET_DISCONNECTED',
        method: 'GET',
        pathname: '/api/research/feedback-schedulers',
        search: '',
      },
    ],
    () =>
      browserAudit.allowWebSocketReconnect(async () => {
        await page.context().setOffline(true);
        await expect
          .poll(() => wire.sockets.filter((socket) => socket.isClosed()).length)
          .toBeGreaterThan(0);

        const cancellation = await adminApi.context.post(
          `/api/research/feedback-cycles/${cancellationTarget.feedback_cycle_id}/cancel`,
          {
            data: { reason: 'w4_e03_browser_offline_cancel' },
            headers: { 'x-acting-role': 'super_admin' },
          },
        );
        const cancellationBody =
          (await cancellation.json()) as ApiEnvelope<FeedbackMutation>;
        expect(
          cancellation.status(),
          JSON.stringify(cancellationBody, null, 2),
        ).toBe(202);
        expect(cancellationBody).toMatchObject({
          code: 202,
          data: {
            cycle: {
              feedback_cycle_id: cancellationTarget.feedback_cycle_id,
              status: 'running',
            },
            replayed: false,
          },
        });
        const offline = await readApiData<FeedbackOverview>(
          adminApi.context,
          '/api/research/feedback-overview',
        );
        expect(offline.revision).toBeGreaterThan(baseline.revision);

        await page.context().setOffline(false);
        await expect
          .poll(() => wire.sockets.length, {
            message: 'browser did not establish a replacement WebSocket',
            timeout: 20_000,
          })
          .toBeGreaterThan(socketCount);
        await expect
          .poll(
            () =>
              wire.sent.findLast(
                (frame) =>
                  frame.action === 'subscribe' &&
                  frame.channel === 'research.feedback',
              )?.after_revision,
            {
              message:
                'reconnected feedback subscription lost its durable cursor',
              timeout: 20_000,
            },
          )
          .toBe(baseline.revision);
        await expect
          .poll(
            () =>
              wire.received.some(
                (frame) =>
                  frame.type === 'research.feedback' &&
                  frame.data?.revision === offline.revision &&
                  frame.data.subject_id ===
                    cancellationTarget.feedback_cycle_id,
              ),
            {
              message:
                'browser did not receive the offline durable feedback event',
              timeout: 20_000,
            },
          )
          .toBe(true);
        await expect(revision).toHaveText(String(offline.revision), {
          timeout: 20_000,
        });
        await expect
          .poll(() => overviewReads, {
            message: 'feedback replay did not recover authoritative REST state',
          })
          .toBeGreaterThan(baselineOverviewReads);
        await expect(websocketStatus).toHaveAttribute(
          'data-state',
          'connected',
        );
        await expect(websocketStatus).toHaveAccessibleName(
          /Realtime connected|实时已连接/i,
        );
      }),
  );
});
