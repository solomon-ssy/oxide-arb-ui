import type { Page, Route } from 'playwright/test';

import type { LifecycleView } from '@vben/types/config-api';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from 'playwright/test';

const CONFIG_STATE_MANIFEST = [
  'overview_healthy',
  'overview_pending_approval_restart_required',
  'recommendation_default',
  'draft_dirty',
  'inline_validation_error',
  'review_diff',
  'approval_pending',
  'activation_preflight',
  'activation_success',
  'stale_generation_conflict',
  'rollback_review',
  'rollback_result',
  'model_routing_picker',
  'report_schedule_preview',
  'operational_control_halted',
  'deployment_redacted',
  'lifecycle_preproduction',
  'production_seal_confirmation',
  'production_frozen',
  'no_permission_read_only',
  'backend_error_recovery',
  'execution_authorization',
  'viewport_1024_overflow',
  'reduced_motion',
] as const;

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

test.beforeEach(({ page: _page }, testInfo) => {
  if (process.env.CI) testInfo.snapshotSuffix = 'darwin';
});

async function waitForShell(page: Page) {
  await expect(page.getByText(/加载菜单中|Loading menu/i)).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.locator('.ant-skeleton')).toHaveCount(0, {
    timeout: 15_000,
  });
}

async function login(page: Page) {
  await page.goto('/auth/login');
  await page.locator("input[name='username']").fill('admin');
  await page.locator("input[name='password']").fill('admin');
  await page.getByRole('button', { name: /登录|Login/i }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/dashboard');
  await waitForShell(page);
}

async function setTheme(page: Page, dark: boolean) {
  const html = page.locator('html');
  const current = await html.evaluate((element) =>
    element.classList.contains('dark'),
  );
  if (current !== dark)
    await page.locator('button.theme-toggle').first().click();
  await (dark
    ? expect(html).toHaveClass(/(?:^|\s)dark(?:\s|$)/)
    : expect(html).not.toHaveClass(/(?:^|\s)dark(?:\s|$)/));
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

async function expectConfigOverviewAccessible(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .include('[data-testid="config-overview"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) =>
      ['critical', 'serious'].includes(impact ?? ''),
    ),
  ).toEqual([]);
}

async function confirmGovernedAction(page: Page, reason: string) {
  const modal = page.getByTestId('governed-action-modal');
  await expect(modal).toBeVisible();
  await modal.getByTestId('governed-reason').fill(reason);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确\s*认|Confirm/i })
    .click();
}

function volatileMask(page: Page) {
  return [
    page.locator('[data-screenshot-volatile="true"]'),
    page.locator('.ant-notification'),
  ];
}

