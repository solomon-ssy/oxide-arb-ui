import type { Locator, Page } from 'playwright/test';

import type { CurrentPolicyResourceView } from '@vben/types/config-api';

import type { ReleaseScenario } from './release-closure';

import {
  expect,
  installWebSocketAudit,
  readApiData,
  readFirstApiItem,
  test,
} from './fixtures';
import { confirmGovernedAction } from './governed-action-driver';
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

async function openConfigResource(page: Page) {
  await page.goto(
    '/system/config?module=policy&entity=config-resource&id=recommendation_policy',
  );
  const workspace = page.getByTestId('config-resource-workspace');
  await expect(workspace).toBeVisible();
  return workspace;
}

async function editAndSave(page: Page) {
  const workspace = await openConfigResource(page);
  await workspace.getByTestId('edit-config-draft').click();
  const input = workspace
    .locator('.ant-input-number-input:not([disabled])')
    .first();
  const original = Number(await input.inputValue());
  if (!Number.isFinite(original)) {
    throw new TypeError('recommendation policy fixture has no numeric control');
  }
  await input.fill(String(original > 1 ? original - 1 : original + 1));
  await page.keyboard.press('Tab');
  await workspace.getByTestId('save-config-draft').click();
  await confirmGovernedAction(page, 'ui release closure creates policy draft');
  await expect(workspace.getByTestId('config-review')).toBeVisible();
  return workspace;
}

async function validateApproveActivate(page: Page, workspace: Locator) {
  await workspace.getByTestId('validate-config-draft').click();
  await confirmGovernedAction(page, 'ui release closure validates policy');
  await expect(workspace.getByTestId('config-validation-result')).toContainText(
    /通过|Passed/i,
  );
  await workspace.getByTestId('approve-config-draft').click();
  await confirmGovernedAction(page, 'ui release closure approves policy');
  await workspace.getByTestId('activate-config-draft').click();
  await confirmGovernedAction(page, 'ui release closure activates policy');
  await expect(
    workspace.getByTestId('config-activation-success'),
  ).toBeVisible();
}

test('config lifecycle commits through CAS and remains auditable', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  test.setTimeout(300_000);
  const wire = installWebSocketAudit(page);
  const original = await readApiData<CurrentPolicyResourceView>(
    adminApi.context,
    '/api/config/recommendation_policy/current',
  );
  const originalRevision = original.revision?.policy_revision_id;
  if (!originalRevision) {
    throw new Error('fresh fixture has no active recommendation policy');
  }
  const baselineFrames = wire.received.length;

  const workspace = await editAndSave(page);
  await validateApproveActivate(page, workspace);
  const activated = await readApiData<CurrentPolicyResourceView>(
    adminApi.context,
    '/api/config/recommendation_policy/current',
  );
  expect(activated.revision?.policy_revision_id).not.toBe(originalRevision);
  await expect.poll(() => wire.received.length).toBeGreaterThan(baselineFrames);

  await workspace.getByTestId('finish-config-workflow').click();
  await workspace
    .locator(`tr[data-revision-id="${originalRevision}"]`)
    .getByTestId('review-config-rollback')
    .click();
  await validateApproveActivate(page, workspace);
  const restored = await readApiData<CurrentPolicyResourceView>(
    adminApi.context,
    '/api/config/recommendation_policy/current',
  );
  expect(restored.revision?.policy_revision_id).toBe(originalRevision);

  await page.goto('/system/audit?module=receipts');
  await waitForUiReady(page, browserAudit);
  await expect(page.getByText(/Receipts|治理回执|回执/i).first()).toBeVisible();
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

test('@visual release closure captures the platform state matrix', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}, testInfo) => {
  test.setTimeout(1_200_000);
  await setEvidenceMedia(page);
  const seedRevision = await waitForSeedRevision(adminApi.context);
  const theme = releaseTheme(testInfo);
  const project = testInfo.project.name;

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
      '/api/markets?page=1&size=100',
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
    },
    {
      name: 'state-config-policy',
      path: '/system/config?module=policy&entity=config-resource&id=recommendation_policy',
    },
  ];
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
