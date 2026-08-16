import type {
  QuantRecommendationView,
  SystemControlPlaneStatus,
} from '@vben/types';

import { expect, readApiData, readFirstApiItem, test } from './fixtures';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

interface ReportRow {
  recommendation_report_id: string;
  status: string;
}

interface RecommendationRow {
  identity: { question: string };
  outcome_side: string;
  recommendation_id: string;
}

type EntryRoute = 'aggressive' | 'passive';

function actionableRecommendation(
  source: QuantRecommendationView,
  route: EntryRoute,
): QuantRecommendationView {
  const recommendation = structuredClone(source);
  const now = Date.now();
  const validFrom = new Date(now - 60_000).toISOString();
  const validUntil = new Date(now + 3_600_000).toISOString();
  const tierEntry = recommendation.economic_tier.entry_execution;
  const limitPrice = tierEntry.limit_price;
  const requestedShares = recommendation.trade_plan.sizing.requested_shares;
  const visibleLiquidityUsd = tierEntry.visible_liquidity_usd;

  recommendation.active_order_intent_id = null;
  recommendation.execution_eligibility = {
    ...recommendation.execution_eligibility,
    eligible_modes: ['report_only', 'semi_auto'],
    ineligibility_reasons: [],
  };
  recommendation.report_status = 'published';
  recommendation.status = 'published';
  recommendation.valid_from = validFrom;
  recommendation.valid_until = validUntil;
  recommendation.trade_plan.entry.valid_from = validFrom;
  recommendation.trade_plan.entry.valid_until = validUntil;

  if (route === 'aggressive') {
    const immediateCost =
      tierEntry.kind === 'aggressive'
        ? tierEntry.immediate_cost
        : tierEntry.full_fill_cost;
    recommendation.trade_plan.entry.order_policy = {
      fill_requirement: 'allow_partial',
      kind: 'aggressive',
      worst_price: limitPrice,
    };
    recommendation.economic_tier.entry_execution = {
      entry_vwap: limitPrice,
      filled_shares: recommendation.trade_plan.sizing.expected_filled_shares,
      immediate_cost: immediateCost,
      kind: 'aggressive',
      limit_price: limitPrice,
      requested_shares: requestedShares,
      slippage_usd: '0',
      visible_liquidity_usd: visibleLiquidityUsd,
    };
  } else {
    const fullFillCost =
      tierEntry.kind === 'passive'
        ? tierEntry.full_fill_cost
        : tierEntry.immediate_cost;
    recommendation.trade_plan.entry.order_policy = {
      kind: 'passive',
      limit_price: limitPrice,
      post_only: true,
    };
    recommendation.economic_tier.entry_execution = {
      decision_at: new Date(now).toISOString(),
      expected_filled_shares:
        recommendation.trade_plan.sizing.expected_filled_shares,
      expected_maker_rebate_usd:
        recommendation.trade_plan.sizing.expected_maker_rebate_usd,
      fill_distribution: {
        sample_count: 1,
        source_evidence_hash: recommendation.economic_tier.lineage_hash,
        states: [
          {
            fill_latency_ms: 1000,
            fill_ratio_bps: 10_000,
            kind: 'full_fill',
            post_fill_markout_bps: '0',
            probability_bps: 10_000,
          },
        ],
      },
      full_fill_cost: fullFillCost,
      full_fill_maker_rebate: null,
      good_til_secs: 60,
      hard_reserved_cash_usd:
        recommendation.trade_plan.sizing.hard_reserved_cash_usd,
      kind: 'passive',
      limit_price: limitPrice,
      maker_rebate_schedule: null,
      requested_shares: requestedShares,
      visible_liquidity_usd: visibleLiquidityUsd,
    };
  }

  return recommendation;
}

function modalDetail(
  page: Parameters<typeof expectReleaseQuality>[0],
  label: RegExp,
) {
  return page
    .getByTestId('governed-action-modal')
    .locator('.ant-descriptions-row')
    .filter({ has: page.getByRole('rowheader', { name: label }) })
    .first();
}

test('recommendation workspace preserves revoked report evidence and owning detail routes', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const report = await readFirstApiItem<ReportRow>(
    adminApi.context,
    '/api/quant/reports?page=1&size=100&status=revoked',
    ({ status }) => status === 'revoked',
  );
  const recommendations = await readApiData<RecommendationRow[]>(
    adminApi.context,
    `/api/quant/reports/${report.recommendation_report_id}/recommendations`,
  );
  const recommendation = recommendations[0];
  if (!recommendation)
    throw new Error('seeded revoked report has no recommendation');

  await page.goto(
    `/trading/recommendations?module=queue&entity=report&id=${report.recommendation_report_id}`,
  );
  await waitForUiReady(page, browserAudit);
  await expect(page.getByTestId('report-lifecycle-banner')).toContainText(
    /已撤销|Revoked/i,
  );
  await page
    .getByTestId('report-detail-workspace')
    .getByRole('tab', { name: /^(推荐|Recommendations)$/i })
    .click();
  const row = page.getByRole('row').filter({
    hasText: recommendation.identity.question,
  });
  await expect(row).toContainText(new RegExp(recommendation.outcome_side, 'i'));

  await page.goto(
    `/trading/recommendations?module=queue&entity=recommendation&id=${recommendation.recommendation_id}`,
  );
  await waitForUiReady(page, browserAudit);
  const panel = page.getByTestId('recommendation-detail-panel');
  await expect(panel).toBeVisible();
  const reservation = page
    .getByTestId('recommendation-plans')
    .locator('.ant-descriptions-row')
    .filter({ hasText: /硬预留现金|Hard Reserved Cash/i })
    .first();
  await expect(reservation).toContainText(/\$25(?:\.00)?/);
  await expect(reservation).not.toContainText('—');
  await expect(panel).toContainText(
    /预计 maker 激励|Expected maker incentive/i,
  );
  await expectReleaseQuality(page);
});

