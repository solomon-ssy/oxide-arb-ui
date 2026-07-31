import type { Locator, Page } from 'playwright/test';

import type { FeedbackDecision } from '@vben/types';

import type {
  BrowserFailureAudit,
  ExpectedRequestFailure,
} from './browser-failure-audit';

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import AxeBuilder from '@axe-core/playwright';

import {
  expect,
  login,
  readFirstApiItem,
  test,
  waitForShell,
} from './fixtures';
import {
  DashboardWebSocketOwner,
  installControlledBrowserEnvironment,
  setControlledOnline,
} from './w4-dashboard-race-harness';
import {
  holdFeedbackSnapshot,
  holdFeedbackTrigger,
  installFeedbackErrorState,
  installFeedbackPermissionState,
  installFeedbackPresentation,
  screenshotAggregate,
  sha256File,
} from './w4-responsive-a11y-harness';

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
type VisualSource =
  | 'authoritative'
  | 'governed-action'
  | 'real-upstream-derived-presentation'
  | 'transport-fault';
type VisualState =
  | 'dashboard'
  | 'dashboard-reconnecting'
  | 'decision-candidate-ready'
  | 'decision-challenger-rejected'
  | 'decision-no-action'
  | 'decision-promoted'
  | 'domain-sources'
  | 'factor-detail'
  | 'feedback-blocked'
  | 'feedback-cycles'
  | 'feedback-detail'
  | 'feedback-double-submit'
  | 'feedback-empty'
  | 'feedback-error'
  | 'feedback-loading'
  | 'feedback-overview'
  | 'feedback-permission'
  | 'model-detail';

interface Viewport {
  height: number;
  name: string;
  width: number;
}

