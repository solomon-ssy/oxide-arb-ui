import { defineConfig } from '@vben/eslint-config';

import quantPivotDesignTokens from './scripts/eslint-rules/quant-pivot-design-tokens.mjs';

export default defineConfig([
  {
    ignores: [
      'packages/types/src/generated/research-model-api-validators.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['apps/web-antdv-next/src/**/*.{js,jsx,ts,tsx,vue}'],
    ignores: [
      'apps/web-antdv-next/src/**/*.test.*',
      'apps/web-antdv-next/src/**/*.spec.*',
      'apps/web-antdv-next/src/preferences.ts',
      'apps/web-antdv-next/src/shared/components/theme-color.ts',
    ],
    plugins: {
      'quant-pivot': quantPivotDesignTokens,
    },
    rules: {
      'quant-pivot/no-raw-color-literals': 'error',
      'quant-pivot/no-raw-palette-classes': 'error',
    },
  },
]);
