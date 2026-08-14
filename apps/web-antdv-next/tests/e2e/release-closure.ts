import type { APIRequestContext, Page, TestInfo } from 'playwright/test';

import type { BrowserFailureAudit } from './browser-failure-audit';

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
  expect,
  expectAccessible,
  readApiData,
  waitForShell,
} from './fixtures';

export type ReleaseTheme = 'dark' | 'light';

export interface ReleaseScenario {
  name: string;
  path: string;
  prepare?: (page: Page) => Promise<void>;
  root?: string;
}

interface EvidenceEntry {
  data_revision: number;
  locale: string;
  project: string;
  scenario: string;
  screenshot: string;
  sha256: string;
  theme: ReleaseTheme;
  timezone: string;
  viewport: { height: number; width: number };
}

interface EvidenceManifest {
  backend_build_id: string;
  entries: EvidenceEntry[];
  frontend_build_id: string;
  git_hash: string;
  run_id: string;
  schema_version: 1;
  seed_revision: number;
}

interface CaptureOptions {
  audit: BrowserFailureAudit;
  dataRevision: number;
  page: Page;
  scenario: ReleaseScenario;
  seedRevision: number;
  testInfo: TestInfo;
  theme: ReleaseTheme;
}

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(E2E_DIR, '../../../..');
const REPOSITORY_ROOT = resolve(UI_ROOT, '..');
const EVIDENCE_ROOT = resolve(
  UI_ROOT,
  'apps/web-antdv-next/test-results/ui-release-closure',
);
const VISUAL_STABILITY_STYLE_ID = 'playwright-visual-stability';
const SEED_STABILITY_MS = 10_000;
const SEED_STABILITY_TIMEOUT_MS = 90_000;
const RUN_ID = process.env.PLAYWRIGHT_EVIDENCE_RUN ?? 'local';

if (!/^[a-z0-9-]+$/.test(RUN_ID)) {
  throw new Error('PLAYWRIGHT_EVIDENCE_RUN must contain only a-z, 0-9, and -');
}

function gitHash(cwd: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd,
    encoding: 'utf8',
  }).trim();
}

function projectTheme(projectName: string): ReleaseTheme {
  return projectName.endsWith('-light') ? 'light' : 'dark';
}

function evidencePath(project: string, scenario: string): string {
  return resolve(EVIDENCE_ROOT, RUN_ID, project, `${scenario}.png`);
}

function manifestPath(): string {
  return resolve(EVIDENCE_ROOT, RUN_ID, 'manifest.json');
}

async function readManifest(seedRevision: number): Promise<EvidenceManifest> {
  try {
    return JSON.parse(
      await readFile(manifestPath(), 'utf8'),
    ) as EvidenceManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return {
    backend_build_id: gitHash(REPOSITORY_ROOT),
    entries: [],
    frontend_build_id: gitHash(UI_ROOT),
    git_hash: gitHash(REPOSITORY_ROOT),
    run_id: RUN_ID,
    schema_version: 1,
    seed_revision: seedRevision,
  };
}

async function recordEvidence(
  entry: EvidenceEntry,
  seedRevision: number,
): Promise<void> {
  const path = manifestPath();
  const manifest = await readManifest(seedRevision);
  if (manifest.seed_revision !== seedRevision) {
    throw new Error(
      `release evidence mixed seed revisions ${manifest.seed_revision} and ${seedRevision}`,
    );
  }
  const key = `${entry.project}/${entry.scenario}`;
  manifest.entries = [
    ...manifest.entries.filter(
      (candidate) => `${candidate.project}/${candidate.scenario}` !== key,
    ),
    entry,
  ].toSorted((a, b) =>
    `${a.project}/${a.scenario}`.localeCompare(`${b.project}/${b.scenario}`),
  );
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporary, path);
}

