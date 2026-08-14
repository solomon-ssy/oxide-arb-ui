import { expect, readFirstApiItem, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface MarketRow {
  market_id: string;
  question: string;
}

test('market intelligence opens the real live-market surface from the catalog', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const market = await readFirstApiItem<MarketRow>(
    adminApi.context,
    '/api/markets?page=1&size=100',
  );

  await page.goto('/trading/market-intelligence?module=overview');
  await waitForUiReady(page, browserAudit);
  const row = page
    .locator('.vxe-body--row')
    .filter({ hasText: market.question });
  await expect(row).toBeVisible();
  const operationRow = page.locator(
    `.vxe-table--fixed-right-wrapper .vxe-body--row[rowid="${encodeURIComponent(market.market_id)}"]`,
  );
  await operationRow.getByRole('button', { name: /详情|Detail/i }).click();
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === '/trading/market-intelligence' &&
      url.searchParams.get('module') === 'live' &&
      url.searchParams.get('entity') === 'market' &&
      url.searchParams.get('id') === market.market_id
    );
  });
  await waitForUiReady(page, browserAudit);
  await expect(page.getByText(market.question, { exact: true })).toBeVisible();
  await expectReleaseQuality(page);
});
