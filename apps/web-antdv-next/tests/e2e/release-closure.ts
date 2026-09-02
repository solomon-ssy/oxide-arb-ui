import type { APIRequestContext, Page, TestInfo } from 'playwright/test';

import type { BrowserFailureAudit } from './browser-failure-audit';

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { RELEASE_SCENARIO_KEYS } from '../../../../scripts/ui-release-contract';
import {
  expect,
  expectAccessible,
  readApiData,
  waitForShell,
} from './fixtures';
import {
  captureSemanticScreenshot,
  flushVisualFrame,
} from './stable-screenshot';

export type ReleaseTheme = 'dark' | 'light';

export interface ReleaseScenario {
  name: string;
  path: string;
  prepare?: (page: Page) => Promise<void>;
  root?: string;
}

interface EvidenceEntry {
  canonicalization: 'reviewed-platform-golden-v1';
  data_revision: number;
  locale: string;
  project: string;
  raw_screenshot: string;
  raw_sha256: string;
  scenario: string;
  screenshot: string;
  semantic_evidence: string;
  semantic_guard: 'verified-fault-clean-capture';
  semantic_sha256: string;
  sha256: string;
  theme: ReleaseTheme;
  timezone: string;
  viewport: { height: number; width: number };
}

interface EvidenceManifest {
  backend_build_id: string;
  backend_verification_nonce: string;
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
const evidenceRun = process.env.PLAYWRIGHT_EVIDENCE_RUN;
const BACKEND_NONCE = process.env.PLAYWRIGHT_BACKEND_COMPLETION_NONCE;

if (!evidenceRun || !/^[a-z0-9-]+$/.test(evidenceRun)) {
  throw new Error('PLAYWRIGHT_EVIDENCE_RUN must contain only a-z, 0-9, and -');
}
const RUN_ID = evidenceRun;

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

function rawEvidencePath(project: string, scenario: string): string {
  return resolve(EVIDENCE_ROOT, RUN_ID, project, `${scenario}.raw.png`);
}

function manifestPath(): string {
  return resolve(EVIDENCE_ROOT, RUN_ID, 'manifest.json');
}

async function readManifest(seedRevision: number): Promise<EvidenceManifest> {
  if (
    !BACKEND_NONCE ||
    !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(BACKEND_NONCE)
  )
    throw new Error(
      'Release capture requires the actual backend verification nonce',
    );
  try {
    const manifest: EvidenceManifest = JSON.parse(
      await readFile(manifestPath(), 'utf8'),
    );
    if (
      manifest.run_id !== RUN_ID ||
      manifest.backend_verification_nonce !== BACKEND_NONCE
    )
      throw new Error(
        'Existing release manifest belongs to another invocation',
      );
    return manifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return {
    backend_build_id: gitHash(REPOSITORY_ROOT),
    backend_verification_nonce: BACKEND_NONCE,
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
      [role='tooltip'],
      .vxe-table--tooltip-wrapper {
        display: none !important;
      }
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
  // Capture setup is an idempotent preference change, not a user pointer
  // action. Pin the sidebar through its public owner so modal masks and hover
  // transitions cannot toggle it back after the layout assertion.
  await page.evaluate(
    async (moduleUrl) => {
      const preferencesModule = (await import(
        /* @vite-ignore */ moduleUrl
      )) as {
        updatePreferences: (value: {
          sidebar: { collapsed: boolean; expandOnHover: boolean };
        }) => void;
      };
      preferencesModule.updatePreferences({
        sidebar: { collapsed: false, expandOnHover: true },
      });
    },
    `/@fs${resolve(UI_ROOT, 'packages/preferences/src/index.ts')}`,
  );
  await expect(toggle).toHaveAttribute('data-collapsed', 'false');
}

async function normalizeRuntimeEvidence(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtimeValuePatterns = [
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3,4}(?:-[0-9a-f]{0,4})?/gi,
      /\b[0-9a-f]{32,64}\b/gi,
      /\b20\d{2}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2})?/g,
    ];
    function normalizeRuntimeValue(value = '') {
      let normalized = value;
      for (const pattern of runtimeValuePatterns) {
        normalized = normalized.replaceAll(pattern, (matched) =>
          matched.replaceAll(/[0-9a-f]/gi, '0'),
        );
      }
      return normalized;
    }
    const containsRuntimeValue = (value = '') =>
      normalizeRuntimeValue(value) !== value;
    const candidates = document.querySelectorAll(
      '[data-ui-ready="true"] time, [data-ui-ready="true"] code, [data-ui-ready="true"] td, [data-ui-ready="true"] dd, [data-ui-ready="true"] a, [data-ui-ready="true"] span, [data-ui-ready="true"] p, [data-ui-ready="true"] div',
    );

