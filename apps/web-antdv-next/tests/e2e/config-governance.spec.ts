import type { Locator, Page, Route } from 'playwright/test';

import type { LifecycleView } from '@vben/types/config-api';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from 'playwright/test';

const CONFIG_RESOURCE_PATH = '/system/config/recommendation_policy';
const DRAFT_MUTATION_STRIDE = 100;
const VIEWER_USERNAME = 'config-viewer';
const VIEWER_PASSWORD = 'config-viewer-password';
let draftMutationSequence = 0;

const PRINCIPAL_ROUTES = [
  ['/system/config', 'config-overview'],
  ['/system/config/recommendation_policy', 'config-resource-workspace'],
  ['/system/config/execution_risk_policy', 'config-resource-workspace'],
  ['/system/config/model_routing', 'config-resource-workspace'],
  ['/system/config/report_schedule', 'config-resource-workspace'],
  ['/system/config/operational_control', 'config-resource-workspace'],
  ['/system/config/execution_authorization', 'config-resource-workspace'],
  ['/system/config/deployment', 'config-deployment'],
  ['/system/config/lifecycle', 'config-lifecycle'],
  ['/system/config/activity', 'config-activity'],
] as const;

async function waitForShell(page: Page) {
  await expect(page.getByText(/加载菜单中|Loading menu/i)).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.locator('.ant-skeleton')).toHaveCount(0, {
    timeout: 15_000,
  });
}

async function login(page: Page, username = 'admin', password = 'admin') {
  await page.goto('/auth/login');
  await page.locator("input[name='username']").fill(username);
  await page.locator("input[name='password']").fill(password);
  await page.getByRole('button', { name: /登录|Login/i }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/dashboard');
  await waitForShell(page);
}

async function openConfigResource(
  page: Page,
  resource = 'recommendation_policy',
) {
  await page.goto(`/system/config/${resource}`);
  await waitForShell(page);
  const workspace = page.getByTestId('config-resource-workspace');
  await expect(workspace).toBeVisible();
  return workspace;
}

async function settleAnimations(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    await Promise.allSettled(
      document
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    );
  });
}

async function setTheme(page: Page, dark: boolean) {
  const html = page.locator('html');
  const current = await html.evaluate((element) =>
    element.classList.contains('dark'),
  );
  if (current !== dark) {
    await page.locator('button.theme-toggle').first().click();
  }
  await (dark
    ? expect(html).toHaveClass(/(?:^|\s)dark(?:\s|$)/)
    : expect(html).not.toHaveClass(/(?:^|\s)dark(?:\s|$)/));
  await settleAnimations(page);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBeTruthy();
}

async function expectAccessible(page: Page, selector: string) {
  await settleAnimations(page);
  const accessibility = await new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) =>
      ['critical', 'serious'].includes(impact ?? ''),
    ),
  ).toEqual([]);
}

async function expectDialogFocus(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBeTruthy();
}

async function confirmGovernedAction(page: Page, reason: string) {
  const modal = page.getByTestId('governed-action-modal');
  await expect(modal).toBeVisible();
  await expectDialogFocus(page);
  await modal.getByTestId('governed-reason').fill(reason);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确\s*认|Confirm/i })
    .click();
  await expect(modal).toHaveCount(0);
  await page.waitForTimeout(200);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.locator('.ant-notification-notice')).toHaveCount(0, {
    timeout: 10_000,
  });
}

function volatileMask(page: Page) {
  return [page.locator('[data-screenshot-volatile="true"]')];
}

async function beginChangedDraft(page: Page) {
  const workspace = await openConfigResource(page);
  const edit = workspace.getByTestId('edit-config-draft');
  await edit.focus();
  await expect(edit).toBeFocused();
  await page.keyboard.press('Enter');
  const numericInput = workspace
    .locator('.ant-input-number-input:not([disabled])')
    .first();
  await expect(numericInput).toBeVisible();
  const original = Number(await numericInput.inputValue());
  expect(Number.isFinite(original)).toBeTruthy();
  draftMutationSequence += 1;
  await numericInput.fill(
    String(original + DRAFT_MUTATION_STRIDE + draftMutationSequence),
  );
  await page.keyboard.press('Tab');
  await expect(workspace.getByTestId('save-config-draft')).toBeEnabled();
  return workspace;
}

