import type { APIRequestContext, Locator, Page } from 'playwright/test';

import type { CurrentPolicyResourceView } from '@vben/types/config-api';

import { expect, installWebSocketAudit, readApiData, test } from './fixtures';
import { confirmGovernedAction } from './governed-action-driver';
import { expectReleaseQuality, waitForUiReady } from './release-closure';

// This file is intentionally last in the single-worker functional project.
// Restoring the original revision still advances the global activation
// generation, so decision-time fixtures must finish before this mutation.

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

async function activeRevision(context: APIRequestContext, path: string) {
  return readApiData<CurrentPolicyResourceView>(context, path).then(
    (current) => current.revision?.policy_revision_id,
  );
}

test('config lifecycle commits through CAS and remains auditable', async ({
  adminApi,
  authenticatedPage: page,
  browserAudit,
}) => {
  test.setTimeout(300_000);
  const currentPath = '/api/config/recommendation_policy/current';
  const original = await readApiData<CurrentPolicyResourceView>(
    adminApi.context,
    currentPath,
  );
  const originalRevision = original.revision?.policy_revision_id;
  if (!originalRevision) {
    throw new Error('fresh fixture has no active recommendation policy');
  }
  const wire = installWebSocketAudit(page);
  const baselineFrames = wire.received.length;
  let workspace: Locator | undefined;

  try {
    workspace = await editAndSave(page);
    await validateApproveActivate(page, workspace);
    expect(await activeRevision(adminApi.context, currentPath)).not.toBe(
      originalRevision,
    );
    await expect
      .poll(() => wire.received.length)
      .toBeGreaterThan(baselineFrames);
  } finally {
    if (
      (await activeRevision(adminApi.context, currentPath)) !== originalRevision
    ) {
      workspace ??= await openConfigResource(page);
      const finish = workspace.getByTestId('finish-config-workflow');
      if (await finish.isVisible()) await finish.click();
      await workspace
        .locator(`tr[data-revision-id="${originalRevision}"]`)
        .getByTestId('review-config-rollback')
        .click();
      await validateApproveActivate(page, workspace);
    }
  }

  expect(await activeRevision(adminApi.context, currentPath)).toBe(
    originalRevision,
  );
  await page.goto('/system/audit?module=receipts');
  await waitForUiReady(page, browserAudit);
  await expect(page.getByText(/Receipts|治理回执|回执/i).first()).toBeVisible();
  await expectReleaseQuality(page);
});
