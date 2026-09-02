import type { APIRequestContext, Page } from 'playwright/test';

import type {
  EquitySnapshotView,
  Paginated,
  RuntimeActivityPageView,
} from '@vben/types';

import type { ReleaseScenario } from './release-closure';

import { RELEASE_SCENARIOS } from '../../../../scripts/ui-release-contract';
import { expect, readApiData, readFirstApiItem, test } from './fixtures';
import {
  captureReleaseEvidence,
  expectReleaseQuality,
  releaseTheme,
  setEvidenceMedia,
  waitForSeedRevision,
  waitForUiReady,
} from './release-closure';

interface EntityRow {
  market_id?: string;
  model_spec_id?: string;
  name?: string;
  order_intent_id?: string;
  recommendation_report_id?: string;
  status?: string;
}

async function selectHistoricalEquity(page: Page, api: APIRequestContext) {
  const history = await readApiData<Paginated<EquitySnapshotView>>(
    api,
    '/api/quant/account/equity-snapshots?page=1&size=100',
  );
  const historical = history.items
    .filter(
      (row) =>
        row.account_snapshot_ref !== null &&
        row.account_snapshot_ref !== undefined,
    )
    .toSorted((left, right) => left.as_of.localeCompare(right.as_of));
  expect(historical).toHaveLength(2);
  const [earlier, later] = historical;
  if (!earlier || !later)
    throw new Error('report-bound equity history is absent');
  // RangePicker submits seconds; the repository uses the half-open [from, to)
  // interval. Include both precise report times without admitting live ticks.
  const from = new Date(
    Math.floor(Date.parse(earlier.as_of) / 1000) * 1000,
  ).toISOString();
  const to = new Date(
    (Math.floor(Date.parse(later.as_of) / 1000) + 1) * 1000,
  ).toISOString();
  const filteredResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === '/api/quant/account/equity-snapshots' &&
      url.searchParams.get('from') === from &&
      url.searchParams.get('to') === to
    );
  });
  const inputs = page.locator('.ant-picker-range input');
  await expect(inputs).toHaveCount(2);
  await inputs.nth(0).fill(from.slice(0, 19).replace('T', ' '));
  await inputs.nth(0).press('Enter');
  await inputs.nth(1).fill(to.slice(0, 19).replace('T', ' '));
  await inputs.nth(1).press('Enter');
  await page.keyboard.press('Escape');
  const response = await filteredResponse;
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as {
    data: Paginated<EquitySnapshotView>;
  };
  expect(payload.data.total).toBe(2);
  expect(
    payload.data.items.map((row) => row.equity_snapshot_id).toSorted(),
  ).toEqual(historical.map((row) => row.equity_snapshot_id).toSorted());
  await expect(page.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(
    2,
  );
  const chart = page.locator('[data-equity-series-points]');
  await expect(chart).toHaveAttribute('data-equity-series-points', '2');
  await expect(chart).toHaveAttribute('data-echarts-ready', 'true');
  await inputs.evaluateAll((elements) => {
    for (const element of elements) {
      (element as HTMLElement).dataset.screenshotVolatile = 'true';
    }
  });
}

test('equity history range selects only report-bound snapshots', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  await page.goto('/execution/portfolio?module=equity');
  await waitForUiReady(page, browserAudit);
  await selectHistoricalEquity(page, adminApi.context);
  await waitForUiReady(page, browserAudit);
  const clear = page.locator('.equity-range .ant-picker-clear');
  await expect(clear).toBeVisible();
  const [clearBox, inputBox] = await Promise.all([
    clear.boundingBox(),
    page.locator('.equity-range input').last().boundingBox(),
  ]);
  if (!clearBox || !inputBox)
    throw new Error('equity range controls have no layout box');
  expect(clearBox.width).toBeGreaterThanOrEqual(24);
  expect(clearBox.height).toBeGreaterThanOrEqual(24);
  expect(clearBox.x).toBeGreaterThanOrEqual(inputBox.x + inputBox.width);
  await expectReleaseQuality(page);
});