async function saveChangedDraft(page: Page) {
  const workspace = await beginChangedDraft(page);
  await workspace.getByTestId('save-config-draft').click();
  await confirmGovernedAction(page, 'e2e create immutable Config draft');
  await expect(workspace.getByTestId('config-review')).toBeVisible();
  return workspace;
}

async function validateDraft(page: Page, workspace: Locator) {
  await workspace.getByTestId('validate-config-draft').click();
  await confirmGovernedAction(page, 'e2e validate exact Config candidate');
  const validation = workspace.getByTestId('config-validation-result');
  await expect(validation).toBeVisible();
  await expect(validation).toContainText(/通过|Passed/i);
  await expect(workspace.getByTestId('approve-config-draft')).toBeEnabled();
}

async function approveDraft(page: Page, workspace: Locator) {
  await workspace.getByTestId('approve-config-draft').click();
  await confirmGovernedAction(page, 'e2e approve exact Config revision');
  await expect(workspace.getByTestId('activate-config-draft')).toBeEnabled();
}

async function prepareApprovedDraft(page: Page) {
  const workspace = await saveChangedDraft(page);
  await validateDraft(page, workspace);
  await approveDraft(page, workspace);
  return workspace;
}

async function activateDraft(page: Page, workspace: Locator) {
  await workspace.getByTestId('activate-config-draft').click();
  await confirmGovernedAction(page, 'e2e CAS activate Config revision');
  await expect(
    workspace.getByTestId('config-activation-success'),
  ).toBeVisible();
}

async function activateFreshRevision(page: Page) {
  const workspace = await prepareApprovedDraft(page);
  await activateDraft(page, workspace);
  return workspace;
}

async function startRollback(page: Page, workspace: Locator) {
  await workspace.getByTestId('finish-config-workflow').click();
  await waitForShell(page);
  const rollback = workspace.getByTestId('review-config-rollback').first();
  await expect(rollback).toBeEnabled();
  await rollback.click();
  await expect(workspace.getByTestId('config-review')).toBeVisible();
  await expect(workspace).toContainText(/回滚|Rollback/i);
}

async function fulfillLifecycle(
  route: Route,
  state: 'pre_production_resettable' | 'production_frozen',
  checksPass: boolean,
) {
  const response = await route.fetch();
  const body = (await response.json()) as { data: LifecycleView };
  body.data.state = state;
  body.data.required_confirmation_phrase =
    state === 'production_frozen' ? null : 'SEAL PRODUCTION';
  if (checksPass) {
    body.data.checks = body.data.checks.map((check) => ({
      ...check,
      outcome: 'passed',
    }));
  }
  body.data.production_baseline =
    state === 'production_frozen'
      ? {
          build_commit: '1111111111111111111111111111111111111111',
          clickhouse_schema_fingerprint:
            'blake3:2222222222222222222222222222222222222222222222222222222222222222',
          created_at: '2026-07-19T08:00:00Z',
          decision_policy_snapshot_id: '019f7800-0000-7000-8000-000000000001',
          environment: body.data.environment,
          evidence: {
            backup_evidence_hash:
              'blake3:4444444444444444444444444444444444444444444444444444444444444444',
            checks: [],
            config_e2e_evidence_hash:
              'blake3:5555555555555555555555555555555555555555555555555555555555555555',
          },
          lifecycle_policy_hash:
            'blake3:6666666666666666666666666666666666666666666666666666666666666666',
          policy_bundle_generation: 2,
          policy_bundle_hash:
            'blake3:3333333333333333333333333333333333333333333333333333333333333333',
          postgres_schema_fingerprint:
            'blake3:1111111111111111111111111111111111111111111111111111111111111111',
          production_baseline_id: '019f7800-0000-7000-8000-000000000002',
          sealed_at: '2026-07-19T08:00:00Z',
          sealed_by: {
            kind: 'system',
            label: 'protected-e2e',
            user_id: null,
          },
        }
      : null;
  await route.fulfill({ response, json: body });
}

