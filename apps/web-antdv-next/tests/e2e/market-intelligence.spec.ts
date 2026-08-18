import { expect, readFirstApiItem, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface MarketRow {
  market_id: string;
  question: string;
}

test('market intelligence opens the real live-market inspector from the catalog', async ({
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
      url.searchParams.get('module') === 'overview' &&
      url.searchParams.get('entity') === 'market' &&
      url.searchParams.get('id') === market.market_id
    );
  });
  await waitForUiReady(page, browserAudit);
  const inspector = page.getByTestId('workspace-object-stage');
  await expect(inspector).toContainText(market.question);

  await expect(
    page.locator(
      '.workspace-inspector-host.is-object-stage .workspace-module-pane .vxe-table--scroll-x-handle',
    ),
  ).toBeHidden();

  for (const viewport of [
    { height: 800, width: 1280 },
    { height: 900, width: 1440 },
  ] as const) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const content = document.querySelector(
            '[data-testid="workspace-object-stage"] .workspace-object-stage-content',
          );
          const strip = document.querySelector(
            '[data-testid="live-kpi-strip"]',
          );
          if (
            !(content instanceof HTMLElement) ||
            !(strip instanceof HTMLElement)
          ) {
            return null;
          }
          const pane = document.querySelector(
            '.workspace-inspector-host.is-object-stage .workspace-module-pane',
          );
          const leakedHandle = pane?.querySelector(
            '.vxe-table--scroll-x-handle',
          );
          const handleRect = leakedHandle?.getBoundingClientRect();
          return {
            contentFits: content.scrollWidth <= content.clientWidth + 1,
            handleHidden:
              !(pane instanceof HTMLElement) ||
              getComputedStyle(pane).display === 'none' ||
              handleRect === undefined ||
              handleRect.width === 0 ||
              handleRect.height === 0,
            stripFits: strip.scrollWidth <= strip.clientWidth + 1,
          };
        }),
      )
      .toEqual({
        contentFits: true,
        handleHidden: true,
        stripFits: true,
      });
  }

  await expectReleaseQuality(page);
});
