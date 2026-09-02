import type {
  QuantRecommendationView,
  RecommendationEconomicOutcomeView,
  RecommendationExecutionComparisonView,
  RouteEconomicHealthView,
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

function contentHash(byte: string) {
  return `blake3:${byte.repeat(64)}`;
}

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
    blockers: [],
    ceiling: 'operator_approval',
    policy_binding: null,
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
      execution_vwap: limitPrice,
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
    const termsHash = recommendation.economic_tier.lineage_hash;
    const availableAt = new Date(now).toISOString();
    const programDate = availableAt.slice(0, 10);
    const schedule = {
      available_at: availableAt,
      exponent: '2',
      platform_rate: '0.2',
      rebate_rate: '0.25',
      taker_only: true,
      terms_hash: termsHash,
    };
    recommendation.trade_plan.sizing = {
      ...recommendation.trade_plan.sizing,
      expected_maker_rebate_accrual_usd: '0.12',
      maker_rebate_objective_status: {
        credited_probability_bps: 10_000,
        state: 'scenario_weighted',
      },
      maker_rebate_terms: { schedule, state: 'passive_program' },
      objective_maker_rebate_usd: '0.10',
      rebate_delay_basis: {
        kind: 'conservative_fallback',
        lag_from_program_close_secs: 172_800,
      },
      rebate_valuation_hash: termsHash,
    };
    recommendation.trade_plan.entry.order_policy = {
      kind: 'passive',
      limit_price: limitPrice,
      post_only: true,
    };
    recommendation.economic_tier.entry_execution = {
      decision_at: new Date(now).toISOString(),
      expected_filled_shares:
        recommendation.trade_plan.sizing.expected_filled_shares,
      expected_maker_rebate_accrual_usd: '0.12',
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
      full_fill_maker_rebate_accrual_usd: '0.15',
      good_til_secs: 60,
      hard_reserved_cash_usd:
        recommendation.trade_plan.sizing.hard_reserved_cash_usd,
      kind: 'passive',
      limit_price: limitPrice,
      maker_rebate_objective_status:
        recommendation.trade_plan.sizing.maker_rebate_objective_status,
      maker_rebate_terms: { schedule, state: 'passive_program' },
      maker_rebate_valuation: {
        as_of: availableAt,
        delay_basis: {
          kind: 'conservative_fallback',
          lag_from_program_close_secs: 172_800,
        },
        evidence_hash: termsHash,
        health: 'healthy',
        payout_threshold_usd: '1',
        program_day_baselines: [
          { confirmed_accrual_usd: '0.95', program_date: programDate },
        ],
      },
      objective_maker_rebate_usd: '0.10',
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
  await expect(panel).toContainText(/名义返佣应计|Nominal rebate accrual/i);
  await expectReleaseQuality(page);
});

