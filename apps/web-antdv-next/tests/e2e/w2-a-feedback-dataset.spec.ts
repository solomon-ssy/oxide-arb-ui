import type { Buffer } from 'node:buffer';
import type { Page, WebSocket } from 'playwright/test';

import {
  expect,
  expectAccessible,
  readApiData,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';

interface DatasetRow {
  cohort_manifest: null | {
    cohort: string;
    counts: {
      candidate_count: number;
      censor_counts: unknown[];
      eligible_count: number;
      exclusion_counts: unknown[];
      included_count: number;
    };
  };
  manifest: null | {
    purpose: string;
    training_dataset_id: string;
  };
  parquet_uri: null | string;
  purpose: string;
  status: string;
  training_dataset_id: string;
}

interface BacktestRow {
  backtest_report_id: string;
  coverage: string;
  decision_policy_snapshot_id: string;
  evaluation_dataset_id: string;
  hit_rate: string;
  model_version_id: string;
  rank_ic: string;
}

interface ResearchJob {
  error?: null | {
    code: string;
    message: string;
  };
  job_id: string;
  status: 'cancelled' | 'failed' | 'queued' | 'running' | 'succeeded';
}

interface WsFrame {
  action?: string;
  channel?: string;
  data?: {
    job_id?: string;
    status?: string;
  };
  type?: string;
}

interface BrowserAudit {
  failures: string[];
  received: WsFrame[];
  sent: WsFrame[];
  setReconnectExercise: (value: boolean) => void;
  sockets: WebSocket[];
}

function parseFrame(payload: Buffer | string): null | WsFrame {
  try {
    return JSON.parse(payload.toString()) as WsFrame;
  } catch {
    return null;
  }
}

function installBrowserAudit(page: Page): BrowserAudit {
  const failures: string[] = [];
  const received: WsFrame[] = [];
  const sent: WsFrame[] = [];
  const sockets: WebSocket[] = [];
  let reconnectExercise = false;

  page.on('console', (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      failures.push(`console.${type}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    failures.push(`pageerror: ${error.message}`);
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown request failure';
    const expectedReconnectFailure =
      reconnectExercise &&
      request.resourceType() === 'websocket' &&
      /ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|aborted/i.test(failure);
    if (!expectedReconnectFailure) {
      failures.push(
        `requestfailed ${request.method()} ${request.url()}: ${failure}`,
      );
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failures.push(
        `response ${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });
  page.on('websocket', (socket) => {
    sockets.push(socket);
    socket.on('framesent', ({ payload }) => {
      const frame = parseFrame(payload);
      if (frame) sent.push(frame);
    });
    socket.on('framereceived', ({ payload }) => {
      const frame = parseFrame(payload);
      if (frame) received.push(frame);
    });
  });

  return {
    failures,
    received,
    sent,
    sockets,
    setReconnectExercise(value: boolean) {
      reconnectExercise = value;
    },
  };
}

test('W2-A production Dataset and Evaluation backtest close over REST and WS', async ({
  adminApi,
  authenticatedPage,
}) => {
  test.setTimeout(180_000);
  const audit = installBrowserAudit(authenticatedPage);
  let backtestQueries = 0;
  authenticatedPage.on('response', (response) => {
    if (
      response.ok() &&
      new URL(response.url()).pathname === '/api/research/backtest-reports'
    ) {
      backtestQueries += 1;
    }
  });

  await authenticatedPage.reload();
  await waitForShell(authenticatedPage);
  await expect
    .poll(
      () =>
        audit.sent.some(
          (frame) =>
            frame.action === 'subscribe' &&
            frame.channel === 'materialization.run_update',
        ),
      {
        message: 'authorized WS session did not subscribe to research updates',
      },
    )
    .toBe(true);

  const dataset = await readFirstApiItem<DatasetRow>(
    adminApi.context,
    '/api/research/training-datasets?purpose=evaluation&page=1&size=100',
    (item) =>
      item.purpose === 'evaluation' &&
      item.status === 'ready' &&
      item.cohort_manifest?.cohort === 'model_learning',
  );
  expect(dataset.manifest).toMatchObject({
    purpose: 'evaluation',
    training_dataset_id: dataset.training_dataset_id,
  });
  expect(dataset.parquet_uri).toMatch(/^file:\/\//);
  expect(dataset.cohort_manifest?.counts).toMatchObject({
    candidate_count: 80,
    eligible_count: 80,
    included_count: 80,
  });
  expect(dataset.cohort_manifest?.counts.exclusion_counts).toEqual([]);
  expect(dataset.cohort_manifest?.counts.censor_counts).toEqual([]);

  const backtest = await readFirstApiItem<BacktestRow>(
    adminApi.context,
    '/api/research/backtest-reports?page=1&size=100',
    (item) => item.evaluation_dataset_id === dataset.training_dataset_id,
  );
  expect(backtest.coverage).toBe('0.975');
  expect(backtest.hit_rate).toBe('0.625');
  expect(backtest.rank_ic).toBe('0.143');

  await authenticatedPage.goto(
    `/research/datasets?open=${dataset.training_dataset_id}`,
  );
  await waitForShell(authenticatedPage);
  const datasetDrawer = authenticatedPage.getByRole('dialog').last();
  await expect(datasetDrawer).toBeVisible();
  await expect(datasetDrawer).toContainText(dataset.training_dataset_id);
  await expect(datasetDrawer).toContainText(/Evaluation|评估/i);
  await expect(datasetDrawer).toContainText(/ModelLearning|模型学习/i);
  await expect(datasetDrawer).toContainText(/bound consistently|绑定一致/i);
  await expectAccessible(authenticatedPage, '[role="dialog"]');

  await authenticatedPage.goto(
    `/research/backtests?open=${backtest.backtest_report_id}`,
  );
  await waitForShell(authenticatedPage);
  const backtestDrawer = authenticatedPage.getByRole('dialog').last();
  await expect(backtestDrawer).toBeVisible();
  await expect(backtestDrawer).toContainText(backtest.model_version_id);
  await expect(backtestDrawer).toContainText(dataset.training_dataset_id);
  await expect(backtestDrawer).toContainText(/quality|质量|门禁/i);
  await expectAccessible(authenticatedPage, '[role="dialog"]');

  await backtestDrawer
    .getByRole('link', { name: dataset.training_dataset_id })
    .click();
  await expect(authenticatedPage).toHaveURL((url) => {
    return (
      url.pathname === '/research/datasets' &&
      url.searchParams.get('open') === dataset.training_dataset_id
    );
  });
  await expect(authenticatedPage.getByRole('dialog').last()).toContainText(
    dataset.training_dataset_id,
  );

  const socketCountBeforeBacktests = audit.sockets.length;
  const subscriptionCountBeforeBacktests = audit.sent.filter(
    (frame) =>
      frame.action === 'subscribe' &&
      frame.channel === 'materialization.run_update',
  ).length;
  const syncCountBeforeBacktests = audit.received.filter(
    (frame) => frame.type === 'sync',
  ).length;
  await authenticatedPage.goto('/research/backtests');
  await waitForShell(authenticatedPage);
  await expect
    .poll(
      () => ({
        socket: audit.sockets.length > socketCountBeforeBacktests,
        subscribed:
          audit.sent.filter(
            (frame) =>
              frame.action === 'subscribe' &&
              frame.channel === 'materialization.run_update',
          ).length > subscriptionCountBeforeBacktests,
        synced:
          audit.received.filter((frame) => frame.type === 'sync').length >
          syncCountBeforeBacktests,
      }),
      {
        message:
          'research job trigger requires a server-processed materialization WS subscription',
        timeout: 10_000,
      },
    )
    .toEqual({ socket: true, subscribed: true, synced: true });
  const queryCountBeforeJob = backtestQueries;
  const enqueue = await adminApi.context.post(
    `/api/research/models/${backtest.model_version_id}/backtest`,
    {
      data: {
        decision_policy_snapshot_id: backtest.decision_policy_snapshot_id,
        evaluation_dataset_id: dataset.training_dataset_id,
        reason: 'W2-A production WS invalidation acceptance',
      },
      headers: { 'x-acting-role': 'super_admin' },
    },
  );
  const enqueueBody = await enqueue.text();
  expect(enqueue.ok(), enqueueBody).toBeTruthy();
  const job = (JSON.parse(enqueueBody) as { data: ResearchJob }).data;
  const terminalJob: { value: null | ResearchJob } = { value: null };
  await expect
    .poll(
      async () => {
        const current = await readApiData<ResearchJob>(
          adminApi.context,
          `/api/research/jobs/${job.job_id}`,
        );
        if (
          current.status === 'cancelled' ||
          current.status === 'failed' ||
          current.status === 'succeeded'
        ) {
          terminalJob.value = current;
          return true;
        }
        return false;
      },
      {
        message: 'real Evaluation backtest job did not reach a terminal state',
        timeout: 90_000,
      },
    )
    .toBe(true);
  const completedJob = terminalJob.value;
  if (completedJob === null) {
    throw new Error(`job ${job.job_id} reached no observable terminal state`);
  }
  expect(
    completedJob.status,
    completedJob.error
      ? `${completedJob.error.code}: ${completedJob.error.message}`
      : `job ${completedJob.job_id} ended without typed failure detail`,
  ).toBe('succeeded');
  await expect
    .poll(
      () =>
        audit.received.map(
          (frame) => `${frame.type ?? 'unknown'}:${frame.data?.job_id ?? ''}`,
        ),
      { message: 'research job did not invalidate the UI over the real WS' },
    )
    .toContain(`materialization.run_update:${job.job_id}`);
  await expect
    .poll(() => backtestQueries, {
      message: 'WS revision did not re-fetch the Backtest catalog over REST',
    })
    .toBeGreaterThan(queryCountBeforeJob);

  const socketCountBeforeReconnect = audit.sockets.length;
  audit.setReconnectExercise(true);
  await authenticatedPage.context().setOffline(true);
  await expect
    .poll(() => audit.sockets.filter((socket) => socket.isClosed()).length)
    .toBeGreaterThan(0);
  await authenticatedPage.context().setOffline(false);
  await expect
    .poll(() => audit.sockets.length, {
      message: 'WS client did not reconnect after the network recovered',
      timeout: 20_000,
    })
    .toBeGreaterThan(socketCountBeforeReconnect);
  await expect
    .poll(
      () =>
        audit.sent.filter(
          (frame) =>
            frame.action === 'subscribe' &&
            frame.channel === 'materialization.run_update',
        ).length,
      { message: 'reconnected WS did not replay the research subscription' },
    )
    .toBeGreaterThan(1);

  await authenticatedPage.setViewportSize({ height: 812, width: 375 });
  await authenticatedPage.goto('/research/datasets');
  await waitForShell(authenticatedPage);

  const userMenu = authenticatedPage.getByRole('button', {
    name: 'Quant Pivot',
  });
  const planButton = authenticatedPage.getByRole('button', {
    name: /Plan dataset|试算计划/i,
  });
  const buildButton = authenticatedPage.getByRole('button', {
    name: /Build dataset|构建数据集/i,
  });
  await expect(userMenu).toBeVisible();
  await expect(
    authenticatedPage.getByRole('button', {
      name: /Switch runtime mode|切换运行模式/i,
    }),
  ).toBeVisible();
  await expect(
    authenticatedPage.getByRole('button', {
      name: /Set kill switch|设置熔断开关/i,
    }),
  ).toBeVisible();
  await expect(planButton).toBeVisible();
  await expect(buildButton).toBeVisible();
  await expect
    .poll(() =>
      planButton.evaluate((element) =>
        Math.round(element.getBoundingClientRect().height),
      ),
    )
    .toBeGreaterThanOrEqual(40);
  await expect
    .poll(() =>
      buildButton.evaluate((element) =>
        Math.round(element.getBoundingClientRect().height),
      ),
    )
    .toBeGreaterThanOrEqual(40);

  await userMenu.click();
  await expect(
    authenticatedPage.getByText(/Preferences|偏好设置/i, { exact: true }),
  ).toBeVisible();
  await authenticatedPage.keyboard.press('Escape');

  await authenticatedPage.goto(
    `/research/datasets?open=${dataset.training_dataset_id}`,
  );
  await waitForShell(authenticatedPage);
  const mobileDatasetDrawer = authenticatedPage.getByRole('dialog').last();
  await expect(mobileDatasetDrawer).toBeVisible();
  expect(
    await mobileDatasetDrawer.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBe(0);
  await expectAccessible(authenticatedPage, '[role="dialog"]');

  await authenticatedPage.goto(
    `/research/backtests?open=${backtest.backtest_report_id}`,
  );
  await waitForShell(authenticatedPage);
  const mobileBacktestDrawer = authenticatedPage.getByRole('dialog').last();
  await expect(mobileBacktestDrawer).toBeVisible();
  expect(
    await mobileBacktestDrawer.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBe(0);
  await expectAccessible(authenticatedPage, '[role="dialog"]');

  expect(audit.failures, audit.failures.join('\n')).toEqual([]);
});