interface EvidenceManifestRow {
  bytes: number;
  height: number;
  locale: 'zh-CN';
  path: string;
  sha256: string;
  source: VisualSource;
  state: VisualState;
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

const STATE_ROOTS: Record<VisualState, string> = {
  dashboard: '[data-testid="dashboard-command-center"]',
  'dashboard-reconnecting': '[data-testid="dashboard-command-center"]',
  'decision-candidate-ready': '[data-testid="feedback-workbench"]',
  'decision-challenger-rejected': '[data-testid="feedback-workbench"]',
  'decision-no-action': '[data-testid="feedback-workbench"]',
  'decision-promoted': '[data-testid="feedback-workbench"]',
  'domain-sources': '[data-testid="domain-sources-page"]',
  'factor-detail': '[data-testid="factors-page"]',
  'feedback-blocked': '[data-testid="feedback-workbench"]',
  'feedback-cycles': '[data-testid="feedback-workbench"]',
  'feedback-detail': '[data-testid="feedback-workbench"]',
  'feedback-double-submit': '[data-testid="feedback-workbench"]',
  'feedback-empty': '[data-testid="feedback-workbench"]',
  'feedback-error': '[data-testid="feedback-workbench"]',
  'feedback-loading': '[data-testid="feedback-workbench"]',
  'feedback-overview': '[data-testid="feedback-workbench"]',
  'feedback-permission': '[data-testid="feedback-workbench"]',
  'model-detail': '[data-testid="models-page"]',
};

const DECISION_STATES: Record<
  Extract<VisualState, `decision-${string}`>,
  FeedbackDecision
> = {
  'decision-candidate-ready': 'candidate_ready',
  'decision-challenger-rejected': 'challenger_rejected',
  'decision-no-action': 'no_action',
  'decision-promoted': 'promoted',
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

async function expectZhCn(page: Page) {
  await expect
    .poll(() =>
      page.locator('html').evaluate((element) => element.lang.toLowerCase()),
    )
    .toBe('zh-cn');
}

async function setTheme(page: Page, theme: Theme) {
  const expectsDark = theme === 'dark';
  const toggle = page.locator('button.theme-toggle').first();
  await expect(toggle).toBeVisible();
  const current = await toggle.evaluate((element) =>
    element.classList.contains('is-light'),
  );
  if (current !== expectsDark) {
    // Modal isolation and transient notifications correctly own the pointer
    // layer. Invoke the real theme button handler for evidence setup without
    // mutating classes, storage, or theme state out of band.
    await toggle.evaluate((element: HTMLButtonElement) => element.click());
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
  state: VisualState,
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
      case 'dashboard-reconnecting': {
        throw new TypeError(
          'dashboard-reconnecting requires the controlled transport owner',
        );
      }
      case 'domain-sources': {
        await navigate(page, audit, '/research/domain-sources');
        await waitForGrid(page);
        break;
      }
      case 'decision-candidate-ready':
      case 'decision-challenger-rejected':
      case 'decision-no-action':
      case 'decision-promoted':
      case 'feedback-cycles':
      case 'feedback-detail': {
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
      case 'factor-detail': {
        await navigate(page, audit, `/research/factors?open=${factorId}`);
        await waitForGrid(page);
        const dialog = page.getByRole('dialog').last();
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(factorId);
        await expect(dialog.locator('.ant-skeleton')).toHaveCount(0);
        break;
      }
      case 'feedback-blocked':
      case 'feedback-double-submit':
      case 'feedback-empty':
      case 'feedback-error':
      case 'feedback-loading':
      case 'feedback-overview': {
        await navigate(page, audit, '/research/feedback?view=overview');
        await waitForShell(page);
        await expect(page.getByTestId('feedback-workbench')).toBeVisible();
        break;
      }
      case 'feedback-permission': {
        await navigate(page, audit, '/research/feedback');
        await expect(page.getByTestId('feedback-workbench')).toBeVisible();
        await expect(page.getByTestId('feedback-workbench')).toContainText(
          /403|无权|Forbidden/i,
        );
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
  state: VisualState,
  label: string,
  findings: string[],
) {
  const root = STATE_ROOTS[state];
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

async function collectTouch(
  page: Page,
  state: VisualState,
  findings: string[],
) {
  switch (state) {
    case 'dashboard':
    case 'dashboard-reconnecting': {
      const root = page.getByTestId('dashboard-command-center');
      await collectTouchTarget(
        root.getByTestId('dashboard-primary-action'),
        `${state}/primary-action`,
        findings,
      );
      if (state === 'dashboard') {
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
      } else {
        await collectTouchTarget(
          page.getByTestId('websocket-status'),
          'dashboard-reconnecting/ws-status',
          findings,
        );
      }
      break;
    }
    case 'decision-candidate-ready':
    case 'decision-challenger-rejected':
    case 'decision-no-action':
    case 'decision-promoted':
    case 'feedback-cycles':
    case 'feedback-detail': {
      await collectTouchTarget(
        page.getByRole('button', { name: /Refresh|刷\s*新/i }).first(),
        `${state}/refresh`,
        findings,
      );
      await collectTouchTarget(
        page
          .getByRole('navigation', {
            name: /Feedback cycles|反馈周期/i,
          })
          .getByRole('button')
          .first(),
        `${state}/cycle-row`,
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
    case 'feedback-blocked':
    case 'feedback-double-submit':
    case 'feedback-empty':
    case 'feedback-loading':
    case 'feedback-overview': {
      await collectTouchTarget(
        page.getByRole('button', { name: /Refresh|刷\s*新/i }).first(),
        `${state}/refresh`,
        findings,
      );
      break;
    }
    case 'feedback-error': {
      await collectTouchTarget(
        page.getByRole('button', { name: /Retry|重\s*试/i }),
        'feedback-error/retry',
        findings,
      );
      break;
    }
    case 'feedback-permission': {
      await collectTouchTarget(
        page
          .getByTestId('feedback-workbench')
          .locator('button, a[href]')
          .first(),
        'feedback-permission/recovery-action',
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

async function collectLiveRegion(
  page: Page,
  state: VisualState,
  label: string,
  findings: string[],
) {
  const count = await page
    .locator(
      `${STATE_ROOTS[state]} [role="status"][aria-live="polite"], [role="dialog"]:visible [role="status"][aria-live="polite"]`,
    )
    .count();
  if (count === 0) {
    findings.push(`${label}: polite live region is absent`);
  }
}

async function prepareEvidenceFrame(page: Page, state: VisualState) {
  await page.evaluate(() => window.scrollTo({ left: 0, top: 0 }));
  if (
    state === 'feedback-detail' ||
    state === 'decision-candidate-ready' ||
    state === 'decision-challenger-rejected' ||
    state === 'decision-no-action' ||
    state === 'decision-promoted'
  ) {
    await page
      .locator('section[aria-labelledby^="feedback-cycle-detail-"]')
      .evaluate((element) => {
        element.scrollIntoView({ block: 'start', inline: 'nearest' });
        window.scrollBy({ top: -96 });
      });
  }
  const drawerBody = page.locator('[role="dialog"]:visible .ant-drawer-body');
  if ((await drawerBody.count()) > 0) {
    await drawerBody.first().evaluate((element) => {
      element.scrollTop = 0;
    });
  }
  await page.locator('body').evaluate((element) => {
    // A synchronous layout read is deterministic even when Playwright Clock is
    // paused to preserve the reconnecting state. Screenshot capture disables
    // animations separately, so a synthetic animation-frame wait adds no
    // visual guarantee and would deadlock under the frozen clock.
    void element.getBoundingClientRect();
  });
}

async function captureStateMatrix(
  page: Page,
  state: VisualState,
  source: VisualSource,
  evidenceDir: string,
  findings: string[],
  manifest: EvidenceManifestRow[],
) {
  for (const theme of THEMES) {
    await page.setViewportSize({ height: 900, width: 1440 });
    await page.evaluate(() => window.scrollTo({ left: 0, top: 0 }));
    await setTheme(page, theme);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await prepareEvidenceFrame(page, state);
      await expect(page.locator(STATE_ROOTS[state])).toBeVisible();
      await expectThemeSurface(page, theme);
      await expectZhCn(page);
      const label = `${viewport.name}/${theme}/${state}`;
      await collectAxe(page, state, label, findings);
      await collectOverflow(page, label, findings);
      await collectLiveRegion(page, state, label, findings);
      if (viewport.width === 375) {
        await collectTouch(page, state, findings);
        await prepareEvidenceFrame(page, state);
      }
      const screenshotName = `${viewport.name}-${theme}-${state}.png`;
      const screenshotPath = resolve(evidenceDir, screenshotName);
      await page.screenshot({
        animations: 'disabled',
        path: screenshotPath,
      });
      const digest = await sha256File(screenshotPath);
      manifest.push({
        bytes: digest.bytes,
        height: viewport.height,
        locale: 'zh-CN',
        path: screenshotName,
        sha256: digest.sha256,
        source,
        state,
        theme,
        width: viewport.width,
      });
    }
  }
}

async function collectKeyboard(
  page: Page,
  audit: BrowserFailureAudit,
  factorId: string,
  feedbackCycleId: string,
  modelId: string,
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

      await openState(
        page,
        audit,
        'feedback-cycles',
        factorId,
        modelId,
        feedbackCycleId,
      );
      const cycleAction = page
        .getByRole('navigation', {
          name: /Feedback cycles|反馈周期/i,
        })
        .getByRole('button')
        .first();
      await cycleAction.focus();
      if (
        !(await cycleAction.evaluate(
          (element) => document.activeElement === element,
        ))
      ) {
        findings.push('feedback/cycle-row: keyboard focus did not land');
      }
      await page.keyboard.press('Enter');
      await expect(
        page.locator(
          `[aria-labelledby="feedback-cycle-detail-${feedbackCycleId}"]`,
        ),
      ).toBeVisible();

      await navigate(page, audit, '/research/models');
      await waitForGrid(page);
      // VXE renders the fixed operation column in a separate table, so a
      // single DOM row never owns both the model ID and those buttons. The
      // canonical entity link has an exact accessible name and opens the same
      // detail drawer without coupling keyboard evidence to split-table DOM.
      const modelAction = page.getByRole('link', {
        exact: true,
        name: modelId,
      });
      await expect(modelAction).toBeVisible();
      await modelAction.focus();
      if (
        !(await modelAction.evaluate(
          (element) => document.activeElement === element,
        ))
      ) {
        findings.push('models/detail-link: keyboard focus did not land');
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

test('W4 responsive accessibility evidence matrix', async ({
  adminApi,
  authenticatedPage,
  browser,
  browserAudit,
}) => {
  test.setTimeout(2_400_000);
  const timestamp = new Date()
    .toISOString()
    .replaceAll(/[-:.]/g, '')
    .replace('Z', 'z')
    .toLowerCase();
  const evidenceRun =
    process.env.PLAYWRIGHT_EVIDENCE_RUN ?? `w4-e06-${timestamp}`;
  const evidenceDir = resolve(
    process.cwd(),
    '..',
    'target',
    'phase-11.9',
    evidenceRun,
  );
  await mkdir(evidenceDir);

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

  const authoritativeStates = [
    'dashboard',
    'feedback-overview',
    'feedback-cycles',
    'feedback-detail',
    'domain-sources',
    'factor-detail',
    'model-detail',
  ] satisfies VisualState[];
  for (const state of authoritativeStates) {
    await openState(
      page,
      browserAudit,
      state,
      factor.factor_definition_id,
      model.model_version_id,
      feedbackCycleId,
    );
    await captureStateMatrix(
      page,
      state,
      'authoritative',
      evidenceDir,
      findings,
      manifest,
    );
  }

  const blockedCleanup = await installFeedbackPresentation(
    page,
    'blocked',
    feedbackCycleId,
  );
  try {
    await openState(
      page,
      browserAudit,
      'feedback-blocked',
      factor.factor_definition_id,
      model.model_version_id,
      feedbackCycleId,
    );
    await expect(
      page
        .getByTestId('feedback-workbench')
        .getByRole('alert')
        .filter({
          hasText: /Readiness evidence is unavailable|就绪度证据不可用/i,
        }),
    ).toBeVisible();
    await captureStateMatrix(
      page,
      'feedback-blocked',
      'real-upstream-derived-presentation',
      evidenceDir,
      findings,
      manifest,
    );
  } finally {
    await blockedCleanup();
  }

  const emptyCleanup = await installFeedbackPresentation(
    page,
    'empty',
    feedbackCycleId,
  );
  try {
    await openState(
      page,
      browserAudit,
      'feedback-empty',
      factor.factor_definition_id,
      model.model_version_id,
      feedbackCycleId,
    );
    await page.getByRole('tab', { name: /Cycles|周期/i }).click();
    await expect(
      page.getByText(
        /No durable feedback cycle matches this page|本页没有匹配的持久化反馈周期/i,
      ),
    ).toBeVisible();
    await captureStateMatrix(
      page,
      'feedback-empty',
      'real-upstream-derived-presentation',
      evidenceDir,
      findings,
      manifest,
    );
  } finally {
    await emptyCleanup();
  }

  const loading = await holdFeedbackSnapshot(page);
  await navigate(page, browserAudit, '/research/feedback?view=overview');
  await loading.ready;
  await expect(
    page.getByTestId('feedback-workbench').locator('.ant-skeleton'),
  ).toBeVisible();
  await captureStateMatrix(
    page,
    'feedback-loading',
    'authoritative',
    evidenceDir,
    findings,
    manifest,
  );
  await loading.release();
  await browserAudit.drainHttp(page);

  const errorCleanup = await installFeedbackErrorState(page);
  try {
    await browserAudit.allowResponse(
      {
        method: 'GET',
        pathname: '/api/research/feedback-overview',
        status: 503,
      },
      async () => {
        await browserAudit.allowResponse(
          {
            method: 'GET',
            pathname: '/api/research/feedback-cycles',
            status: 503,
          },
          async () => {
            await openState(
              page,
              browserAudit,
              'feedback-error',
              factor.factor_definition_id,
              model.model_version_id,
              feedbackCycleId,
            );
            await expect(page.locator('.ant-alert-error')).toBeVisible();
            await captureStateMatrix(
              page,
              'feedback-error',
              'real-upstream-derived-presentation',
              evidenceDir,
              findings,
              manifest,
            );
          },
        );
      },
    );
  } finally {
    await errorCleanup();
  }

  for (const [state, decision] of Object.entries(DECISION_STATES) as Array<
    [keyof typeof DECISION_STATES, FeedbackDecision]
  >) {
    const cleanup = await installFeedbackPresentation(
      page,
      decision,
      feedbackCycleId,
    );
    try {
      await openState(
        page,
        browserAudit,
        state,
        factor.factor_definition_id,
        model.model_version_id,
        feedbackCycleId,
      );
      await expect(
        page.locator(
          `section[aria-labelledby="feedback-cycle-detail-${feedbackCycleId}"]`,
        ),
      ).toContainText(
        {
          candidate_ready: /Candidate ready|候选模型已就绪/i,
          challenger_rejected: /Challenger rejected|挑战者已拒绝/i,
          no_action: /No action|无需动作/i,
          promoted: /Promoted|已晋升/i,
        }[decision],
      );
      await captureStateMatrix(
        page,
        state,
        'real-upstream-derived-presentation',
        evidenceDir,
        findings,
        manifest,
      );
    } finally {
      await cleanup();
    }
  }

  await openState(
    page,
    browserAudit,
    'feedback-double-submit',
    factor.factor_definition_id,
    model.model_version_id,
    feedbackCycleId,
  );
  const trigger = await holdFeedbackTrigger(page);
  const triggerButton = page.getByRole('button', {
    name: /Trigger cycle|触发周期/i,
  });
  await triggerButton.click();
  const governedModal = page.getByTestId('governed-action-modal');
  await expect(governedModal).toBeVisible();
  await governedModal
    .getByTestId('governed-reason')
    .fill('w4_e06_double_submit');
  const confirmPromise = page
    .getByRole('dialog')
    .getByRole('button', { name: /Confirm|确\s*认/i })
    .click();
  await trigger.ready;
  await expect(triggerButton).toBeDisabled();
  await triggerButton.dispatchEvent('click');
  await triggerButton.dispatchEvent('click');
  expect(trigger.count()).toBe(1);
  await captureStateMatrix(
    page,
    'feedback-double-submit',
    'governed-action',
    evidenceDir,
    findings,
    manifest,
  );
  let triggerStatus = 0;
  await browserAudit.allowResponse(
    {
      method: 'POST',
      pathname: '/api/research/feedback-cycles',
      status: 409,
    },
    async () => {
      triggerStatus = await trigger.release();
      await confirmPromise;
      await browserAudit.drainHttp(page);
    },
  );
  expect(triggerStatus).toBe(409);
  await expect(governedModal).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(governedModal).toHaveCount(0);

  const permissionContext = await browser.newContext({ locale: 'zh-CN' });
  try {
    const permissionPage = await permissionContext.newPage();
    await browserAudit.track(permissionPage);
    const permissionCleanup =
      await installFeedbackPermissionState(permissionPage);
    try {
      await login(permissionPage);
      await openState(
        permissionPage,
        browserAudit,
        'feedback-permission',
        factor.factor_definition_id,
        model.model_version_id,
        feedbackCycleId,
      );
      await captureStateMatrix(
        permissionPage,
        'feedback-permission',
        'real-upstream-derived-presentation',
        evidenceDir,
        findings,
        manifest,
      );
    } finally {
      await permissionCleanup();
    }
  } finally {
    await permissionContext.close();
  }

  const reconnectContext = await browser.newContext({ locale: 'zh-CN' });
  try {
    const reconnectPage = await reconnectContext.newPage();
    await browserAudit.track(reconnectPage);
    await reconnectPage.emulateMedia({ reducedMotion: 'reduce' });
    await installControlledBrowserEnvironment(reconnectPage);
    const websocket = await DashboardWebSocketOwner.install(reconnectPage);
    await login(reconnectPage);
    await browserAudit.drainHttp(reconnectPage);
    await expect(reconnectPage.getByTestId('websocket-status')).toHaveAttribute(
      'data-state',
      'connected',
    );
    await websocket.closeServer();
    await expect(reconnectPage.getByTestId('websocket-status')).toHaveAttribute(
      'data-state',
      'reconnecting',
    );
    await setControlledOnline(reconnectPage, false);
    await expect(reconnectPage.getByTestId('websocket-status')).toHaveAttribute(
      'data-state',
      'reconnecting',
    );
    await captureStateMatrix(
      reconnectPage,
      'dashboard-reconnecting',
      'transport-fault',
      evidenceDir,
      findings,
      manifest,
    );
  } finally {
    await reconnectContext.close();
  }

  await collectKeyboard(
    page,
    browserAudit,
    factor.factor_definition_id,
    feedbackCycleId,
    model.model_version_id,
    findings,
  );
  const screenshotCount = manifest.length;
  const aggregateSha256 = screenshotAggregate(manifest);
  await writeFile(
    resolve(evidenceDir, 'manifest.json'),
    `${JSON.stringify(
      {
        aggregate_sha256: aggregateSha256,
        automated_findings: findings,
        browser: 'protected-chromium',
        controlled_state_policy: {
          operational_activation_claimed: false,
          permission:
            'real /auth/me bytes with the privileged presentation role and materialization:read removed at the browser boundary; server-side RBAC remains W4-E03 authority',
          decisions:
            'real upstream cycle/detail bytes projected into the four closed visual outcomes; W4-E04 remains the real-PostgreSQL decision authority',
          empty:
            'real upstream overview bytes remain unchanged while the real cycle page is projected empty; missing readiness remains visibly blocked',
          error: 'exact controlled 503 on both authoritative Feedback reads',
          double_submit:
            'one real governed POST is held while the native button is disabled; duplicate clicks issue no request, and the current typed 409 keeps the correction modal open',
          loading:
            'real upstream responses held before browser fulfillment and released unchanged',
        },
        evidence_run: evidenceRun,
        generated_at: new Date().toISOString(),
        locale: 'zh-CN',
        manual_review: {
          reviewed_count: 0,
          status: 'pending',
        },
        screenshot_count: screenshotCount,
        screenshots: manifest,
        themes: THEMES,
        viewports: VIEWPORTS,
      },
      null,
      2,
    )}\n`,
  );

  expect(manifest).toHaveLength(18 * THEMES.length * VIEWPORTS.length);
  expect(findings, findings.join('\n')).toEqual([]);
});
