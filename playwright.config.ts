import process from 'node:process';

import { defineConfig, devices } from 'playwright/test';

const externalServers = process.env.PLAYWRIGHT_EXTERNAL_SERVERS === 'true';
const evidenceRun = process.env.PLAYWRIGHT_EVIDENCE_RUN;
const productionFixture =
  process.env.PLAYWRIGHT_PRODUCTION_FIXTURE ?? 'governed-feedback';

if (evidenceRun && !/^[a-z0-9-]+$/.test(evidenceRun)) {
  throw new Error('PLAYWRIGHT_EVIDENCE_RUN must contain only a-z, 0-9, and -');
}
if (!['feedback-closure', 'governed-feedback'].includes(productionFixture)) {
  throw new Error(
    'PLAYWRIGHT_PRODUCTION_FIXTURE must be feedback-closure or governed-feedback',
  );
}

const outputDir = evidenceRun ? `test-results/${evidenceRun}` : 'test-results';
const reportDir = evidenceRun
  ? `playwright-report/${evidenceRun}`
  : 'playwright-report';
const retainBackendArtifacts =
  process.env.CI === 'true' ? ' --retain-artifacts' : '';

export default defineConfig({
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
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:6099',
    colorScheme: 'light',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: externalServers
    ? undefined
    : [
        {
          command: `cargo build -p quant-pivot-xtask -p quant-pivot-bin && exec ../target/debug/quant-pivot-xtask production-stack serve --listen-port 8088 --fixture ${productionFixture}${retainBackendArtifacts}`,
          gracefulShutdown: { signal: 'SIGTERM', timeout: 60_000 },
          reuseExistingServer: false,
          stderr: 'pipe',
          stdout: 'pipe',
          timeout: 600_000,
          url: 'http://127.0.0.1:8088/health',
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
