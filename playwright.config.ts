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
const evidenceRun = process.env.PLAYWRIGHT_EVIDENCE_RUN;
const productionFixture =
  process.env.PLAYWRIGHT_PRODUCTION_FIXTURE ?? 'governed-feedback';
const backendPort = 8088;
const backendReadinessPort = 8089;
const minute = 60_000;
// This is an outer orchestration watchdog, not a model or backtest SLO. The
// Rust fixture fails closed at 60 minutes from Trigger to ShadowBind, then
// owns a five-minute production shadow and a three-minute CandidateReady
// budget. The remaining 22 minutes cover cold build/bootstrap/fixture seeding
// (13 minutes in the measured debug cold-start) without racing that contract.
const backendStartupTimeout = productionFixture.startsWith('feedback-closure')
  ? (60 + 5 + 3 + 22) * minute
  : 10 * minute;

if (evidenceRun && !/^[a-z0-9-]+$/.test(evidenceRun)) {
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

const outputDir = evidenceRun ? `test-results/${evidenceRun}` : 'test-results';
const reportDir = evidenceRun
  ? `playwright-report/${evidenceRun}`
  : 'playwright-report';
const retainBackendArtifacts =
  evidenceRun || process.env.CI === 'true' ? ' --retain-artifacts' : '';

export default defineConfig({
  expect: { timeout: 10_000 },
  forbidOnly: true,
  fullyParallel: false,
  projects: [
    {
      name: 'protected-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { height: 900, width: 1440 },
      },
    },
  ],
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
  use: {
    actionTimeout: 10_000,
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:6099',
    colorScheme: 'light',
    locale: 'zh-CN',
    navigationTimeout: 30_000,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  webServer: externalServers
    ? undefined
    : [
        {
          command: `cargo build -p quant-pivot-xtask -p quant-pivot-bin && exec ../target/debug/quant-pivot-xtask production-stack serve --listen-port ${backendPort} --readiness-port ${backendReadinessPort} --fixture ${productionFixture}${retainBackendArtifacts}`,
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
