import type { APIRequestContext, Locator, Page } from 'playwright/test';

import {
  expect,
  expectAccessible,
  loginAs,
  readApiData,
  test,
  waitForShell,
} from './fixtures';

const VIEWER_PASSWORD = 'production-stack-config-viewer';

interface CreatedUser {
  id: string;
}

interface RoleView {
  code: string;
  id: string;
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

async function confirmGovernedAction(page: Page, reason: string) {
  const modal = page.getByTestId('governed-action-modal');
  await expect(modal).toBeVisible();
  await modal.getByTestId('governed-reason').fill(reason);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /确\s*认|Confirm/i })
    .click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.ant-message-notice')).toHaveCount(0, {
    timeout: 10_000,
  });
  await expect(page.locator('.ant-notification-notice')).toHaveCount(0, {
    timeout: 10_000,
  });
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

test('permission boundary keeps viewer config access read-only', async ({
  adminApi,
  authenticatedPage,
  browser,
  namespace,
}) => {
  const adminWorkspace = await openConfigResource(authenticatedPage);
  await expect(adminWorkspace.getByTestId('edit-config-draft')).toBeVisible();

  const username = `${namespace}-config-viewer`;
  await createViewer(adminApi.context, username);
  const viewerContext = await browser.newContext();
  try {
    const viewerPage = await viewerContext.newPage();
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
  } finally {
    await viewerContext.close();
  }
});

test('policy lifecycle closes draft validation approval activation and rollback', async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  const workspace = await openConfigResource(page);
  await workspace.getByTestId('edit-config-draft').click();
  const invalidInput = workspace
    .locator('.ant-input-number-input:not([disabled])')
    .first();
  await invalidInput.fill('');
  const errorSummary = workspace.getByTestId('config-editor-error-summary');
  await expect(errorSummary).toBeVisible();
  await errorSummary.getByRole('button').first().click();
  await expect(invalidInput).toBeFocused();
  await page.reload();
  await waitForShell(page);

  const activeWorkspace = await prepareApprovedDraft(page);
  await expect(activeWorkspace.locator('.preflight-row')).not.toHaveCount(0);
  await activateDraft(page, activeWorkspace);
  await expect(
    activeWorkspace.getByTestId('config-activation-success'),
  ).toBeVisible();
  await expectAccessible(page, '[data-testid="config-resource-workspace"]');

  await activeWorkspace.getByTestId('finish-config-workflow').click();
  await waitForShell(page);
  await activeWorkspace.getByTestId('review-config-rollback').first().click();
  await expect(activeWorkspace.getByTestId('config-review')).toBeVisible();
  await expect(activeWorkspace).toContainText(/回滚|Rollback/i);
  await validateDraft(page, activeWorkspace);
  await approveDraft(page, activeWorkspace);
  await activateDraft(page, activeWorkspace);
  await expect(
    activeWorkspace.getByTestId('config-activation-success'),
  ).toBeVisible();
});

test('concurrent policy activation rejects the stale browser generation', async ({
  browser,
}) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await Promise.all([
      loginAs(first, 'admin', 'system-test-bootstrap-admin'),
      loginAs(second, 'admin', 'system-test-bootstrap-admin'),
    ]);
    const [firstWorkspace, secondWorkspace] = await Promise.all([
      prepareApprovedDraft(first, 11),
      prepareApprovedDraft(second, 12),
    ]);
    await activateDraft(first, firstWorkspace);
    await expect(
      firstWorkspace.getByTestId('config-activation-success'),
    ).toBeVisible();

    await secondWorkspace.getByTestId('activate-config-draft').click();
    await confirmGovernedAction(
      second,
      'production-stack reject stale concurrent generation',
    );
    const conflict = secondWorkspace.getByTestId('config-activation-conflict');
    await expect(conflict).toBeVisible();
    await expect(conflict).toContainText(/generation|版本|代次/i);
    await expect(
      secondWorkspace.getByTestId('config-activation-success'),
    ).toHaveCount(0);
    await expectAccessible(second, '[data-testid="config-resource-workspace"]');
  } finally {
    await Promise.all([firstContext.close(), secondContext.close()]);
  }
});
