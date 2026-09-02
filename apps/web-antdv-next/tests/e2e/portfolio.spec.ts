import type {
  IncentiveReconciliationView,
  Paginated,
  VenueIncentiveEventView,
} from '@vben/types';

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

  await page.setViewportSize({ height: 844, width: 390 });
  const accountValues = page.locator('.account-kpi-grid .kpi-value');
  await expect(accountValues).toHaveCount(5);
  await expect
    .poll(() =>
      accountValues.evaluateAll((elements) =>
        elements.every(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ),
    )
    .toBe(true);
  await expectReleaseQuality(page);
  await page.setViewportSize({ height: 900, width: 1440 });

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

test('incentive ledger exposes populated daily lineage at 390px', async ({
  authenticatedPage: page,
  browserAudit,
}) => {
  const observedAt = '2026-08-17T12:00:00Z';
  const reconciliation: IncentiveReconciliationView = {
    as_of: observedAt,
    below_payout_threshold_program_dates: [],
    estimate_to_reported_delta_usd: '0.05',
    estimated_maker_accrual_usd: '1.30',
    health: 'healthy',
    incomplete_day_count: 0,
    last_success_at: observedAt,
    oldest_incomplete_date: null,
    overdue_program_dates: [],
    payout_threshold_usd: '1',
    reported_to_credit_delta_usd: '0',
    venue_reported_maker_accrual_usd: '1.25',
    wallet_credited_maker_usd: '1.25',
    wallet_credited_taker_usd: '0.08',
  };
  const ledger: Paginated<VenueIncentiveEventView> = {
    has_next: false,
    items: [
      {
        amount_usd: '1.25',
        available_at: observedAt,
        created_at: observedAt,
        evidence_hash: `blake3:${'1'.repeat(64)}`,
        clob_trade_observation_id: '00000000-0000-7000-8000-000000000011',
        kind: 'maker_rebate',
        market_id: '0xmarket',
        observed_at: observedAt,
        program_date: '2026-08-16',
        source_identity: 'wallet-credit:0xtransaction',
        source_partition: 'polymarket-data-api',
        source_terms_hash: `blake3:${'2'.repeat(64)}`,
        stage: 'wallet_credited',
        transaction_hash: `0x${'3'.repeat(64)}`,
        venue_incentive_event_id: '00000000-0000-7000-8000-000000000012',
      },
    ],
    page: 1,
    size: 20,
    total: 1,
  };

  await page.route('**/api/quant/incentives/reconciliation', (route) =>
    route.fulfill({
      json: { code: 200, data: reconciliation, message: 'OK' },
    }),
  );
  await page.route('**/api/quant/incentives/events**', (route) =>
    route.fulfill({ json: { code: 200, data: ledger, message: 'OK' } }),
  );
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/execution/portfolio?module=incentives');
  await waitForUiReady(page, browserAudit);

  const incentivePage = page.getByTestId('incentive-page');
  await expect(incentivePage).toContainText('$1.25');
  await expect(incentivePage).toContainText('2026-08-16');
  await expect(
    incentivePage.locator('.ant-table-content[role="region"]'),
  ).toHaveAttribute('tabindex', '0');
  await expect(
    incentivePage.getByRole('button', { name: /复制.*成交|Copy.*Fill/i }),
  ).toBeVisible();
  await expect(
    incentivePage.getByRole('button', {
      name: /复制.*交易|Copy.*Transaction/i,
    }),
  ).toBeVisible();
  await expect(
    incentivePage.getByRole('button', { name: /复制.*条款|Copy.*Terms/i }),
  ).toBeVisible();
  await expectReleaseQuality(page);
});
