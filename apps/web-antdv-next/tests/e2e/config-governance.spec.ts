import type { APIRequestContext, Locator, Page } from 'playwright/test';

import type { CurrentPolicyResourceView } from '@vben/types/config-api';

import {
  captureVisualMatrix,
  freezeEvidenceClock,
} from './deterministic-visual-matrix';
import {
  expect,
  expectAccessible,
  loginAs,
  readApiData,
  test,
  waitForShell,
} from './fixtures';
import { confirmGovernedAction } from './governed-action-driver';

const VIEWER_PASSWORD = 'production-stack-config-viewer';

interface CreatedUser {
  id: string;
}

interface RoleView {
  code: string;
  id: string;
}

interface RuntimeSchemaView {
  fields: Array<{ pointer: string }>;
}

const CONFIG_RESOURCES = [
  'recommendation_policy',
  'execution_risk_policy',
  'model_routing',
  'report_schedule',
  'operations_policy',
  'execution_automation_policy',
] as const;

async function captureConfigMatrix(
  page: Page,
  state: string,
  rootSelector = '[data-testid="config-resource-workspace"]',
) {
  await captureVisualMatrix(page, {
    rootSelector,
    state: `config-${state}`,
  });
}

async function openConfigResource(
  page: Page,
  resource = 'recommendation_policy',
) {
  await page.waitForLoadState('networkidle');
  await page.goto(`/system/config/${resource}`);
  await page.waitForLoadState('networkidle');
  await waitForShell(page);
  const workspace = page.getByTestId('config-resource-workspace');
  await expect(workspace).toBeVisible();
  return workspace;
}

async function changeDraft(page: Page, delta = 1) {
  const workspace = await openConfigResource(page);
  await workspace.getByTestId('edit-config-draft').click();
  const numericInput = workspace
    .locator('.ant-input-number-input:not([disabled])')
    .first();
  await expect(numericInput).toBeVisible();
  const original = Number(await numericInput.inputValue());
  if (!Number.isFinite(original)) {
    throw new TypeError('config fixture numeric field is not finite');
  }
  const next = original > delta ? original - delta : original + delta;
  await numericInput.fill(String(next));
  await page.keyboard.press('Tab');
  await expect(workspace.getByTestId('save-config-draft')).toBeEnabled();
  return workspace;
}

async function saveDraft(page: Page, delta = 1) {
  const workspace = await changeDraft(page, delta);
  await workspace.getByTestId('save-config-draft').click();
  await confirmGovernedAction(page, 'production-stack create immutable draft');
  await expect(workspace.getByTestId('config-review')).toBeVisible();
  return workspace;
}

async function validateDraft(page: Page, workspace: Locator) {
  await workspace.getByTestId('validate-config-draft').click();
  await confirmGovernedAction(page, 'production-stack validate candidate');
  await expect(workspace.getByTestId('config-validation-result')).toContainText(
    /通过|Passed/i,
  );
  await expect(workspace.getByTestId('approve-config-draft')).toBeEnabled();
}

async function approveDraft(page: Page, workspace: Locator) {
  await workspace.getByTestId('approve-config-draft').click();
  await confirmGovernedAction(page, 'production-stack approve candidate');
  await expect(workspace.getByTestId('activate-config-draft')).toBeEnabled();
}

async function prepareApprovedDraft(page: Page, delta = 1) {
  const workspace = await saveDraft(page, delta);
  await validateDraft(page, workspace);
  await approveDraft(page, workspace);
  return workspace;
}

async function activateDraft(page: Page, workspace: Locator) {
  await workspace.getByTestId('activate-config-draft').click();
  await confirmGovernedAction(page, 'production-stack CAS activate candidate');
}

async function createViewer(context: APIRequestContext, username: string) {
  const createdResponse = await context.post('/api/users', {
    data: {
      nickname: 'Production Stack Config Viewer',
      password: VIEWER_PASSWORD,
      username,
    },
  });
  expect(createdResponse.ok(), await createdResponse.text()).toBeTruthy();
  const created = (await createdResponse.json()) as { data: CreatedUser };
  const roles = await readApiData<RoleView[]>(context, '/api/roles');
  const viewer = roles.find((role) => role.code === 'viewer');
  if (!viewer) {
    throw new Error('production role catalog has no viewer role');
  }
  const assigned = await context.put(`/api/users/${created.data.id}/roles`, {
    data: { role_ids: [viewer.id] },
  });
  expect(assigned.ok(), await assigned.text()).toBeTruthy();
}

