import { expect, readApiData, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface DashboardOverview {
  authority: {
    state: string;
    value: null | {
      system: {
        quant_runtime_mode: string;
      };
    };
  };
  revision: string;
}

test('dashboard switches an authoritative runtime window without stale state', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const overview = await readApiData<DashboardOverview>(
    adminApi.context,
    '/api/dashboard/overview?window=24h',
  );
  expect(overview.revision).not.toBe('');
  expect(['ready', 'stale']).toContain(overview.authority.state);
  expect(overview.authority.value?.system.quant_runtime_mode).toBe(
    'report_only',
  );

  await page.goto('/dashboard');
  await waitForUiReady(
    page,
    browserAudit,
    '[data-testid="dashboard-command-center"][data-ui-ready="true"]',
  );
  await expect(page.getByTestId('dashboard-command-center')).toContainText(
    /仅报告|Report Only/i,
  );

  const refreshed = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.ok() &&
      url.pathname === '/api/dashboard/overview' &&
      url.searchParams.get('window') === '24h'
    );
  });
  await page.getByText('24H', { exact: true }).click();
  await refreshed;
  await waitForUiReady(
    page,
    browserAudit,
    '[data-testid="dashboard-command-center"][data-ui-ready="true"]',
  );
  await expectReleaseQuality(page);
});
