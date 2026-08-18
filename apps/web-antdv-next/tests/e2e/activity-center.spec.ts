import { expect, installWebSocketAudit, readApiData, test } from './fixtures';
import { confirmGovernedAction } from './governed-action-driver';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface RuntimeActivity {
  available_actions: Array<{ kind: string }>;
  entity: { id: string; kind: string };
  status: string;
}

interface RuntimeActivityPage {
  items: RuntimeActivity[];
}

interface ResearchJob {
  status: string;
}

test('activity center cancels a real research job and converges through REST and WS', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const wire = installWebSocketAudit(page);
  const activity = await readApiData<RuntimeActivityPage>(
    adminApi.context,
    '/api/runtime/activities?domain=research&status=pending&limit=50',
  );
  const target = activity.items.find((item) =>
    item.available_actions.some(({ kind }) => kind === 'cancel_research_job'),
  );
  if (!target) {
    throw new Error('fresh production fixture has no cancellable research job');
  }

  await page.goto('/runtime/activity?domain=research&status=pending');
  await waitForUiReady(
    page,
    browserAudit,
    '[data-testid="runtime-activity-page"][data-ui-ready="true"]',
  );
  const targetRow = page.locator(
    `.activity-row[data-activity-id="${target.entity.id}"]`,
  );
  await targetRow
    .getByRole('button', { name: /取消.*任务|Cancel job/i })
    .click();
  await confirmGovernedAction(page, 'ui release closure cancels seeded job');

  await expect
    .poll(async () => {
      const job = await readApiData<ResearchJob>(
        adminApi.context,
        `/api/research/jobs/${target.entity.id}`,
      );
      return job.status;
    })
    .toBe('cancelled');
  await expect
    .poll(() =>
      wire.received.some(
        (frame) =>
          frame.data?.job_id === target.entity.id ||
          frame.data?.subject_id === target.entity.id,
      ),
    )
    .toBe(true);
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('domain') === 'research',
  );
  await expectReleaseQuality(page);
});

test('activity page opens local inspectors without leaving the feed', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const activity = await readApiData<RuntimeActivityPage>(
    adminApi.context,
    '/api/runtime/activities?limit=50',
  );
  const researchJob = activity.items.find(
    (item) => item.entity.kind === 'research-job',
  );
  const reportRun = activity.items.find(
    (item) => item.entity.kind === 'report-run',
  );
  if (!researchJob && !reportRun) {
    throw new Error('fresh production fixture has no activity rows');
  }

  await page.goto('/runtime/activity');
  await waitForUiReady(
    page,
    browserAudit,
    '[data-testid="runtime-activity-page"][data-ui-ready="true"]',
  );

  async function openKind(target: RuntimeActivity) {
    await page
      .locator(`.activity-row[data-activity-id="${target.entity.id}"]`)
      .click();
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === '/runtime/activity' &&
        url.searchParams.get('entity') === target.entity.kind &&
        url.searchParams.get('id') === target.entity.id
      );
    });
    await expect(page.getByTestId('runtime-activity-inspector')).toBeVisible();
    await page
      .getByTestId('runtime-activity-inspector')
      .getByRole('button', { name: /^(关闭|Close)$/i })
      .click();
    await expect(
      page.getByTestId('runtime-activity-inspector'),
    ).not.toBeVisible();
  }

  if (researchJob) {
    await openKind(researchJob);
  }
  if (reportRun) {
    await openKind(reportRun);
  }
  await expectReleaseQuality(page);
});