async function disableVisualMotion(page: Page): Promise<void> {
  await page.evaluate((styleId) => {
    document.documentElement.dataset.uiDeterministic = 'true';
    if (document.querySelector(`#${styleId}`)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
      ::view-transition-old(root), ::view-transition-new(root) {
        animation: none !important;
      }
      .bell-button > span { visibility: hidden !important; }
    `;
    document.head.append(style);
  }, VISUAL_STABILITY_STYLE_ID);
}

async function setReleaseTheme(page: Page, theme: ReleaseTheme): Promise<void> {
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
    .poll(async () =>
      page.evaluate(() => document.documentElement.classList.contains('dark')),
    )
    .toBe(expectsDark);
}

async function setReleaseLayout(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('release evidence requires a fixed viewport');
  if (viewport.width < 768) return;

  const toggle = page.getByTestId('sidebar-collapse-toggle');
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('data-collapsed')) === 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('data-collapsed', 'false');
}

async function normalizeRuntimeEvidence(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtimeValuePatterns = [
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3,4}(?:-[0-9a-f]{0,4})?/i,
      /\b[0-9a-f]{32,64}\b/i,
      /\b20\d{2}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2})?/,
    ];
    const containsRuntimeValue = (value: null | string) =>
      runtimeValuePatterns.some((pattern) => pattern.test(value?.trim() ?? ''));
    const candidates = document.querySelectorAll(
      '[data-ui-ready="true"] time, [data-ui-ready="true"] code, [data-ui-ready="true"] td, [data-ui-ready="true"] dd, [data-ui-ready="true"] a, [data-ui-ready="true"] span, [data-ui-ready="true"] p, [data-ui-ready="true"] div',
    );

    for (const candidate of candidates) {
      if (!containsRuntimeValue(candidate.textContent)) continue;
      const childOwnsValue = [...candidate.children].some((child) =>
        containsRuntimeValue(child.textContent),
      );
      if (!childOwnsValue) {
        (candidate as HTMLElement).dataset.screenshotVolatile = 'true';
      }
    }
  });
}

async function flushVisualFrame(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolveFrame()),
        );
      }),
  );
}

export async function setEvidenceMedia(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function readFeedbackRevision(
  context: APIRequestContext,
): Promise<number> {
  const overview = await readApiData<{ revision: number }>(
    context,
    '/api/research/feedback-overview',
  );
  return overview.revision;
}

export async function waitForSeedRevision(
  context: APIRequestContext,
): Promise<number> {
  const deadline = Date.now() + SEED_STABILITY_TIMEOUT_MS;
  let stableRevision = await readFeedbackRevision(context);
  let stableSince = Date.now();

  while (Date.now() < deadline) {
    await delay(500);
    const revision = await readFeedbackRevision(context);
    if (revision !== stableRevision) {
      stableRevision = revision;
      stableSince = Date.now();
      continue;
    }
    if (Date.now() - stableSince >= SEED_STABILITY_MS) {
      return stableRevision;
    }
  }

  throw new Error(
    `feedback seed revision did not stabilize within ${SEED_STABILITY_TIMEOUT_MS}ms`,
  );
}

export async function waitForUiReady(
  page: Page,
  audit: BrowserFailureAudit,
  root = '[data-ui-ready="true"]',
): Promise<void> {
  await waitForShell(page);
  await expect(page.locator(root).first()).toBeVisible({ timeout: 30_000 });
  await audit.drainHttp(page);
  await expect(page.locator('.ant-skeleton, .ant-spin-spinning')).toHaveCount(
    0,
    {
      timeout: 30_000,
    },
  );
  await expect(page.locator('[data-echarts-ready="false"]')).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(page.locator('.ant-message-notice')).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.locator('.ant-notification-notice')).toHaveCount(0, {
    timeout: 15_000,
  });
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('12px "Inter Variable"'),
      document.fonts.load('12px "JetBrains Mono Variable"'),
    ]);
    await document.fonts.ready;
    if (!document.fonts.check('12px "Inter Variable"')) {
      throw new Error('Inter Variable did not load');
    }
    if (!document.fonts.check('12px "JetBrains Mono Variable"')) {
      throw new Error('JetBrains Mono Variable did not load');
    }
  });
  await flushVisualFrame(page);
}

export async function expectReleaseQuality(
  page: Page,
  root = 'main',
): Promise<void> {
  await expectAccessible(page, root);
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    overflow.scrollWidth,
    `${page.url()} has horizontal page overflow`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

export async function captureReleaseEvidence({
  audit,
  dataRevision,
  page,
  scenario,
  seedRevision,
  testInfo,
  theme,
}: CaptureOptions): Promise<void> {
  await page.goto(scenario.path);
  await disableVisualMotion(page);
  await setReleaseTheme(page, theme);
  await waitForUiReady(page, audit, scenario.root);
  await setReleaseLayout(page);
  await scenario.prepare?.(page);
  await waitForUiReady(page, audit, scenario.root);
  await expectReleaseQuality(page, scenario.root ?? 'main');
  await normalizeRuntimeEvidence(page);
  await page.evaluate(() => window.scrollTo({ left: 0, top: 0 }));
  await flushVisualFrame(page);

  const volatile = page.locator('[data-screenshot-volatile="true"]');
  const maskColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  await expect(page).toHaveScreenshot(`${scenario.name}.png`, {
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    mask: [volatile],
    maskColor,
    maxDiffPixelRatio: 0.002,
    scale: 'css',
    threshold: 0.2,
  });

  const screenshot = await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    mask: [volatile],
    maskColor,
    scale: 'css',
  });
  const path = evidencePath(testInfo.project.name, scenario.name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, screenshot);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('release evidence requires a fixed viewport');
  await recordEvidence(
    {
      data_revision: dataRevision,
      locale: 'zh-CN',
      project: testInfo.project.name,
      scenario: scenario.name,
      screenshot: path.slice(UI_ROOT.length + 1),
      sha256: createHash('sha256').update(screenshot).digest('hex'),
      theme,
      timezone: 'UTC',
      viewport,
    },
    seedRevision,
  );
}

export function releaseTheme(testInfo: TestInfo): ReleaseTheme {
  return projectTheme(testInfo.project.name);
}

export default async function resetReleaseEvidence(): Promise<void> {
  if (!process.env.PLAYWRIGHT_EVIDENCE_RUN) return;
  await rm(resolve(EVIDENCE_ROOT, RUN_ID), { force: true, recursive: true });
}