test.describe
  .serial('Config governance executable acceptance scenarios', () => {
  test('[CFG-01] overview healthy is real, accessible, and theme-stable', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/system/config');
    await waitForShell(page);
    const overview = page.getByTestId('config-overview');
    await expect(overview).toBeVisible();
    await expect(page.locator('[data-testid^="config-resource-"]')).toHaveCount(
      6,
    );
    await expect(page.getByTestId('config-pending-approvals')).toHaveText('0');
    await setTheme(page, false);
    await expectAccessible(page, '[data-testid="config-overview"]');
    await expect(page).toHaveScreenshot('config-overview-light-desktop.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
    await setTheme(page, true);
    await expectAccessible(page, '[data-testid="config-overview"]');
    await expect(page).toHaveScreenshot('config-overview-dark-desktop.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
    await page.setViewportSize({ height: 844, width: 390 });
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('config-overview-dark-mobile.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-02] overview reports a real approved candidate and deployment restart boundary', async ({
    page,
  }) => {
    await login(page);
    await prepareApprovedDraft(page);
    await page.goto('/system/config');
    await waitForShell(page);
    const pending = page.getByTestId('config-pending-approvals');
    await expect(pending).not.toHaveText('0');
    await expect(page.getByTestId('config-restart-required')).toContainText(
      /需要|Required/i,
    );
    await expect(
      page.getByTestId('config-resource-recommendation_policy'),
    ).toContainText(/待审批|pending/i);
  });

  test('[CFG-03] recommendation policy opens the active typed document by default', async ({
    page,
  }) => {
    await login(page);
    const workspace = await openConfigResource(page);
    await expect(
      workspace.getByTestId('config-current-document'),
    ).toBeVisible();
    await expect(workspace.getByTestId('edit-config-draft')).toBeVisible();
    await expectAccessible(page, '[data-testid="config-resource-workspace"]');
    await expect(page).toHaveScreenshot('config-recommendation-default.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-04] keyboard editing exposes a dirty draft without persisting it', async ({
    page,
  }) => {
    await login(page);
    const workspace = await beginChangedDraft(page);
    await expect(workspace).toContainText(/已修改|changed/i);
    await expect(workspace.getByTestId('save-config-draft')).toBeEnabled();
    await expect(page).toHaveScreenshot('config-draft-dirty.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-05] invalid inline input focuses the explicit error contract', async ({
    page,
  }) => {
    await login(page);
    const workspace = await openConfigResource(page);
    await workspace.getByTestId('edit-config-draft').click();
    const numericInput = workspace
      .locator('.ant-input-number-input:not([disabled])')
      .first();
    await numericInput.fill('');
    const summary = workspace.getByTestId('config-editor-error-summary');
    await expect(summary).toBeVisible();
    await expect(
      workspace.getByTestId('config-inline-error').first(),
    ).toBeVisible();
    await summary.getByRole('button').first().click();
    await expect(numericInput).toBeFocused();
    await expect(page).toHaveScreenshot('config-inline-validation-error.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-06] immutable draft review renders a real before/after diff', async ({
    page,
  }) => {
    await login(page);
    const workspace = await saveChangedDraft(page);
    const review = workspace.getByTestId('config-review');
    await expect(review).toBeVisible();
    await expect(review.locator('.diff-row')).not.toHaveCount(0);
    const firstDiffValues = await review
      .locator('.diff-row')
      .first()
      .locator('dd')
      .allTextContents();
    expect(firstDiffValues).toHaveLength(2);
    expect(firstDiffValues[0]).not.toBe(firstDiffValues[1]);
    await page.setViewportSize({ height: 844, width: 390 });
    await expectNoHorizontalOverflow(page);
    await expect(page).toHaveScreenshot('config-review-diff-mobile.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-07] validated revision remains approval-pending until an authorized decision', async ({
    page,
  }) => {
    await login(page);
    const workspace = await saveChangedDraft(page);
    await validateDraft(page, workspace);
    await expect(workspace.getByTestId('approve-config-draft')).toBeEnabled();
    await expect(workspace.getByTestId('activate-config-draft')).toHaveCount(0);
    await expect(page).toHaveScreenshot('config-approval-pending.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-08] approved revision exposes consumer preflight evidence before activation', async ({
    page,
  }) => {
    await login(page);
    const workspace = await prepareApprovedDraft(page);
    await expect(
      workspace.getByTestId('config-validation-result'),
    ).toContainText(/通过|Passed/i);
    await expect(workspace.locator('.preflight-row')).not.toHaveCount(0);
    await expect(workspace.getByTestId('activate-config-draft')).toBeEnabled();
    await expect(page).toHaveScreenshot('config-activation-preflight.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-09] CAS activation commits and renders exact lineage success', async ({
    page,
  }) => {
    await login(page);
    const workspace = await activateFreshRevision(page);
    await expect(
      workspace.getByTestId('config-activation-success'),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('config-activation-success.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-10] two real browser contexts produce a stale generation conflict', async ({
    browser,
  }) => {
    const firstContext = await browser.newContext();
    const secondContext = await browser.newContext();
    try {
      const first = await firstContext.newPage();
      const second = await secondContext.newPage();
      await Promise.all([login(first), login(second)]);
      const [firstWorkspace, secondWorkspace] = await Promise.all([
        prepareApprovedDraft(first),
        prepareApprovedDraft(second),
      ]);
      await activateDraft(first, firstWorkspace);
      await secondWorkspace.getByTestId('activate-config-draft').click();
      await confirmGovernedAction(
        second,
        'e2e stale CAS from concurrent browser context',
      );
      const conflict = secondWorkspace.getByTestId(
        'config-activation-conflict',
      );
      await expect(conflict).toBeVisible();
      await expect(conflict).toContainText(/generation|版本|代次/i);
      await expect(
        secondWorkspace.getByTestId('config-activation-success'),
      ).toHaveCount(0);
      await expect(second).toHaveScreenshot(
        'config-stale-generation-conflict.png',
        {
          fullPage: true,
          mask: volatileMask(second),
        },
      );
    } finally {
      await Promise.all([firstContext.close(), secondContext.close()]);
    }
  });

  test('[CFG-11] rollback review binds an actual historical revision', async ({
    page,
  }) => {
    await login(page);
    const workspace = await activateFreshRevision(page);
    await startRollback(page, workspace);
    await expect(page).toHaveScreenshot('config-rollback-review.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-12] rollback revalidates, reapproves, and CAS-activates the target', async ({
    page,
  }) => {
    await login(page);
    const workspace = await activateFreshRevision(page);
    await startRollback(page, workspace);
    await validateDraft(page, workspace);
    await approveDraft(page, workspace);
    await workspace.getByTestId('activate-config-draft').click();
    await confirmGovernedAction(page, 'e2e activate explicit rollback');
    await expect(
      workspace.getByTestId('config-activation-success'),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('config-rollback-result.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-13] model routing uses published-artifact pickers, never free-text IDs', async ({
    page,
  }) => {
    await login(page);
    const workspace = await openConfigResource(page, 'model_routing');
    const picker = workspace.getByTestId('model-routing-artifact-picker');
    await expect(picker).toBeVisible();
    await expect(picker.locator('.ant-select')).not.toHaveCount(0);
    expect(
      await picker
        .locator('input')
        .evaluateAll((inputs) =>
          inputs.every((input) => input.closest('.ant-select') !== null),
        ),
    ).toBeTruthy();
    await expect(page).toHaveScreenshot('config-model-routing.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-14] report schedule preview resolves real next-fire times', async ({
    page,
  }) => {
    await login(page);
    const workspace = await openConfigResource(page, 'report_schedule');
    const preview = workspace.getByTestId('config-report-schedule-preview');
    await expect(preview).toBeVisible();
    await expect(preview.locator('article')).not.toHaveCount(0);
    await expect(preview).toContainText(/UTC|时区|timezone/i);
    const occurrences = preview.locator('time');
    await expect(occurrences).toHaveCount(5);
    const fireTimes = await occurrences.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('datetime') ?? ''),
    );
    expect(fireTimes.every((value) => Number.isFinite(Date.parse(value)))).toBe(
      true,
    );
    expect(
      fireTimes.every((value, index) => {
        if (index === 0) {
          return true;
        }
        const previous = fireTimes[index - 1] ?? '';
        return Date.parse(value) > Date.parse(previous);
      }),
    ).toBe(true);
    await expect(page).toHaveScreenshot('config-report-schedule.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-15] operational control performs and recovers a real halted transition', async ({
    page,
  }) => {
    await login(page);
    const workspace = await openConfigResource(page, 'operational_control');
    const panel = workspace.getByTestId('config-operational-control');
    await panel
      .getByRole('button', { name: /停止执行|Stop execution/i })
      .click();
    await confirmGovernedAction(page, 'e2e halt execution control plane');
    await expect(panel).toContainText(/受限|restricted/i);
    await expect(page).toHaveScreenshot('config-operational-control.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
    await panel
      .getByRole('button', { name: /恢复正常运行|Restore normal/i })
      .click();
    await confirmGovernedAction(page, 'e2e restore execution control plane');
    await expect(panel).not.toContainText(/受限|restricted/i);
  });

  test('[CFG-16] deployment exposes health and budgets while redacting secret values', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/system/config/deployment');
    await waitForShell(page);
    const deployment = page.getByTestId('config-deployment');
    await expect(
      deployment.getByTestId('config-credential-health'),
    ).not.toHaveCount(0);
    await expect(deployment).not.toContainText('harness-redis-secret');
    await expect(deployment).not.toContainText(
      'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc',
    );
    await expectAccessible(page, '[data-testid="config-deployment"]');
    await expect(page).toHaveScreenshot('config-deployment-redacted.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-17] lifecycle reports the real preproduction resettable boundary', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/system/config/lifecycle');
    await waitForShell(page);
    const lifecycle = page.getByTestId('config-lifecycle');
    await expect(lifecycle).toContainText(
      /投产前可重置|Pre-production.*resettable/i,
    );
    await expect(lifecycle).not.toContainText(
      /已不可逆封存|production.*frozen/i,
    );
    await expectAccessible(page, '[data-testid="config-lifecycle"]');
  });

  test('[CFG-18] seal confirmation is keyboard-safe and never seals the local database', async ({
    page,
  }) => {
    await login(page);
    await page.route('**/api/config/lifecycle', (route) =>
      fulfillLifecycle(route, 'pre_production_resettable', true),
    );
    await page.goto('/system/config/lifecycle');
    await waitForShell(page);
    const seal = page.getByRole('button', {
      name: /封存生产基线|Seal Production Baseline/i,
    });
    await expect(seal).toBeEnabled();
    await seal.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expectDialogFocus(page);
    await expectAccessible(page, '[role="dialog"]');
    await dialog
      .locator('input:not([disabled])')
      .last()
      .fill('SEAL PRODUCTION');
    await dialog.getByTestId('governed-reason').fill('e2e seal review only');
    await expect(
      dialog.getByRole('button', { name: /确\s*认|Confirm/i }),
    ).toBeEnabled();
    await expect(page).toHaveScreenshot(
      'config-production-seal-confirmation.png',
      { fullPage: true, mask: volatileMask(page) },
    );
    await dialog.getByRole('button', { name: /取\s*消|Cancel/i }).click();
    await expect(dialog).toHaveCount(0);
    await expect(seal).toBeFocused();
  });

  test('[CFG-19] frozen projection removes every mutation affordance', async ({
    page,
  }) => {
    await login(page);
    await page.route('**/api/config/lifecycle', (route) =>
      fulfillLifecycle(route, 'production_frozen', true),
    );
    const workspace = await openConfigResource(page);
    await expect(workspace).toContainText(
      /生产基线已不可逆封存|production.*frozen/i,
    );
    await expect(workspace.getByTestId('edit-config-draft')).toHaveCount(0);
    expect(
      await workspace
        .getByTestId('review-config-rollback')
        .evaluateAll((buttons) =>
          buttons.every((button) => (button as HTMLButtonElement).disabled),
        ),
    ).toBeTruthy();
    await expect(page).toHaveScreenshot('config-production-frozen.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-20] a seeded viewer reads Config through real RBAC and cannot mutate', async ({
    page,
  }) => {
    await login(page, VIEWER_USERNAME, VIEWER_PASSWORD);
    const workspace = await openConfigResource(page);
    await expect(workspace).toContainText(/只读|read.only/i);
    await expect(workspace.getByTestId('edit-config-draft')).toHaveCount(0);
    await expect(
      workspace.getByTestId('config-current-document'),
    ).toBeVisible();
    expect(
      await workspace
        .getByTestId('review-config-rollback')
        .evaluateAll((buttons) =>
          buttons.every((button) => (button as HTMLButtonElement).disabled),
        ),
    ).toBeTruthy();
    await expectAccessible(page, '[data-testid="config-resource-workspace"]');
    await expect(page).toHaveScreenshot('config-no-permission-read-only.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[CFG-21] an injected transient outage recovers through the real retry request', async ({
    page,
  }) => {
    await login(page);
    let failCurrent = true;
    await page.route(
      '**/api/config/recommendation_policy/current',
      async (route) => {
        await (failCurrent
          ? route.fulfill({
              contentType: 'application/json',
              json: { code: 503, data: null, message: 'deterministic outage' },
              status: 503,
            })
          : route.continue());
      },
    );
    await page.goto(CONFIG_RESOURCE_PATH);
    await waitForShell(page);
    const workspace = page.getByTestId('config-resource-workspace');
    await expect(workspace).toContainText(/配置资源加载失败|Failed to load/i);
    failCurrent = false;
    await workspace.getByRole('button', { name: /重\s*试|Retry/i }).click();
    await waitForShell(page);
    await expect(workspace).not.toContainText(
      /配置资源加载失败|Failed to load/i,
    );
    await expect(workspace.getByTestId('edit-config-draft')).toBeVisible();
  });

  test('[CFG-22] execution authorization renders typed canary and budget controls', async ({
    page,
  }) => {
    await login(page);
    const workspace = await openConfigResource(page, 'execution_authorization');
    await expect(workspace).toContainText(/执行授权|Execution Authorization/i);
    await expect(workspace.locator('.ant-input-number-input')).not.toHaveCount(
      0,
    );
    await expect(workspace.locator('textarea')).toHaveCount(0);
    await expect(page).toHaveScreenshot('config-execution-authorization.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });

  test('[X-01] every principal page stays within the 1024px viewport', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page);
    await page.setViewportSize({ height: 768, width: 1024 });
    for (const [route, testId] of PRINCIPAL_ROUTES) {
      await page.goto(route);
      await waitForShell(page);
      await expect(page.getByTestId(testId)).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test('[X-02] reduced motion removes Config entry animation and long transitions', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page);
    await page.goto('/system/config');
    await waitForShell(page);
    await expect(page.locator('.config-motion')).toHaveCount(0);
    const motion = await page
      .locator('.config-resource-card')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        const durationMs = (duration: string) => {
          const value = Number.parseFloat(duration);
          return duration.endsWith('ms') ? value : value * 1000;
        };
        return {
          animationName: style.animationName,
          maxTransitionDurationMs: Math.max(
            ...style.transitionDuration
              .split(',')
              .map((duration) => durationMs(duration)),
          ),
        };
      });
    expect(motion.animationName).toBe('none');
    expect(motion.maxTransitionDurationMs).toBeLessThanOrEqual(1);
  });
});
