import type { Locator, Page } from 'playwright/test';

import type {
  BrowserFailureAudit,
  ExpectedRequestFailure,
} from './browser-failure-audit';

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import AxeBuilder from '@axe-core/playwright';

import { expect, readFirstApiItem, test, waitForShell } from './fixtures';

interface FeedbackCycleRow {
  champion_model_version_id: string;
  feedback_cycle_id: string;
}

interface FactorRow {
  factor_definition_id: string;
}

interface ModelRow {
  model_version_id: string;
}

type Theme = 'dark' | 'light';

interface Viewport {
  height: number;
  name: string;
  width: number;
}

interface EvidenceManifestRow {
  height: number;
  path: string;
  state: string;
  theme: Theme;
  width: number;
}

const VIEWPORTS: Viewport[] = [
  { height: 812, name: '375x812', width: 375 },
  { height: 1024, name: '768x1024', width: 768 },
  { height: 720, name: '1280x720', width: 1280 },
  { height: 900, name: '1440x900', width: 1440 },
];

const FEEDBACK_TRANSITION_ABORTS: readonly ExpectedRequestFailure[] = [
  {
    errorText: 'net::ERR_ABORTED',
    method: 'GET',
    pathname: '/api/research/feedback-overview',
    search: '',
  },
  {
    errorText: 'net::ERR_ABORTED',
    method: 'GET',
    pathname: '/api/research/feedback-cycles',
    search: '?page=1&size=20',
  },
];

const THEMES: Theme[] = ['light', 'dark'];

const STATE_ROOTS: Record<string, string> = {
  dashboard: '[data-testid="dashboard-command-center"]',
  'domain-sources': '[data-testid="domain-sources-page"]',
  'factor-detail': '[data-testid="factors-page"]',
  'feedback-cycles': '[data-testid="feedback-workbench"]',
  'model-detail': '[data-testid="models-page"]',
};

function findingDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function expectThemeSurface(page: Page, theme: Theme) {
  const expectsDark = theme === 'dark';
  await expect
    .poll(() =>
      page
        .locator('html')
        .evaluate((element) => element.classList.contains('dark')),
    )
    .toBe(expectsDark);
  await expect
    .poll(() =>
      page.locator('html').evaluate((element) => {
        const style = window.getComputedStyle(element);
        const probe = document.createElement('span');
        probe.style.color = 'hsl(var(--background))';
        probe.style.display = 'none';
        document.body.append(probe);
        const channels =
          window
            .getComputedStyle(probe)
            .color.match(/\d+(?:\.\d+)?/g)
            ?.slice(0, 3)
            .map(Number) ?? [];
        probe.remove();
        const luminance =
          channels.length === 3
            ? channels
                .map((channel) => channel / 255)
                .map((channel) =>
                  channel <= 0.040_45
                    ? channel / 12.92
                    : ((channel + 0.055) / 1.055) ** 2.4,
                )
                .reduce(
                  (total, channel, index) =>
                    total + channel * ([0.2126, 0.7152, 0.0722][index] ?? 0),
                  0,
                )
            : null;
        let surfaceTone = 'invalid';
        if (luminance !== null) {
          if (luminance < 0.1) {
            surfaceTone = 'dark';
          } else if (luminance > 0.9) {
            surfaceTone = 'light';
          } else {
            surfaceTone = 'ambiguous';
          }
        }
        return {
          colorScheme: style.getPropertyValue('color-scheme').trim(),
          surfaceTone,
        };
      }),
    )
    .toEqual({ colorScheme: theme, surfaceTone: theme });
}

async function setTheme(page: Page, theme: Theme) {
  const expectsDark = theme === 'dark';
  const toggle = page.locator('button.theme-toggle').first();
  await expect(toggle).toBeVisible();
  const current = await toggle.evaluate((element) =>
    element.classList.contains('is-light'),
  );
  if (current !== expectsDark) {
    await toggle.click();
  }
  await expect
    .poll(() =>
      toggle.evaluate((element) => element.classList.contains('is-light')),
    )
    .toBe(expectsDark);
  await expectThemeSurface(page, theme);
}

async function waitForGrid(page: Page) {
  await waitForShell(page);
  await expect(page.locator('.vxe-body--row').first()).toBeVisible({
    timeout: 15_000,
  });
}

async function navigate(page: Page, audit: BrowserFailureAudit, url: string) {
  await audit.drainHttp(page);
  await page.goto(url);
}

