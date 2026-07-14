import type { APIRequestContext, Page, TestInfo } from 'playwright/test';

import { expect, test } from 'playwright/test';

interface E2eFixtures {
  frozen_recommendation_id: string;
  model_version_id: string;
  pending_intent_id: string;
  position_id: string;
  trade_policy_artifact_id: string;
  unavailable_recommendation_id: string;
  waiting_intent_id: string;
}

const BACKEND = 'http://127.0.0.1:8088';

async function waitForShell(page: Page) {
  await page.waitForTimeout(500);
  await expect(page.getByText(/加载菜单中|Loading menu/i)).toHaveCount(0, {
    timeout: 15_000,
  });
}

async function loadFixtures(request: APIRequestContext) {
  const response = await request.get(`${BACKEND}/__test/fixtures`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as E2eFixtures;
}

async function login(page: Page) {
  await page.goto('/auth/login');
  await page.locator("input[name='username']").fill('admin');
  await page.locator("input[name='password']").fill('admin');
  await page.getByRole('button', { name: /登录|Login/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('body')).not.toContainText('403');
  await waitForShell(page);
}

async function attachMetadata(
  testInfo: TestInfo,
  fixtures: E2eFixtures,
  routes: string[],
) {
  await testInfo.attach('phase-11.7-visual-metadata.json', {
    body: JSON.stringify(
      {
        fixtures,
        routes,
        viewport: { height: 900, width: 1440 },
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
}

async function fillGovernedReason(page: Page, reason: string) {
  const modal = page.getByTestId('governed-action-modal');
  await expect(modal).toBeVisible();
  await modal.getByTestId('governed-reason').fill(reason);
}

test.describe.serial('Phase 11.7 protected operational closeout', () => {
  let fixtures: E2eFixtures;

  test.beforeAll(async ({ request }) => {
    fixtures = await loadFixtures(request);
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Unavailable and Frozen recommendations have distinct executable semantics', async ({
    page,
  }, testInfo) => {
    const unavailableRoute = `/quant/recommendations/${fixtures.unavailable_recommendation_id}`;
    await page.goto(unavailableRoute);
    await waitForShell(page);
    await expect(page.getByTestId('trade-plan-unavailable')).toBeVisible();
    await expect(page.getByTestId('create-intent')).toBeDisabled();
    await expect(page.getByTestId('trade-plan-unavailable')).toContainText(
      /覆盖|Coverage|coverage/,
    );
    await expect(page).toHaveScreenshot(
      'recommendation-unavailable-desktop.png',
      {
        fullPage: true,
      },
    );

    const frozenRoute = `/quant/recommendations/${fixtures.frozen_recommendation_id}`;
    await page.goto(frozenRoute);
    await waitForShell(page);
    await expect(page.getByTestId('trade-plan-unavailable')).toHaveCount(0);
    await expect(
      page.getByText(/操作员决策摘要|Decision summary/),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('recommendation-frozen-desktop.png', {
      fullPage: true,
    });
    await attachMetadata(testInfo, fixtures, [unavailableRoute, frozenRoute]);
  });

  test('approval arms automatically, BookStore observations reach Qualified, and cancel wins before claim', async ({
    page,
    request,
  }, testInfo) => {
    const approvalRoute = `/quant/intents/${fixtures.pending_intent_id}`;
    await page.goto(approvalRoute);
    await waitForShell(page);
    await expect(page.getByTestId('approve-intent')).toBeVisible();
    await page.getByTestId('approve-intent').click();

    const modal = page.getByTestId('governed-action-modal');
    await expect(
      modal.getByTestId('governed-field-auto_arm_acknowledged'),
    ).toBeVisible();
    await modal
      .getByTestId('governed-field-auto_arm_acknowledged')
      .getByRole('checkbox')
      .check();
    await fillGovernedReason(page, 'e2e operator reviewed frozen plan');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /确\s*认|Confirm/i })
      .click();
    await expect(page.getByTestId('approve-intent')).toHaveCount(0);
    await expect(page.getByTestId('cancel-intent')).toBeVisible();
    await expect(page.getByTestId('intent-detail')).toContainText(
      /立即|Immediate|Not required/i,
    );

    const waitingRoute = `/quant/intents/${fixtures.waiting_intent_id}`;
    await page.goto(waitingRoute);
    await waitForShell(page);
    const start = Date.now();
    const observe = async (offsetMs: number, stale = false) => {
      const response = await request.post(
        `${BACKEND}/__test/intents/${fixtures.waiting_intent_id}/book`,
        {
          data: {
            best_ask: '0.62',
            observed_at: new Date(start + offsetMs).toISOString(),
            stale,
          },
        },
      );
      const payload = (await response.json()) as {
        entry_condition_state?: string;
        error?: string;
      };
      expect(response.ok(), payload.error).toBeTruthy();
      return payload as { entry_condition_state: string };
    };

    const confirming = await observe(0);
    expect(confirming.entry_condition_state).toBe('confirming');
    const reset = await observe(500, true);
    expect(reset.entry_condition_state).toBe('unavailable');
    const reconfirming = await observe(1000);
    expect(reconfirming.entry_condition_state).toBe('confirming');
    const stillConfirming = await observe(2000);
    expect(stillConfirming.entry_condition_state).toBe('confirming');
    const qualified = await observe(3000);
    expect(qualified.entry_condition_state).toBe('qualified');
    await page.reload();
    await waitForShell(page);
    await expect(page.getByTestId('intent-detail')).toContainText(
      /满足条件|Qualified/i,
    );
    const conditionPanel = page.getByTestId('entry-condition-panel');
    await expect(conditionPanel).toBeVisible();
    await expect(conditionPanel.getByTestId('condition-tree')).toBeVisible();
    const evaluatedNodes = conditionPanel
      .getByTestId('condition-tree')
      .getByRole('listitem');
    await expect(evaluatedNodes.first()).toHaveAccessibleName(
      /满足|Satisfied/i,
    );
    await evaluatedNodes.first().focus();
    await expect(evaluatedNodes.first()).toBeFocused();
    await expect(
      conditionPanel.getByRole('button', {
        name: /复制求值哈希|Copy evaluation hash/i,
      }),
    ).toBeVisible();
    await conditionPanel
      .getByRole('button', { name: /叶子证据|Leaf evidence/i })
      .click();
    const evidencePayload = conditionPanel.getByText(
      /证据载荷|Evidence payload/i,
    );
    await expect(evidencePayload).toBeVisible();
    await expect(page.getByTestId('cancel-intent')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /提交|Submit/i }),
    ).toHaveCount(0);
    await waitForShell(page);
    const volatileConditionValues = page.locator(
      '[data-screenshot-volatile="true"]',
    );
    const conditionScreenshotMask = {
      mask: [volatileConditionValues],
      maskColor: '#262626',
    };
    await expect(page).toHaveScreenshot(
      'intent-qualified-before-claim-desktop.png',
      {
        fullPage: true,
        ...conditionScreenshotMask,
      },
    );
    await evidencePayload.scrollIntoViewIfNeeded();
    await expect(page).toHaveScreenshot('intent-leaf-evidence-desktop.png', {
      ...conditionScreenshotMask,
    });
    await page.setViewportSize({ height: 932, width: 430 });
    await evidencePayload.scrollIntoViewIfNeeded();
    await expect(page).toHaveScreenshot('intent-leaf-evidence-narrow.png', {
      ...conditionScreenshotMask,
    });
    await conditionPanel.evaluate((element) =>
      element.scrollIntoView({ block: 'start' }),
    );
    await expect(page).toHaveScreenshot(
      'intent-qualified-before-claim-narrow.png',
      { fullPage: true, ...conditionScreenshotMask },
    );

    await page.getByTestId('cancel-intent').click();
    await fillGovernedReason(page, 'e2e cancel before submission claim');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /确\s*认|Confirm/i })
      .click();
    await expect(page.getByTestId('intent-detail')).toContainText(
      /已取消|Cancelled/i,
    );
    await attachMetadata(testInfo, fixtures, [approvalRoute, waitingRoute]);
  });

  test('trade-policy candidate builder supports keyboard selection and stable rename', async ({
    page,
  }, testInfo) => {
    const route = '/research/trade-policy-fits/new';
    await page.goto(route);
    await waitForShell(page);
    const listbox = page.getByRole('listbox', {
      name: /条件候选|Condition candidates/i,
    });
    await expect(listbox).toBeVisible();
    const options = listbox.getByRole('option');
    await expect(options).toHaveCount(2);
    await options.nth(1).focus();
    await options.nth(1).press('ArrowUp');
    await expect(options.first()).toHaveAttribute('aria-selected', 'true');
    await options.first().press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');

    const candidateId = page.getByLabel(/候选 ID|Candidate ID/i);
    await candidateId.fill('conditional-renamed');
    await expect(
      listbox.getByRole('option', { name: /conditional-renamed/ }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByText(/仅支持 shadow|shadow-only/i).first(),
    ).toBeVisible();
    await expect(page.getByText(/最低 DSR|Minimum DSR/i)).toHaveCount(0);
    await expect(page.getByText(/最大 PBO|Maximum PBO/i)).toHaveCount(0);
    await expect(page.getByText(/最少 cohort|Minimum cohort/i)).toHaveCount(0);
    await expect(page.getByText('AutoExecution')).toHaveCount(0);
    await expect(page.getByText('SemiAuto · shadow_only')).toBeVisible();
    await expect(page).toHaveScreenshot('trade-policy-fit-shadow-desktop.png', {
      fullPage: true,
    });

    await page.setViewportSize({ height: 932, width: 430 });
    await expect(
      page.getByText(/Canonical 候选集 JSON|Canonical candidate JSON/i),
    ).toBeVisible();
    await expect(page).toHaveScreenshot('trade-policy-fit-shadow-narrow.png', {
      fullPage: true,
    });
    await attachMetadata(testInfo, fixtures, [route]);
  });

  test('policy audit, model binding, and server-projected exit monitor render on protected pages', async ({
    page,
  }, testInfo) => {
    const policyRoute = `/research/trade-policies?open=${fixtures.trade_policy_artifact_id}`;
    await page.goto(policyRoute);
    await waitForShell(page);
    await expect(page.getByTestId('trade-policy-detail')).toBeVisible();
    await expect(page.getByTestId('trade-policy-audit')).toBeVisible();
    await expect(page.getByTestId('trade-policy-audit')).toContainText(
      'test-only execution fixture publication',
    );
    await expect(page).toHaveScreenshot('trade-policy-audit-desktop.png', {
      fullPage: true,
    });

    const modelRoute = `/research/models?open=${fixtures.model_version_id}`;
    await page.goto(modelRoute);
    await waitForShell(page);
    await expect(page.getByText(/交易策略绑定|Trade policy/i)).toBeVisible();
    await page.getByText(/交易策略绑定|Trade policy/i).click();
    await expect(page.getByTestId('model-trade-policy-binding')).toContainText(
      fixtures.trade_policy_artifact_id,
    );
    await expect(page).toHaveScreenshot('model-policy-binding-desktop.png', {
      fullPage: true,
    });

    const positionRoute = `/quant/positions?open=${fixtures.position_id}`;
    await page.goto(positionRoute);
    await waitForShell(page);
    await expect(page.getByTestId('position-detail')).toBeVisible();
    await expect(page.getByTestId('exit-monitor-card')).toBeVisible();
    await expect(page.getByTestId('exit-monitor-card')).toContainText(
      /test-only governed reinference observation/,
    );
    await expect(page).toHaveScreenshot('position-exit-monitor-desktop.png', {
      fullPage: true,
    });

    await page.setViewportSize({ height: 932, width: 430 });
    await expect(page.getByTestId('position-detail')).toBeVisible();
    await expect(page).toHaveScreenshot('position-exit-monitor-narrow.png', {
      fullPage: true,
    });
    await attachMetadata(testInfo, fixtures, [
      policyRoute,
      modelRoute,
      positionRoute,
    ]);
  });
});