test('workspace overlay select dropdowns size to options instead of the panel', async ({
  authenticatedPage: page,
  browserAudit,
}) => {
  await page.goto(
    '/system/config?module=policy&entity=config-resource&id=report_schedule',
  );
  await waitForUiReady(page, browserAudit);
  const workspace = page.getByTestId('config-resource-workspace');
  await expect(workspace).toBeVisible();
  await workspace.getByTestId('edit-config-draft').click();
  const cadence = workspace
    .locator('.schedule-field')
    .filter({ hasText: /触发节奏|Cadence/i })
    .locator('.ant-select:not(.ant-select-disabled)')
    .first();
  await expect(cadence).toBeVisible();
  await cadence.click();
  const dropdown = page.locator('.ant-select-dropdown:visible').first();
  await expect(dropdown).toBeVisible();
  const [dropdownBox, panelBox] = await Promise.all([
    dropdown.boundingBox(),
    page.locator('.workspace-object-stage').boundingBox(),
  ]);
  if (!dropdownBox || !panelBox) {
    throw new Error('cadence dropdown or object stage has no layout box');
  }
  expect(dropdownBox.height).toBeLessThan(320);
  expect(dropdownBox.height).toBeLessThan(panelBox.height * 0.4);
  await expectReleaseQuality(page);
});

