import { isAbsolute } from 'node:path';
import process from 'node:process';

import { defineConfig, devices } from 'playwright/test';

const noProxyHosts = new Set(['127.0.0.1', '::1', 'localhost']);
for (const configured of [process.env.NO_PROXY, process.env.no_proxy]) {
  for (const host of configured?.split(',') ?? []) {
    const normalized = host.trim();
    if (normalized) noProxyHosts.add(normalized);
  }
}
const noProxy = [...noProxyHosts].join(',');
process.env.NO_PROXY = noProxy;
process.env.no_proxy = noProxy;

const externalServers = process.env.PLAYWRIGHT_EXTERNAL_SERVERS === 'true';
const completionPath = process.env.PLAYWRIGHT_BACKEND_COMPLETION_PATH;
const completionNonce = process.env.PLAYWRIGHT_BACKEND_COMPLETION_NONCE;
if (Boolean(completionPath) !== Boolean(completionNonce)) {
  throw new Error(
    'Backend completion path and nonce must be supplied together',
  );
}
if (!completionPath || !completionNonce) {
  throw new Error(
    'Playwright requires the managed runner or an external backend completion nonce/path pair',
  );
}
if (!isAbsolute(completionPath)) {
  throw new Error('Backend completion requires an absolute proof path');
}
if (
  !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/.test(
    completionNonce,
  )
) {
  throw new Error('Backend completion nonce must be a UUID');
}
const completionArgs = ` --completion-report '${completionPath.replaceAll("'", String.raw`'\''`)}' --verification-nonce ${completionNonce}`;
const evidenceRun = process.env.PLAYWRIGHT_EVIDENCE_RUN;
const productionFixture =
  process.env.PLAYWRIGHT_PRODUCTION_FIXTURE ?? 'governed-feedback';
const backendPort = 8088;
const backendReadinessPort = 8089;
const minute = 60_000;
// This outer orchestration watchdog covers the serial BrowserEvidence readiness
// path in `production-stack serve`; every Rust stage keeps its own stricter gate.
// Cold-build/bootstrap/seed headroom is an allocation, not a timing guarantee.
// The readiness allowance covers startup, operational/catalog/history checks,
// trigger requests, final source checks, and bounded polling overhead. Do not add
// Verification-only activation, report, report-parity, or N+1 work to this path.
const closureStartupBudgets = {
  candidateReadySettlement: 3 * minute,
  coldBootstrapHeadroom: 22 * minute,
  historicalEconomicWarmup: 30 * minute,
  readinessChecksHeadroom: 15 * minute,
  runtimeParity: 42 * minute,
  shadowBindWait: 60 * minute,
  shadowWindow: 15 * minute,
};
// Recovery adds fault-point discovery (10m), crash wait (30s), restart startup
// (1m), and durable lease recovery (3m), rounded up without changing their gates.
const closureRecoveryHeadroom = 15 * minute;
const backendStartupTimeout = productionFixture.startsWith('feedback-closure')
  ? Object.values(closureStartupBudgets).reduce(
      (total, budget) => total + budget,
      0,
    ) +
    (productionFixture === 'feedback-closure-recovery'
      ? closureRecoveryHeadroom
      : 0)
  : 10 * minute;

if (!evidenceRun || !/^[a-z0-9-]+$/.test(evidenceRun)) {
  throw new Error('PLAYWRIGHT_EVIDENCE_RUN must contain only a-z, 0-9, and -');
}
if (
  ![
    'feedback-closure',
    'feedback-closure-recovery',
    'governed-feedback',
  ].includes(productionFixture)
) {
  throw new Error(
    'PLAYWRIGHT_PRODUCTION_FIXTURE must be feedback-closure, feedback-closure-recovery, or governed-feedback',
  );
}

const outputDir = `test-results/${evidenceRun}`;
const reportDir = `playwright-report/${evidenceRun}`;
const visualLaunchOptions = {
  args: [
    '--disable-gpu',
    '--disable-lcd-text',
    '--font-render-hinting=none',
    '--force-color-profile=srgb',
  ],
};
const visualUse = {
  launchOptions: visualLaunchOptions,
  reducedMotion: 'reduce' as const,
};

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: true,
  fullyParallel: false,
  projects: [
    {
      grep: /@visual/,
      name: 'visual-desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        ...visualUse,
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      grep: /@visual/,
      name: 'visual-desktop-light',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
        ...visualUse,
        viewport: { height: 900, width: 1440 },
      },
    },
    {
      grep: /@visual/,
      name: 'visual-mobile-dark',
      use: {
        ...devices['Pixel 7'],
        colorScheme: 'dark',
        ...visualUse,
        viewport: { height: 844, width: 390 },
      },
    },
    {
      grep: /@visual/,
      name: 'visual-tablet-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        ...visualUse,
        viewport: { height: 1024, width: 768 },
      },
    },
    {
      grepInvert: /@visual/,
      name: 'functional-chromium',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        viewport: { height: 900, width: 1440 },
      },
    },
  ],
  globalSetup: './apps/web-antdv-next/tests/e2e/release-closure.ts',
  outputDir,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: reportDir }],
    [
      'junit',
      {
        includeProjectInTestName: true,
        outputFile: `${outputDir}/junit.xml`,
        stripANSIControlSequences: true,
      },
    ],
  ],
  retries: 0,
  testDir: './apps/web-antdv-next/tests/e2e',
  timeout: 60_000,
  updateSnapshots: 'none',
  use: {
    actionTimeout: 10_000,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:6099',
    locale: 'zh-CN',
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  webServer: externalServers
    ? undefined
    : [
        {
          command: `cargo build -p quant-pivot-xtask && exec ../target/debug/quant-pivot-xtask production-stack serve --listen-port ${backendPort} --readiness-port ${backendReadinessPort} --fixture ${productionFixture} --retain-artifacts${completionArgs}`,
          gracefulShutdown: { signal: 'SIGTERM', timeout: 2 * minute },
          reuseExistingServer: false,
          stderr: 'pipe',
          stdout: 'pipe',
          timeout: backendStartupTimeout,
          url: `http://127.0.0.1:${backendReadinessPort}/ready`,
        },
        {
          command:
            'VITE_NITRO_MOCK=false pnpm -F @vben/web-antdv-next dev --host 127.0.0.1 --port 6099',
          reuseExistingServer: false,
          stderr: 'pipe',
          stdout: 'pipe',
          timeout: 120_000,
          url: 'http://127.0.0.1:6099',
        },
      ],
  workers: 1,
});