test('recommendation detail renders MTM outcome, execution comparison, and route health', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  const missingRecommendation = '00000000-0000-0000-0000-000000000000';
  for (const resource of ['economic-outcome', 'execution-comparison']) {
    const response = await adminApi.context.get(
      `/api/quant/recommendations/${missingRecommendation}/${resource}`,
    );
    expect(response.status()).toBe(404);
  }
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
  const recommendation = await readApiData<QuantRecommendationView>(
    adminApi.context,
    `/api/quant/recommendations/${row.recommendation_id}`,
  );
  const now = new Date().toISOString();
  const economicHash = contentHash('a');
  const outcome: RecommendationEconomicOutcomeView = {
    available_at: now,
    created_at: now,
    decision_at: recommendation.created_at,
    decision_policy_snapshot_id: '11111111-1111-7111-8111-111111111111',
    economic_tier_id: recommendation.economic_tier_id,
    evidence_hash: economicHash,
    horizon_at: now,
    model_version_id: '22222222-2222-7222-8222-222222222222',
    payload: {
      amounts: {
        entry_cost_usd: '25',
        entry_filled_shares: '40',
        execution_fee_usd: '1',
        exit_proceeds_usd: '31.25',
        exited_shares: '40',
        expected_maker_rebate_usd: '0',
        net_pnl_usd: '6.25',
        net_return_bps: '2500',
        resolution_payout_usd: '0',
      },
      detail: {
        entered_at: recommendation.created_at,
        kind: 'horizon_liquidated',
        liquidated_at: now,
      },
      evidence: {
        exit_evidence_kind: 'full_bid_ladder',
        fee_covered: true,
        full_l2_covered: true,
        passive_trade_covered: true,
        replay_input_hash: contentHash('b'),
        replay_output_hash: contentHash('c'),
      },
    },
    recommendation_id: recommendation.recommendation_id,
    recommendation_report_id: recommendation.recommendation_report_id,
    replay_kernel_version: 'policy-replay-v1',
    report_route_run_id: recommendation.report_route_run_id,
    research_profile_artifact_id: contentHash('d'),
    source_available_until: now,
    state: 'horizon_liquidated',
    trade_policy_artifact_id: contentHash('e'),
  };
  const comparison: RecommendationExecutionComparisonView = {
    comparison_hash: contentHash('f'),
    economic_outcome_hash: economicHash,
    evaluation: {
      actual_entry_latency_ms: 1125,
      actual_entry_price: '0.61',
      actual_fee_usd: '1',
      actual_fill_ratio: '1',
      actual_net_return_bps: '2500',
      actual_vs_planned_price_bps: '100',
      fee_delta_usd: '0',
      fill_ratio_delta: '0',
      latency_delta_ms: 125,
      planned_entry_latency_ms: 1000,
      planned_entry_price: '0.60',
      planned_fee_usd: '1',
      planned_fill_ratio: '1',
      planned_net_return_bps: '2200',
      policy_missed_return_bps: '50',
      return_delta_bps: '300',
      status: 'evaluated',
    },
    policy_counterfactual_hash: contentHash('1'),
    recommendation_id: recommendation.recommendation_id,
    trajectory_artifact_hash: contentHash('2'),
  };
  const health: RouteEconomicHealthView = {
    assessed_through: now,
    available_at: now,
    coverage: '0.8',
    created_at: now,
    due_observation_count: 10,
    effective_sample_size: '8',
    evidence: {
      methodology_version: 'route-economic-health-v1',
      observation_hash: contentHash('3'),
      uniqueness_weight_hash: contentHash('4'),
    },
    evidence_hash: contentHash('5'),
    feedback_policy_hash: contentHash('6'),
    lower_confidence_return_bps: '175',
    research_profile_artifact_id: contentHash('d'),
    route: recommendation.route,
    route_identity_hash: contentHash('7'),
    state: 'healthy',
    usable_observation_count: 8,
    weighted_mean_return_bps: '250',
    window_start: recommendation.created_at,
  };

  await page.route(
    `**/api/quant/recommendations/${recommendation.recommendation_id}/economic-outcome`,
    (route) =>
      route.fulfill({ json: { code: 200, data: outcome, message: 'OK' } }),
  );
  await page.route(
    `**/api/quant/recommendations/${recommendation.recommendation_id}/execution-comparison`,
    (route) =>
      route.fulfill({
        json: { code: 200, data: comparison, message: 'OK' },
      }),
  );
  await page.route('**/api/research/economic-health?*', (route) =>
    route.fulfill({
      json: {
        code: 200,
        data: { has_next: false, items: [health], page: 1, size: 1, total: 1 },
        message: 'OK',
      },
    }),
  );

  await page.goto(
    `/trading/recommendations?module=queue&entity=recommendation&id=${recommendation.recommendation_id}`,
  );
  await waitForUiReady(page, browserAudit);
  const feedback = page.getByTestId('recommendation-economic-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText(/在期限清算|Horizon Liquidated/i);
  await expect(feedback).toContainText(/\$6\.25/);
  await expect(feedback).toContainText(/2,?500 bps/);
  await expect(feedback).toContainText(/125 ms/);
  await expect(feedback).toContainText(/健康|Healthy/i);
  await expect(feedback).toContainText(/8\/10/);
  await expect(feedback).toContainText(economicHash);
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
    entry_authorization_policy: 'operator_approval_required',
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
    const routeDetail = modalDetail(page, /入场路线|Entry Route/i);
    const postOnlyDetail = modalDetail(page, /仅挂单|Post-only/i);
    const ttlDetail = modalDetail(page, /有效时长|Time to Live/i);
    if (entryRoute === 'aggressive') {
      for (const label of [
        /返佣比例|Rebate Rate/i,
        /名义返佣应计|Nominal Rebate Accrual/i,
        /Objective 返佣信用|Objective Rebate Credit/i,
        /每日支付门槛|Daily Payout Threshold/i,
        /预计入账延迟|Expected Credit Delay/i,
      ]) {
        await expect(modalDetail(page, label)).toContainText('—');
      }
      await expect(routeDetail).toContainText(/主动|Aggressive/i);
      await expect(postOnlyDetail).toContainText(/否|No/i);
      await expect(ttlDetail).toContainText('—');
    } else {
      await expect(
        modalDetail(page, /名义返佣应计|Nominal Rebate Accrual/i),
      ).toContainText(/\$0\.12/);
      await expect(
        modalDetail(page, /名义返佣应计|Nominal Rebate Accrual/i),
      ).toContainText(
        /不是可用现金.*绝不抵扣风险|not available cash.*never offsets risk/i,
      );
      await expect(
        modalDetail(page, /Objective 返佣信用|Objective Rebate Credit/i),
      ).toContainText(/\$0\.10/);
      await expect(routeDetail).toContainText(/被动|Passive/i);
      await expect(postOnlyDetail).toContainText(/是|Yes/i);
      await expect(ttlDetail).not.toContainText('—');
    }

    await dialog.getByRole('button', { name: /取\s*消|Cancel/i }).click();
    await expect(modal).toHaveCount(0);
  }

  await expectReleaseQuality(page);
});