async function openState(
  page: Page,
  audit: BrowserFailureAudit,
  state: string,
  factorId: string,
  modelId: string,
  feedbackCycleId: string,
) {
  await audit.allowRequestFailures(FEEDBACK_TRANSITION_ABORTS, async () => {
    switch (state) {
      case 'dashboard': {
        await navigate(page, audit, '/dashboard');
        await waitForShell(page);
        await expect(
          page.getByTestId('dashboard-command-center'),
        ).toBeVisible();
        await expect(
          page
            .getByTestId('dashboard-command-center')
            .getByText(/Feedback & Retraining|反馈与再训练/i),
        ).toBeVisible({ timeout: 15_000 });
        break;
      }
      case 'domain-sources': {
        await navigate(page, audit, '/research/domain-sources');
        await waitForGrid(page);
        break;
      }
      case 'factor-detail': {
        await navigate(page, audit, `/research/factors?open=${factorId}`);
        await waitForGrid(page);
        const dialog = page.getByRole('dialog').last();
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(factorId);
        await expect(dialog.locator('.ant-skeleton')).toHaveCount(0);
        break;
      }
      case 'feedback-cycles': {
        await navigate(
          page,
          audit,
          `/research/feedback?view=cycles&cycle_id=${encodeURIComponent(feedbackCycleId)}`,
        );
        await waitForShell(page);
        await page.getByRole('tab', { name: /Cycles|周期/i }).click();
        const navigation = page.getByRole('navigation', {
          name: /Feedback cycles|反馈周期/i,
        });
        await expect(navigation).toBeVisible();
        await expect(navigation).toContainText(feedbackCycleId);
        const detail = page.locator(
          `[aria-labelledby="feedback-cycle-detail-${feedbackCycleId}"]`,
        );
        await expect(detail).toBeVisible({ timeout: 15_000 });
        await expect(detail).toContainText(feedbackCycleId);
        break;
      }
      case 'model-detail': {
        await navigate(page, audit, `/research/models?open=${modelId}`);
        await waitForGrid(page);
        const dialog = page.getByRole('dialog').last();
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(modelId);
        await expect(dialog.locator('.ant-skeleton')).toHaveCount(0);
        break;
      }
      default: {
        throw new Error(`unknown responsive evidence state: ${state}`);
      }
    }
    await audit.drainHttp(page);
  });
}

async function collectAxe(
  page: Page,
  state: string,
  label: string,
  findings: string[],
) {
  const root = STATE_ROOTS[state];
  if (!root) {
    findings.push(`${label}: axe root is not defined`);
    return;
  }
  let builder = new AxeBuilder({ page })
    .include(root)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  if ((await page.locator('[role="dialog"]:visible').count()) > 0) {
    builder = builder.include('[role="dialog"]');
  }
  const result = await builder.analyze();
  for (const violation of result.violations) {
    if (violation.impact === 'critical' || violation.impact === 'serious') {
      findings.push(
        `${label}: axe ${violation.impact} ${violation.id}: ${violation.nodes
          .map((node) => node.target.join(' '))
          .join(', ')}`,
      );
    }
  }
}

async function collectOverflow(page: Page, label: string, findings: string[]) {
  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    document:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));
  if (overflow.body !== 0 || overflow.document !== 0) {
    findings.push(`${label}: viewport overflow ${JSON.stringify(overflow)}`);
  }
  const dialogOverflow = await page.getByRole('dialog').evaluateAll((dialogs) =>
    dialogs
      .filter((dialog) => {
        const style = window.getComputedStyle(dialog);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((dialog) => dialog.scrollWidth - dialog.clientWidth),
  );
  for (const value of dialogOverflow) {
    if (value !== 0) {
      findings.push(`${label}: dialog horizontal overflow ${value}px`);
    }
  }
}

async function collectTouchTarget(
  locator: Locator,
  label: string,
  findings: string[],
) {
  const count = await locator.count();
  if (count === 0) {
    findings.push(`${label}: touch target is absent`);
    return;
  }
  const target = locator.first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box === null) {
    findings.push(`${label}: touch target has no visible bounding box`);
    return;
  }
  if (box.height < 44 || box.width < 44) {
    findings.push(
      `${label}: touch target is ${Math.round(box.width)}x${Math.round(box.height)}, expected at least 44x44`,
    );
  }
}

async function collectTouch(page: Page, state: string, findings: string[]) {
  switch (state) {
    case 'dashboard': {
      const root = page.getByTestId('dashboard-command-center');
      await collectTouchTarget(
        root.getByTestId('dashboard-primary-action'),
        'dashboard/primary-action',
        findings,
      );
      await collectTouchTarget(
        root.getByTestId('dashboard-orbit-action').first(),
        'dashboard/orbit-action',
        findings,
      );
      await collectTouchTarget(
        root.getByRole('button', { name: /Open workspace|打开工作台/i }),
        'dashboard/feedback-workbench',
        findings,
      );

      break;
    }
    case 'domain-sources': {
      await collectTouchTarget(
        page.getByRole('button', { name: /Refresh|刷\s*新/i }).last(),
        'domain-sources/refresh',
        findings,
      );

      break;
    }
    case 'factor-detail': {
      await collectTouchTarget(
        page.getByRole('button', { name: /Collinearity|共线分析/i }),
        'factors/collinearity',
        findings,
      );
      await collectTouchTarget(
        page.locator('.table-operations button').first(),
        'factors/detail-action',
        findings,
      );

      break;
    }
    case 'feedback-cycles': {
      await collectTouchTarget(
        page.getByRole('button', { name: /Refresh|刷\s*新/i }).first(),
        'feedback/refresh',
        findings,
      );
      await collectTouchTarget(
        page
          .getByRole('navigation', {
            name: /Feedback cycles|反馈周期/i,
          })
          .getByRole('button')
          .first(),
        'feedback/cycle-row',
        findings,
      );

      break;
    }
    case 'model-detail': {
      await collectTouchTarget(
        page.getByRole('button', { name: /Train model|训练模型/i }),
        'models/train',
        findings,
      );
      await collectTouchTarget(
        page.locator('.table-operations button').first(),
        'models/detail-action',
        findings,
      );

      break;
    }
    // No default
  }
}

