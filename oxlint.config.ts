import { oxlintConfig } from '@vben/oxlint-config';

import { defineConfig } from 'oxlint';

export default defineConfig({
  ...oxlintConfig,
  overrides: [
    ...(oxlintConfig.overrides ?? []),
    {
      files: ['apps/web-antdv-next/tests/e2e/fixtures.ts'],
      rules: {
        // Playwright statically requires an object binding pattern for every
        // fixture dependency parameter, including dependency-free fixtures.
        'no-empty-pattern': 'off',
      },
    },
  ],
});
