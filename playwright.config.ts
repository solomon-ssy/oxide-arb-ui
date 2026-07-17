import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
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
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: 0,
  testDir: './apps/web-antdv-next/tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:6099',
    colorScheme: 'light',
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'cargo test --manifest-path ../Cargo.toml -p quant-pivot-web --test web serve_protected_ui_e2e -- --ignored --nocapture',
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