async function collectKeyboard(
  page: Page,
  audit: BrowserFailureAudit,
  factorId: string,
  findings: string[],
) {
  try {
    await audit.allowRequestFailures(FEEDBACK_TRANSITION_ABORTS, async () => {
      await page.setViewportSize({ height: 812, width: 375 });
      await openState(page, audit, 'dashboard', factorId, '', '');
      const orbit = page
        .getByTestId('dashboard-command-center')
        .getByTestId('dashboard-orbit-action')
        .first();
      await expect(orbit).toBeVisible({ timeout: 15_000 });
      const orbitKind = await orbit.getAttribute('data-orbit-kind');
      await orbit.focus();
      if (
        !(await orbit.evaluate((element) => document.activeElement === element))
      ) {
        findings.push('dashboard/orbit-action: keyboard focus did not land');
      }
      await page.keyboard.press('Enter');
      if (orbitKind === 'recommendation') {
        await expect(page.getByRole('dialog').last()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
      } else {
        await expect(page).toHaveURL(/\/quant\/reports(?:[/?#]|$)/);
      }

      await navigate(page, audit, '/research/factors');
      await waitForGrid(page);
      await audit.drainHttp(page);
      const detailAction = page.locator('.table-operations button').first();
      await detailAction.focus();
      if (
        !(await detailAction.evaluate(
          (element) => document.activeElement === element,
        ))
      ) {
        findings.push('factors/detail-action: keyboard focus did not land');
      }
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog').last()).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  } catch (error) {
    findings.push(`keyboard contract: ${findingDetail(error)}`);
  }
}

test('W3 responsive accessibility evidence matrix', async ({
  adminApi,
  authenticatedPage,
  browserAudit,
}) => {
  test.setTimeout(1_200_000);
  const evidenceRun =
    process.env.PLAYWRIGHT_EVIDENCE_RUN ?? `w3-ui09-${process.pid}`;
  const evidenceDir = resolve(
    process.cwd(),
    '..',
    'target',
    'phase-11.9',
    evidenceRun,
  );
  await mkdir(evidenceDir, { recursive: true });

  const factor = await readFirstApiItem<FactorRow>(
    adminApi.context,
    '/api/research/factors?page=1&size=100',
  );
  const feedbackCycle = await readFirstApiItem<FeedbackCycleRow>(
    adminApi.context,
    '/api/research/feedback-cycles?page=1&size=100',
  );
  const model = await readFirstApiItem<ModelRow>(
    adminApi.context,
    '/api/research/models?page=1&size=100',
    (candidate) =>
      candidate.model_version_id === feedbackCycle.champion_model_version_id,
  );
  const feedbackCycleId = feedbackCycle.feedback_cycle_id;
  const page = authenticatedPage;
  const findings: string[] = [];
  const manifest: EvidenceManifestRow[] = [];

  const states = [
    'dashboard',
    'feedback-cycles',
    'domain-sources',
    'factor-detail',
    'model-detail',
  ];
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      for (const state of states) {
        await page.setViewportSize({ height: 900, width: 1440 });
        await openState(
          page,
          browserAudit,
          state,
          factor.factor_definition_id,
          model.model_version_id,
          feedbackCycleId,
        );
        await setTheme(page, theme);
        await page.setViewportSize(viewport);
        await expectThemeSurface(page, theme);
        const label = `${viewport.name}/${theme}/${state}`;
        await collectAxe(page, state, label, findings);
        await collectOverflow(page, label, findings);
        if (viewport.width === 375) {
          await collectTouch(page, state, findings);
        }
        if (
          (state === 'dashboard' || state === 'feedback-cycles') &&
          (await page
            .locator('[role="status"][aria-live="polite"]')
            .count()) === 0
        ) {
          findings.push(`${label}: polite live region is absent`);
        }
        const screenshotPath = resolve(
          evidenceDir,
          `${viewport.name}-${theme}-${state}.png`,
        );
        await page.screenshot({
          animations: 'disabled',
          path: screenshotPath,
        });
        manifest.push({
          height: viewport.height,
          path: screenshotPath,
          state,
          theme,
          width: viewport.width,
        });
      }
    }
  }

  await collectKeyboard(
    page,
    browserAudit,
    factor.factor_definition_id,
    findings,
  );
  await writeFile(
    resolve(evidenceDir, 'manifest.json'),
    `${JSON.stringify({ findings, screenshots: manifest }, null, 2)}\n`,
  );

  expect(manifest).toHaveLength(40);
  expect(findings, findings.join('\n')).toEqual([]);
});