    for (const candidate of candidates) {
      if (!containsRuntimeValue(candidate.textContent ?? '')) continue;
      const childOwnsValue = [...candidate.children].some((child) =>
        containsRuntimeValue(child.textContent ?? ''),
      );
      if (!childOwnsValue) {
        const element = candidate as HTMLElement;
        element.textContent = normalizeRuntimeValue(element.textContent ?? '');
        element.dataset.screenshotVolatile = 'true';
      }
    }
  });
}

export async function setEvidenceMedia(
  page: Page,
  checkedAt: string,
): Promise<void> {
  await page.addInitScript(() => {
    const applyDeterministicMode = (): boolean => {
      if (!document.documentElement) return false;
      document.documentElement.dataset.uiDeterministic = 'true';
      return true;
    };
    if (!applyDeterministicMode()) {
      const observer = new MutationObserver(() => {
        if (!applyDeterministicMode()) return;
        observer.disconnect();
      });
      observer.observe(document, { childList: true });
    }
  });
  const evidenceTime = new Date(checkedAt);
  if (Number.isNaN(evidenceTime.valueOf())) {
    throw new TypeError(
      `system status returned invalid checked_at ${checkedAt}`,
    );
  }
  await page.clock.setFixedTime(evidenceTime);
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function readFeedbackState(
  context: APIRequestContext,
): Promise<{ normalized: string; revision: number }> {
  const overview = await readApiData<
    Record<string, unknown> & { revision: number }
  >(context, '/api/research/feedback-overview');
  const stableOverview = structuredClone(overview);
  delete stableOverview.generated_at;
  const truthOperations = stableOverview.truth_operations;
  if (
    truthOperations &&
    typeof truthOperations === 'object' &&
    !Array.isArray(truthOperations)
  ) {
    const stableTruthOperations = truthOperations as Record<string, unknown>;
    delete stableTruthOperations.observed_at;
    if (stableTruthOperations.resolution_unresolved_count === 0) {
      delete stableTruthOperations.resolution_terminal_through;
    }
    if (stableTruthOperations.execution_attempt_unsealed_count === 0) {
      delete stableTruthOperations.execution_attempt_sealed_through;
    }
    if (stableTruthOperations.recommendation_rollup_unsealed_count === 0) {
      delete stableTruthOperations.recommendation_rollup_sealed_through;
    }
  }
  const normalized = JSON.stringify(stableOverview);
  return { normalized, revision: overview.revision };
}

export async function waitForSeedRevision(
  context: APIRequestContext,
): Promise<number> {
  const deadline = Date.now() + SEED_STABILITY_TIMEOUT_MS;
  let stableState = await readFeedbackState(context);
  let stableSince = Date.now();
  let consecutiveReads = 1;

  while (Date.now() < deadline) {
    await delay(500);
    const state = await readFeedbackState(context);
    if (state.normalized !== stableState.normalized) {
      stableState = state;
      stableSince = Date.now();
      consecutiveReads = 1;
      continue;
    }
    consecutiveReads += 1;
    if (
      consecutiveReads >= 2 &&
      Date.now() - stableSince >= SEED_STABILITY_MS
    ) {
      return stableState.revision;
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
  await audit.dismissExpectedAlerts(page, performance.now() + 10_000);
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
  const reviewedSnapshot =
    testInfo.config.updateSnapshots === 'none' &&
    testInfo.project.ignoreSnapshots === false;
  if (
    !BACKEND_NONCE ||
    !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(BACKEND_NONCE)
  )
    throw new Error(
      'Release capture requires the actual backend verification nonce',
    );
  if (
    !RELEASE_SCENARIO_KEYS.includes(`${testInfo.project.name}/${scenario.name}`)
  )
    throw new Error(
      'Release capture is outside the reviewed scenario contract',
    );
  await audit.dismissExpectedAlerts(page, performance.now() + 10_000);
  await page.goto(scenario.path);
  await disableVisualMotion(page);
  await setReleaseTheme(page, theme);
  await waitForUiReady(page, audit, scenario.root);
  await scenario.prepare?.(page);
  await waitForUiReady(page, audit, scenario.root);
  await page.mouse.move(0, 0);
  await setReleaseLayout(page);
  await waitForUiReady(page, audit, scenario.root);
  await expectReleaseQuality(page, scenario.root ?? 'main');
  // Axe finishes its analysis in a temporary page. Re-activate the audited
  // page before taking the visual evidence.
  await page.bringToFront();
  await waitForUiReady(page, audit, scenario.root);
  await normalizeRuntimeEvidence(page);
  await page.evaluate(() => window.scrollTo({ left: 0, top: 0 }));
  await flushVisualFrame(page);

  const volatile = page.locator('[data-screenshot-volatile="true"]');
  const maskColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const captureDeadline = performance.now() + 10_000;
  const { image: screenshot, notice_witness: noticeWitness } =
    await captureSemanticScreenshot(
      page,
      {
        animations: 'disabled',
        caret: 'hide',
        fullPage: true,
        mask: [volatile],
        maskColor,
        scale: 'css',
      },
      audit,
      captureDeadline,
    );
  const artifactScenario = reviewedSnapshot
    ? scenario.name
    : `${scenario.name}.candidate`;
  const path = evidencePath(testInfo.project.name, artifactScenario);
  const rawPath = rawEvidencePath(testInfo.project.name, artifactScenario);
  const semanticPath = path.replace(/\.png$/, '.semantic.json');
  const rawHash = createHash('sha256').update(screenshot).digest('hex');
  const semantic = `${JSON.stringify(
    {
      backend_verification_nonce: BACKEND_NONCE,
      evidence: audit.semanticEvidence(),
      guard: reviewedSnapshot
        ? 'verified-fault-clean-capture'
        : 'candidate-not-release-evidence',
      notice_witness: noticeWitness,
      project: testInfo.project.name,
      raw_sha256: rawHash,
      run_id: RUN_ID,
      scenario: scenario.name,
      snapshot_policy: {
        update_snapshots: testInfo.config.updateSnapshots,
        ignore_snapshots: testInfo.project.ignoreSnapshots,
      },
    },
    null,
    2,
  )}\n`;
  await mkdir(dirname(path), { recursive: true });
  // Preserve qualified raw evidence even when the golden assertion fails.
  // Only a successful comparison may enter the release manifest.
  await writeFile(rawPath, screenshot);
  await writeFile(semanticPath, semantic);
  expect(screenshot).toMatchSnapshot(`${scenario.name}.png`, {
    maxDiffPixelRatio: 0.002,
    threshold: 0.2,
  });
  if (!reviewedSnapshot) {
    if (
      !testInfo.annotations.some(
        ({ type }) => type === 'candidate-not-release-evidence',
      )
    ) {
      testInfo.annotations.push({
        type: 'candidate-not-release-evidence',
        description: `Snapshot policy update=${testInfo.config.updateSnapshots}, ignore=${testInfo.project.ignoreSnapshots}; no reviewed release entries were published`,
      });
    }
    await testInfo.attach(`${scenario.name}-candidate-only`, {
      path: semanticPath,
      contentType: 'application/json',
    });
    return;
  }
  const canonical = await readFile(
    testInfo.snapshotPath(`${scenario.name}.png`),
  );
  await writeFile(path, canonical);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('release evidence requires a fixed viewport');
  await recordEvidence(
    {
      canonicalization: 'reviewed-platform-golden-v1',
      data_revision: dataRevision,
      locale: 'zh-CN',
      project: testInfo.project.name,
      raw_screenshot: rawPath.slice(UI_ROOT.length + 1),
      raw_sha256: rawHash,
      scenario: scenario.name,
      screenshot: path.slice(UI_ROOT.length + 1),
      semantic_evidence: semanticPath.slice(UI_ROOT.length + 1),
      semantic_guard: 'verified-fault-clean-capture',
      semantic_sha256: createHash('sha256').update(semantic).digest('hex'),
      sha256: createHash('sha256').update(canonical).digest('hex'),
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

export default async function initializeReleaseEvidence(): Promise<void> {
  await mkdir(EVIDENCE_ROOT, { recursive: true });
  await mkdir(resolve(EVIDENCE_ROOT, RUN_ID));
}