test('create-intent confirmation preserves aggressive and passive economics', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const report = await readFirstApiItem<ReportRow>(
    adminApi.context,
    '/api/quant/reports?page=1&size=100&status=revoked',
    ({ status }) => status === 'revoked',
  );
  const recommendationRows = await readApiData<RecommendationRow[]>(
    adminApi.context,
    `/api/quant/reports/${report.recommendation_report_id}/recommendations`,
  );
  const row = recommendationRows[0];
  if (!row) throw new Error('seeded revoked report has no recommendation');

  const source = await readApiData<QuantRecommendationView>(
    adminApi.context,
    `/api/quant/recommendations/${row.recommendation_id}`,
  );
  const status = await readApiData<SystemControlPlaneStatus>(
    adminApi.context,
    '/api/system/status',
  );
  const actionableStatus: SystemControlPlaneStatus = {
    ...status,
    kill_switch: { ...status.kill_switch, state: 'closed' },
    quant_runtime_mode: 'semi_auto',
  };
  let activeRoute: EntryRoute = 'aggressive';

  await page.route('**/api/system/status', async (route) => {
    await route.fulfill({
      json: { code: 200, data: actionableStatus, message: 'OK' },
    });
  });
  await page.route(
    `**/api/quant/recommendations/${row.recommendation_id}`,
    async (route) => {
      await route.fulfill({
        json: {
          code: 200,
          data: actionableRecommendation(source, activeRoute),
          message: 'OK',
        },
      });
    },
  );
  await page.routeWebSocket('**/api/ws', (webSocket) => {
    const server = webSocket.connectToServer();
    server.onMessage((message) => {
      if (typeof message !== 'string') {
        webSocket.send(message);
        return;
      }
      try {
        const envelope = JSON.parse(message) as {
          data?: unknown;
          type?: string;
        };
        if (envelope.type === 'system.status') {
          envelope.data = actionableStatus;
        } else if (envelope.type === 'sync') {
          const snapshot = envelope.data as {
            system_status?: SystemControlPlaneStatus;
          };
          if (snapshot.system_status) {
            snapshot.system_status = actionableStatus;
          }
        }
        webSocket.send(JSON.stringify(envelope));
      } catch {
        webSocket.send(message);
      }
    });
  });

  const detailPath = `/trading/recommendations?module=queue&entity=recommendation&id=${row.recommendation_id}`;
  for (const entryRoute of ['aggressive', 'passive'] as const) {
    activeRoute = entryRoute;
    await page.goto(detailPath);
    await waitForUiReady(page, browserAudit);

    const createIntent = page.getByTestId('create-intent');
    await expect(createIntent).toBeEnabled();
    await createIntent.click();

    const modal = page.getByTestId('governed-action-modal');
    const dialog = page.getByRole('dialog').filter({ has: modal });
    await expect(dialog).toBeVisible();
    await expect(
      modalDetail(page, /硬预留现金|Hard-reserved Cash/i),
    ).toContainText(/\$25(?:\.00)?/);
    await expect(
      modalDetail(page, /请求份额|Requested Shares/i),
    ).not.toContainText('—');
    await expect(
      modalDetail(page, /预计成交份额|Expected Filled Shares/i),
    ).not.toContainText('—');
    await expect(
      modalDetail(page, /即时费用|Immediate Fee/i),
    ).not.toContainText('—');
    await expect(
      modalDetail(page, /预计 Maker 激励|Expected Maker Rebate/i),
    ).toContainText(
      /不是可用现金.*绝不抵扣风险|not available cash.*never offsets risk/i,
    );

    const routeDetail = modalDetail(page, /入场路线|Entry Route/i);
    const postOnlyDetail = modalDetail(page, /仅挂单|Post-only/i);
    const ttlDetail = modalDetail(page, /有效时长|Time to Live/i);
    if (entryRoute === 'aggressive') {
      await expect(routeDetail).toContainText(/主动|Aggressive/i);
      await expect(postOnlyDetail).toContainText(/否|No/i);
      await expect(ttlDetail).toContainText('—');
    } else {
      await expect(routeDetail).toContainText(/被动|Passive/i);
      await expect(postOnlyDetail).toContainText(/是|Yes/i);
      await expect(ttlDetail).not.toContainText('—');
    }

    await dialog.getByRole('button', { name: /取\s*消|Cancel/i }).click();
    await expect(modal).toHaveCount(0);
  }

  await expectReleaseQuality(page);
});