test('every runtime descriptor has one visible pointer control', async ({
  adminApi,
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  test.setTimeout(1_200_000);
  await freezeEvidenceClock(page);
  await page.goto('/system/config');
  await waitForShell(page);
  await expect(page.getByTestId('runtime-control-panel')).toBeVisible();
  await captureConfigMatrix(
    page,
    'overview-live-controls',
    '[data-testid="config-overview"]',
  );
  await page.goto('/system/config/deployment');
  await waitForShell(page);
  await expect(page.getByTestId('config-deployment')).toBeVisible();
  await captureConfigMatrix(
    page,
    'deployment-projection',
    '[data-testid="config-deployment"]',
  );
  for (const resource of CONFIG_RESOURCES) {
    const workspace = await openConfigResource(page, resource);
    const schema = await readApiData<RuntimeSchemaView>(
      adminApi.context,
      `/api/config/${resource}/schema`,
    );
    const expected = schema.fields.map((field) => field.pointer).toSorted();
    const rendered = await workspace
      .getByTestId('config-current-document')
      .locator('[data-config-pointer]')
      .evaluateAll((elements) =>
        elements
          .map((element) => element.dataset.configPointer)
          .filter((pointer): pointer is string => pointer !== undefined)
          .toSorted(),
      );
    expect(rendered, `${resource} descriptor/control coverage`).toEqual(
      expected,
    );
    expect(new Set(rendered).size, `${resource} pointer uniqueness`).toBe(
      rendered.length,
    );
    await captureConfigMatrix(page, `${resource}-current`);
    if (resource === 'model_routing') {
      await expect(workspace.getByTestId('edit-config-draft')).toHaveCount(0);
      const rollback = workspace.getByTestId('review-config-rollback').first();
      await expect(rollback).toBeVisible();
      await rollback.click();
      await expect(workspace.getByTestId('config-review')).toBeVisible();
      await captureConfigMatrix(page, `${resource}-rollback-draft`);
      continue;
    }
    await workspace.getByTestId('edit-config-draft').click();
    await expect(workspace.getByTestId('config-draft-column')).toBeVisible();
    await captureConfigMatrix(page, `${resource}-editor`);
  }
});

test('permission boundary keeps viewer config access read-only', async ({
  adminApi,
  authenticatedPage,
  browser,
  browserAudit,
  namespace,
}) => {
  test.setTimeout(600_000);
  await freezeEvidenceClock(authenticatedPage);
  const adminWorkspace = await openConfigResource(authenticatedPage);
  await expect(adminWorkspace.getByTestId('edit-config-draft')).toBeVisible();

  const username = `${namespace}-config-viewer`;
  await createViewer(adminApi.context, username);
  const viewerContext = await browser.newContext();
  try {
    const viewerPage = await viewerContext.newPage();
    await browserAudit.track(viewerPage);
    await freezeEvidenceClock(viewerPage);
    await loginAs(viewerPage, username, VIEWER_PASSWORD);
    const viewerWorkspace = await openConfigResource(viewerPage);
    await expect(
      viewerWorkspace.getByTestId('config-current-document'),
    ).toBeVisible();
    await expect(viewerWorkspace.getByTestId('edit-config-draft')).toHaveCount(
      0,
    );
    await expect(viewerWorkspace).toContainText(/只读|read.only/i);
    await expectAccessible(
      viewerPage,
      '[data-testid="config-resource-workspace"]',
    );
    await captureConfigMatrix(viewerPage, 'viewer-read-only');
  } finally {
    await viewerContext.close();
  }
});

test('policy lifecycle closes draft validation approval activation and rollback', async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  test.setTimeout(1_200_000);
  await freezeEvidenceClock(page);
  const workspace = await openConfigResource(page);
  await workspace.getByTestId('edit-config-draft').click();
  const invalidInput = workspace
    .locator('.ant-input-number-input:not([disabled])')
    .first();
  await invalidInput.fill('');
  await page.keyboard.press('Tab');
  const errorSummary = workspace.getByTestId('config-editor-error-summary');
  await expect(errorSummary).toBeVisible();
  await errorSummary.getByRole('button').first().click();
  await expect(invalidInput).toBeFocused();
  await captureConfigMatrix(page, 'validation-error');
  await page.waitForLoadState('networkidle');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await waitForShell(page);

  const activeWorkspace = await saveDraft(page);
  await captureConfigMatrix(page, 'semantic-review');
  await validateDraft(page, activeWorkspace);
  await expect(activeWorkspace.locator('.preflight-row')).not.toHaveCount(0);
  await captureConfigMatrix(page, 'preflight-validated');
  await approveDraft(page, activeWorkspace);
  await captureConfigMatrix(page, 'approved');
  await activateDraft(page, activeWorkspace);
  await expect(
    activeWorkspace.getByTestId('config-activation-success'),
  ).toBeVisible();
  await expectAccessible(page, '[data-testid="config-resource-workspace"]');
  await captureConfigMatrix(page, 'activation-success');

  await activeWorkspace.getByTestId('finish-config-workflow').click();
  await waitForShell(page);
  await activeWorkspace.getByTestId('review-config-rollback').first().click();
  await expect(activeWorkspace.getByTestId('config-review')).toBeVisible();
  await expect(activeWorkspace).toContainText(/回滚|Rollback/i);
  await captureConfigMatrix(page, 'rollback-review');
  await validateDraft(page, activeWorkspace);
  await approveDraft(page, activeWorkspace);
  await activateDraft(page, activeWorkspace);
  await expect(
    activeWorkspace.getByTestId('config-activation-success'),
  ).toBeVisible();
  await captureConfigMatrix(page, 'rollback-success');
});

