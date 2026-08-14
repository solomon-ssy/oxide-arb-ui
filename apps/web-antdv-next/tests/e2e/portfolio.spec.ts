import { expect, readApiData, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface LiveAccount {
  available_usd: string;
  positions: Array<{ market_id: string }>;
  venue_net_liquidation_usd: string;
}

test('portfolio renders venue account truth and keeps semantic module boundaries', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const account = await readApiData<LiveAccount>(
    adminApi.context,
    '/api/quant/account/live',
  );
  expect(account.venue_net_liquidation_usd).not.toBe('');

  await page.goto('/execution/portfolio?module=account');
  await waitForUiReady(page, browserAudit);
  await expect(page.getByText(/Net liquidation|净清算价值/i)).toBeVisible();
  if (account.positions[0]) {
    await expect(
      page.locator('.ant-table-tbody tr.ant-table-row'),
    ).not.toHaveCount(0);
  }

  await page.getByRole('tab', { name: /Exposure|敞口/i }).click();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('module') === 'exposure',
  );
  await waitForUiReady(page, browserAudit);
  await expect(page.getByText(/Exposure|敞口/i).first()).toBeVisible();

  await page.getByRole('tab', { name: /Equity|权益/i }).click();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('module') === 'equity',
  );
  await waitForUiReady(page, browserAudit);
  await expectReleaseQuality(page);
});