async function fulfillLifecycle(
  route: Route,
  state: 'pre_production_resettable' | 'production_frozen',
  checksPass: boolean,
) {
  const response = await route.fetch();
  const body = (await response.json()) as {
    data: LifecycleView;
  };
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

async function fulfillReadOnlyMe(route: Route) {
  const response = await route.fetch();
  const body = (await response.json()) as {
    data: {
      menus: MenuNode[];
      roles: unknown[];
    };
  };
  const denied = new Set([
    'config:activate',
    'config:approve',
    'config:create',
    'config:rollback',
    'config_lifecycle:seal',
  ]);
  type MenuNode = {
    children?: MenuNode[];
    permission_code?: null | string;
  };
  const retainReadOnlyNodes = (nodes: MenuNode[]): MenuNode[] =>
    nodes
      .filter((node) => !denied.has(node.permission_code ?? ''))
      .map((node) => ({
        ...node,
        children: node.children
          ? retainReadOnlyNodes(node.children)
          : node.children,
      }));
  body.data.roles = [];
  body.data.menus = retainReadOnlyNodes(body.data.menus);
  await route.fulfill({ response, json: body });
}

test.describe.serial('Config governance state matrix', () => {
  test('the canonical state manifest retains every required acceptance state', () => {
    expect(new Set(CONFIG_STATE_MANIFEST).size).toBe(24);
    expect(CONFIG_STATE_MANIFEST).toEqual(
      expect.arrayContaining([
        'inline_validation_error',
        'stale_generation_conflict',
        'rollback_result',
        'production_frozen',
        'no_permission_read_only',
        'backend_error_recovery',
        'execution_authorization',
        'viewport_1024_overflow',
      ]),
    );
  });

  test('overview and every principal Config page are accessible and do not overflow at 1024px', async ({
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

    await page.setViewportSize({ height: 900, width: 1440 });
    await page.goto('/system/config');
    await waitForShell(page);
    await expect(page.locator('[data-testid^="config-resource-"]')).toHaveCount(
      6,
    );
    await setTheme(page, false);
    await expectConfigOverviewAccessible(page);
    await expect(page).toHaveScreenshot('config-overview-light-desktop.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
    await setTheme(page, true);
    await expectConfigOverviewAccessible(page);
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

  test('keyboard workflow closes Draft, validation, approval, activation, and rollback', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page);
    await page.goto('/system/config/recommendation_policy');
    await waitForShell(page);
    const workspace = page.getByTestId('config-resource-workspace');
    await workspace.getByTestId('edit-config-draft').focus();
    await expect(workspace.getByTestId('edit-config-draft')).toBeFocused();
    await page.keyboard.press('Enter');

    const numericInput = workspace
      .locator('.ant-input-number-input:not([disabled])')
      .first();
    await expect(numericInput).toBeVisible();
    const original = Number(await numericInput.inputValue());
    await numericInput.fill('');
    await expect(
      workspace.getByTestId('config-editor-error-summary'),
    ).toBeVisible();
    await expect(
      workspace.getByTestId('config-inline-error').first(),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('config-inline-validation-error.png', {
      fullPage: true,
      mask: volatileMask(page),
    });

    await numericInput.fill(String(original + 1));
    await page.keyboard.press('Tab');
    await expect(
      workspace.getByTestId('config-editor-error-summary'),
    ).toHaveCount(0);
    await expect(workspace.getByTestId('save-config-draft')).toBeEnabled();
    await expect(page).toHaveScreenshot('config-draft-dirty.png', {
      fullPage: true,
      mask: volatileMask(page),
    });

    await workspace.getByTestId('save-config-draft').click();
    await confirmGovernedAction(page, 'e2e create immutable Config draft');
    await expect(workspace.getByTestId('config-review')).toBeVisible();
    await expect(page).toHaveScreenshot('config-review-diff.png', {
      fullPage: true,
      mask: volatileMask(page),
    });

    await workspace.getByTestId('validate-config-draft').click();
    await confirmGovernedAction(page, 'e2e validate exact Config candidate');
    const validation = workspace.getByTestId('config-validation-result');
    await expect(validation).toBeVisible();
    await expect(validation).toContainText(/通过|Passed/i);
    await expect(workspace.getByTestId('approve-config-draft')).toBeEnabled();

    await workspace.getByTestId('approve-config-draft').click();
    await confirmGovernedAction(page, 'e2e approve exact Config revision');
    await expect(workspace.getByTestId('activate-config-draft')).toBeEnabled();
    await expect(page).toHaveScreenshot('config-activation-preflight.png', {
      fullPage: true,
      mask: volatileMask(page),
    });

    let injectStaleGeneration = true;
    await page.route(
      '**/api/config/recommendation_policy/drafts/*/activate',
      async (route) => {
        await (injectStaleGeneration
          ? route.fulfill({
              contentType: 'application/json',
              json: {
                code: 409,
                data: null,
                message: 'stale policy bundle generation',
              },
              status: 409,
            })
          : route.continue());
      },
    );
    await workspace.getByTestId('activate-config-draft').click();
    await confirmGovernedAction(page, 'e2e CAS activate Config revision');
    const conflict = workspace.getByTestId('config-activation-conflict');
    await expect(conflict).toContainText(/stale policy bundle generation/i);
    await expect(page.getByTestId('governed-action-modal')).toHaveCount(0);
    await expect(
      workspace.getByTestId('config-activation-success'),
    ).toHaveCount(0);
    await expect(workspace.getByTestId('activate-config-draft')).toHaveCount(0);
    await expect(workspace.getByTestId('validate-config-draft')).toBeEnabled();
    await expect(page).toHaveScreenshot(
      'config-stale-generation-conflict.png',
      {
        fullPage: true,
        mask: [page.locator('[data-screenshot-volatile="true"]')],
      },
    );

    injectStaleGeneration = false;
    await workspace.getByTestId('validate-config-draft').click();
    await confirmGovernedAction(page, 'e2e revalidate after stale CAS');
    await workspace.getByTestId('approve-config-draft').click();
    await confirmGovernedAction(page, 'e2e reapprove after stale CAS');
    await workspace.getByTestId('activate-config-draft').click();
    await confirmGovernedAction(page, 'e2e CAS activate Config revision retry');
    await expect(
      workspace.getByTestId('config-activation-success'),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('config-activation-success.png', {
      fullPage: true,
      mask: volatileMask(page),
    });

    await workspace.getByTestId('finish-config-workflow').click();
    await waitForShell(page);
    const rollback = workspace.getByTestId('review-config-rollback').first();
    await expect(rollback).toBeEnabled();
    await rollback.click();
    await expect(workspace.getByTestId('config-review')).toBeVisible();
    await expect(workspace).toContainText(/回滚|Rollback/i);
    await expect(page).toHaveScreenshot('config-rollback-review.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
    await workspace.getByTestId('validate-config-draft').click();
    await confirmGovernedAction(page, 'e2e revalidate rollback target');
    await workspace.getByTestId('approve-config-draft').click();
    await confirmGovernedAction(page, 'e2e approve rollback target');
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

  test('specialized resources expose typed controls instead of free-form JSON', async ({
    page,
  }) => {
    await login(page);
    await page.setViewportSize({ height: 800, width: 1280 });
    const resources = [
      ['model_routing', /模型产物路由|Model artifact routing/i],
      ['report_schedule', /下一次运行预览|Next-run preview/i],
      ['operational_control', /Operational|运行控制|操作控制/i],
      ['execution_authorization', /Execution Authorization|执行授权/i],
    ] as const;
    for (const [kind, text] of resources) {
      await page.goto(`/system/config/${kind}`);
      await waitForShell(page);
      await expect(page.getByTestId('config-resource-workspace')).toContainText(
        text,
      );
      await expectNoHorizontalOverflow(page);
      await expect(page).toHaveScreenshot(`config-${kind}.png`, {
        fullPage: true,
        mask: volatileMask(page),
      });
    }
  });

  test('lifecycle proves seal review and frozen mutation lockout without sealing the local database', async ({
    page,
  }) => {
    await login(page);
    await page.route('**/api/config/lifecycle', (route) =>
      fulfillLifecycle(route, 'pre_production_resettable', true),
    );
    await page.goto('/system/config/lifecycle');
    await waitForShell(page);
    const lifecycle = page.getByTestId('config-lifecycle');
    const seal = lifecycle.getByRole('button', {
      name: /封存生产基线|Seal Production Baseline/i,
    });
    await expect(seal).toBeEnabled();
    await seal.click();
    await expect(page.getByTestId('governed-action-modal')).toBeVisible();
    await expect(page).toHaveScreenshot(
      'config-production-seal-confirmation.png',
      {
        fullPage: true,
        mask: volatileMask(page),
      },
    );
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /取\s*消|Cancel/i })
      .click();

    await page.unroute('**/api/config/lifecycle');
    await page.route('**/api/config/lifecycle', (route) =>
      fulfillLifecycle(route, 'production_frozen', true),
    );
    await page.goto('/system/config/recommendation_policy');
    await waitForShell(page);
    const workspace = page.getByTestId('config-resource-workspace');
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

  test('a transient backend failure recovers through the explicit retry action', async ({
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
    await page.goto('/system/config/recommendation_policy');
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

  test('a read-only principal can inspect Config but cannot start governed mutations', async ({
    page,
  }) => {
    await page.route('**/api/auth/me', fulfillReadOnlyMe);
    await login(page);
    await page.goto('/system/config/recommendation_policy');
    await waitForShell(page);
    const workspace = page.getByTestId('config-resource-workspace');
    await expect(workspace).toContainText(/只读|read.only/i);
    await expect(workspace.getByTestId('edit-config-draft')).toHaveCount(0);
    expect(
      await workspace
        .getByTestId('review-config-rollback')
        .evaluateAll((buttons) =>
          buttons.every((button) => (button as HTMLButtonElement).disabled),
        ),
    ).toBeTruthy();
    await expect(
      workspace.getByTestId('config-current-document'),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('config-no-permission-read-only.png', {
      fullPage: true,
      mask: volatileMask(page),
    });
  });
});
