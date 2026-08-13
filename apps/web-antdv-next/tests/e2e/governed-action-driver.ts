import type { Locator, Page } from 'playwright/test';

import { expect } from './fixtures';

const UI_ACTION_TIMEOUT = 10_000;
const GOVERNED_MUTATION_TIMEOUT = 60_000;

function governedActionModal(page: Page): Locator {
  return page.getByTestId('governed-action-modal');
}

function governedActionDialog(page: Page): Locator {
  const modal = governedActionModal(page);
  return page.getByRole('dialog').filter({ has: modal });
}

/** Complete the canonical governed-action modal through user-visible controls. */
export async function confirmGovernedAction(
  page: Page,
  reason: string,
): Promise<void> {
  const modal = governedActionModal(page);
  const dialog = governedActionDialog(page);
  await expect(dialog).toBeVisible({ timeout: UI_ACTION_TIMEOUT });
  await modal
    .getByTestId('governed-reason')
    .fill(reason, { timeout: UI_ACTION_TIMEOUT });

  const confirmation = modal.locator('input[id$="-confirm-word"]');
  if (await confirmation.isVisible()) {
    const instruction = await modal.locator('.governed-hint').last().innerText({
      timeout: UI_ACTION_TIMEOUT,
    });
    const match = /[「“"]([^」”"]+)[」”"]/.exec(instruction);
    const word = match?.[1];
    if (!word) {
      throw new Error('governed confirmation word is not visible to the user');
    }
    await confirmation.fill(word, { timeout: UI_ACTION_TIMEOUT });
  }

  const confirm = dialog.getByRole('button', {
    name: /确\s*认|Confirm/i,
  });
  await expect(confirm).toBeEnabled({ timeout: UI_ACTION_TIMEOUT });
  await confirm.click({ timeout: UI_ACTION_TIMEOUT });
  await expect(modal).toHaveCount(0, { timeout: GOVERNED_MUTATION_TIMEOUT });
  // Governed mutations surface short-lived global success feedback. Evidence
  // captures the durable page state, never a timer-dependent toast overlay.
  await expect(page.locator('.ant-message-notice')).toHaveCount(0, {
    timeout: UI_ACTION_TIMEOUT,
  });
  await expect(page.locator('.ant-notification-notice')).toHaveCount(0, {
    timeout: UI_ACTION_TIMEOUT,
  });
}

/** Open the ad-hoc report form and advance it to governed confirmation. */
export async function openReportGovernance(
  page: Page,
  parameters: { knowledgeLagSecs: number; topN: number },
): Promise<void> {
  const open = page.getByTestId('run-report-open');
  await expect(open).toBeVisible({ timeout: UI_ACTION_TIMEOUT });
  await open.click({ timeout: UI_ACTION_TIMEOUT });

  const form = page.getByTestId('run-report-form');
  const dialog = page.getByRole('dialog').filter({ has: form });
  await expect(dialog).toBeVisible({ timeout: UI_ACTION_TIMEOUT });
  await dialog
    .getByTestId('run-report-top-n')
    .fill(String(parameters.topN), { timeout: UI_ACTION_TIMEOUT });
  await dialog
    .getByTestId('run-report-knowledge-lag')
    .fill(String(parameters.knowledgeLagSecs), {
      timeout: UI_ACTION_TIMEOUT,
    });
  await dialog
    .getByRole('button', { name: /确\s*认|Confirm/i })
    .click({ timeout: UI_ACTION_TIMEOUT });
  await expect(dialog).toHaveCount(0, { timeout: UI_ACTION_TIMEOUT });
  await expect(governedActionDialog(page)).toBeVisible({
    timeout: UI_ACTION_TIMEOUT,
  });
}