test('motion contract preserves timing and collapses under reduced motion', async ({
  authenticatedPage: page,
  browserAudit,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/runtime/activity');
  await waitForUiReady(page, browserAudit);
  await page.locator('body').evaluate((body) => {
    const probe = document.createElement('div');
    probe.className = 'qp-scan-motion';
    probe.dataset.testid = 'motion-scan-probe';
    body.append(probe);
  });
  const scanProbe = page.getByTestId('motion-scan-probe');
  const regular = await scanProbe.evaluate((element) => {
    const style = getComputedStyle(element, '::after');
    return {
      duration: style.animationDuration,
      name: style.animationName,
      timing: style.animationTimingFunction,
    };
  });
  expect(regular).toEqual({
    duration: '2.4s',
    name: 'qp-scan',
    timing: 'linear',
  });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await scanProbe.evaluate((element) => {
    const style = getComputedStyle(element, '::after');
    return {
      duration: style.animationDuration,
      iterations: style.animationIterationCount,
    };
  });
  expect(reduced).toEqual({ duration: '0.001s', iterations: '1' });
});

test('dashboard preserves FreshBoot reflow at 320px', async ({
  authenticatedPage: page,
  browserAudit,
}) => {
  await page.setViewportSize({ height: 720, width: 320 });
  await page.goto('/dashboard');
  await waitForUiReady(page, browserAudit);
  const panel = page.locator('.fresh-boot-panel');
  await expect(panel).toBeVisible();
  await expectReleaseQuality(page);
  const overflow = await panel.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});

test('@visual release closure captures the platform state matrix', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}, testInfo) => {
  test.setTimeout(1_200_000);
  const systemStatus = await readApiData<{ checked_at: string }>(
    adminApi.context,
    '/api/system/status',
  );
  await setEvidenceMedia(page, systemStatus.checked_at);
  const seedRevision = await waitForSeedRevision(adminApi.context);
  const activity = await readApiData<RuntimeActivityPageView>(
    adminApi.context,
    '/api/runtime/activities?limit=50',
  );
  expect(activity.summary).toEqual({
    by_domain: [
      { count: 7, domain: 'research' },
      { count: 2, domain: 'report' },
      { count: 1, domain: 'execution' },
      { count: 1, domain: 'reconciliation' },
      { count: 1, domain: 'settlement' },
    ],
    total: 12,
  });
  const theme = releaseTheme(testInfo);
  const project = testInfo.project.name;
  if (!(project in RELEASE_SCENARIOS))
    throw new Error('Unreviewed release project');
  const expectedScenarios =
    RELEASE_SCENARIOS[project as keyof typeof RELEASE_SCENARIOS];

  const baseScenarios: ReleaseScenario[] = [
    { name: 'page-dashboard', path: '/dashboard' },
    { name: 'page-activity-center', path: '/runtime/activity' },
    {
      name: 'page-market-intelligence',
      path: '/trading/market-intelligence?module=overview',
    },
    {
      name: 'page-recommendations',
      path: '/trading/recommendations?module=reports',
    },
    { name: 'page-execution-orders', path: '/execution/orders?module=intents' },
    { name: 'page-portfolio', path: '/execution/portfolio?module=account' },
    {
      name: 'page-post-trade',
      path: '/execution/post-trade?module=reconciliation',
    },
    { name: 'page-research-lab', path: '/research/lab?module=lineage' },
    {
      name: 'page-learning-policy',
      path: '/research/learning-policy?module=policies',
    },
    {
      name: 'page-data-reliability',
      path: '/research/data-reliability?module=sources',
    },
    { name: 'page-system-config', path: '/system/config?module=runtime' },
    {
      name: 'page-system-audit',
      path: '/system/audit?module=operations&category=auth',
    },
  ];

  const visualScenarios =
    project === 'visual-tablet-dark'
      ? baseScenarios.filter(({ name }) => name === 'page-dashboard')
      : baseScenarios;
  expect(visualScenarios.map(({ name }) => name)).toEqual(
    expectedScenarios.filter((name) => name.startsWith('page-')),
  );
  for (const scenario of visualScenarios) {
    await captureReleaseEvidence({
      audit: browserAudit,
      dataRevision: seedRevision,
      page,
      scenario,
      seedRevision,
      testInfo,
      theme,
    });
  }

  if (project !== 'visual-desktop-dark') return;

  const [market, report, intent, modelSpec] = await Promise.all([
    readFirstApiItem<EntityRow>(
      adminApi.context,
      '/api/markets?page=1&size=100&subscribed=true',
    ),
    readFirstApiItem<EntityRow>(
      adminApi.context,
      '/api/quant/reports?page=1&size=100&status=revoked',
      ({ status }) => status === 'revoked',
    ),
    readFirstApiItem<EntityRow>(
      adminApi.context,
      '/api/quant/intents?page=1&size=100&status=invalidated',
      ({ status }) => status === 'invalidated',
    ),
    readFirstApiItem<EntityRow>(
      adminApi.context,
      '/api/research/model-specs?page=1&size=100',
      ({ name }) => name === 'ui-demo-seed-model',
    ),
  ]);
  if (
    !market.market_id ||
    !report.recommendation_report_id ||
    !intent.order_intent_id ||
    !modelSpec.model_spec_id
  ) {
    throw new Error('visual matrix fixture is missing canonical entity ids');
  }
  const criticalScenarios: ReleaseScenario[] = [
    {
      name: 'state-market-live',
      path: `/trading/market-intelligence?module=live&entity=market&id=${market.market_id}`,
      prepare: async (currentPage) => {
        const series = currentPage.locator('[data-market-series-points]');
        await expect(series).toHaveCount(3, { timeout: 30_000 });
        await expect
          .poll(
            async () =>
              series.evaluateAll((elements) =>
                elements.every(
                  (element) =>
                    Number(
                      (element as HTMLElement).dataset.marketSeriesPoints,
                    ) >= 8,
                ),
              ),
            { timeout: 30_000 },
          )
          .toBe(true);
      },
    },
    {
      name: 'state-report-detail',
      path: `/trading/recommendations?module=queue&entity=report&id=${report.recommendation_report_id}`,
    },
    {
      name: 'state-report-funnel',
      path: `/trading/recommendations?module=funnel&entity=report&id=${report.recommendation_report_id}`,
    },
    {
      name: 'state-report-diff',
      path: `/trading/recommendations?module=diff&entity=report&id=${report.recommendation_report_id}`,
    },
    {
      name: 'state-execution-flow',
      path: `/execution/orders?module=flow&entity=order-intent&id=${intent.order_intent_id}`,
    },
    {
      name: 'state-approval-queue',
      path: '/execution/orders?module=approvals',
    },
    {
      name: 'state-portfolio-exposure',
      path: '/execution/portfolio?module=exposure',
    },
    {
      name: 'state-portfolio-equity',
      path: '/execution/portfolio?module=equity',
      prepare: (currentPage) =>
        selectHistoricalEquity(currentPage, adminApi.context),
    },
    {
      name: 'state-settlement-ledger',
      path: '/execution/post-trade?module=settlement',
    },
    {
      name: 'state-governed-actions',
      path: '/execution/post-trade?module=actions',
    },
    {
      name: 'state-lineage-inspector',
      path: '/research/lab?module=lineage',
      prepare: async (currentPage) => {
        await currentPage.locator('.lineage-node').first().click();
        await expect(
          currentPage.locator('.workspace-inspector-surface'),
        ).toBeVisible();
      },
    },
    {
      name: 'state-model-spec',
      path: `/research/lab?module=specs&entity=model-spec&id=${modelSpec.model_spec_id}`,
    },
    {
      name: 'state-feedback-loop',
      path: '/research/learning-policy?module=feedback',
      prepare: async (currentPage) => {
        await expect(
          currentPage.getByTestId('feedback-overview-revision'),
        ).toHaveText(String(seedRevision));
      },
    },
    {
      name: 'state-config-policy',
      path: '/system/config?module=policy&entity=config-resource&id=recommendation_policy',
    },
  ];
  expect(
    [...visualScenarios, ...criticalScenarios].map(({ name }) => name),
  ).toEqual(expectedScenarios);
  for (const scenario of criticalScenarios) {
    await captureReleaseEvidence({
      audit: browserAudit,
      dataRevision: seedRevision,
      page,
      scenario,
      seedRevision,
      testInfo,
      theme,
    });
  }
});