test('concurrent policy activation rejects the stale browser generation', async ({
  adminApi,
  browser,
  browserAudit,
}) => {
  test.setTimeout(600_000);
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await Promise.all([browserAudit.track(first), browserAudit.track(second)]);
    await Promise.all([
      freezeEvidenceClock(first),
      freezeEvidenceClock(second),
    ]);
    await Promise.all([
      loginAs(first, 'admin', 'system-test-bootstrap-admin'),
      loginAs(second, 'admin', 'system-test-bootstrap-admin'),
    ]);
    const originalCurrent = await readApiData<CurrentPolicyResourceView>(
      adminApi.context,
      '/api/config/recommendation_policy/current',
    );
    const originalRevisionId = originalCurrent.revision?.policy_revision_id;
    if (!originalRevisionId) {
      throw new TypeError('config fixture has no original active revision');
    }
    const [firstWorkspace, secondWorkspace] = await Promise.all([
      prepareApprovedDraft(first, 11),
      prepareApprovedDraft(second, 12),
    ]);
    await activateDraft(first, firstWorkspace);
    await expect(
      firstWorkspace.getByTestId('config-activation-success'),
    ).toBeVisible();

    try {
      const conflict = secondWorkspace.getByTestId(
        'config-activation-conflict',
      );
      await browserAudit.allowResponse(
        {
          method: 'POST',
          pathname:
            /^\/api\/config\/recommendation_policy\/drafts\/[^/]+\/activate$/,
          status: 409,
        },
        async () => {
          await secondWorkspace.getByTestId('activate-config-draft').click();
          await confirmGovernedAction(
            second,
            'production-stack reject stale concurrent generation',
          );
          await expect(conflict).toBeVisible();
        },
      );
      await expect(conflict).toContainText(/generation|版本|代次/i);
      await expect(
        secondWorkspace.getByTestId('config-activation-success'),
      ).toHaveCount(0);
      await expectAccessible(
        second,
        '[data-testid="config-resource-workspace"]',
      );
      await captureConfigMatrix(second, 'stale-cas-conflict');
    } finally {
      // Restore the revision that preceded the winning concurrent activation
      // even when evidence capture fails, so later tests remain isolated.
      await firstWorkspace.getByTestId('finish-config-workflow').click();
      await waitForShell(first);
      await firstWorkspace
        .locator(`tr[data-revision-id="${originalRevisionId}"]`)
        .getByTestId('review-config-rollback')
        .click();
      await validateDraft(first, firstWorkspace);
      await approveDraft(first, firstWorkspace);
      await activateDraft(first, firstWorkspace);
      await expect(
        firstWorkspace.getByTestId('config-activation-success'),
      ).toBeVisible();
      await Promise.all([
        first.waitForLoadState('networkidle'),
        second.waitForLoadState('networkidle'),
      ]);
    }
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
  }
});

test('config backend failure recovers through the governed retry state', async ({
  authenticatedPage: page,
  browserAudit,
}) => {
  test.setTimeout(600_000);
  await freezeEvidenceClock(page);
  let rejected = false;
  const currentRoute = '**/api/config/recommendation_policy/current';
  await page.route(currentRoute, async (route) => {
    if (rejected) {
      await route.fallback();
      return;
    }
    rejected = true;
    await route.fulfill({
      body: JSON.stringify({
        code: 503,
        data: null,
        message: 'deterministic config recovery evidence',
      }),
      contentType: 'application/json',
      status: 503,
    });
  });
  await browserAudit.allowResponse(
    {
      method: 'GET',
      pathname: '/api/config/recommendation_policy/current',
      status: 503,
    },
    async () => {
      await page.goto('/system/config/recommendation_policy');
      await waitForShell(page);
      const workspace = page.getByTestId('config-resource-workspace');
      await expect(workspace).toBeVisible();
      const loadError = workspace.getByTestId('config-load-error');
      await expect(loadError).toBeVisible();
      await expect(loadError).toContainText(/加载|load/i);
      await captureConfigMatrix(page, 'backend-unavailable');
    },
  );
  await page.unroute(currentRoute);
  const retry = page.getByTestId('retry-config-load');
  await expect(retry).toBeEnabled();
  await retry.focus();
  await expect(retry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('config-current-document')).toBeVisible();
  await captureConfigMatrix(page, 'backend-recovered');
});
