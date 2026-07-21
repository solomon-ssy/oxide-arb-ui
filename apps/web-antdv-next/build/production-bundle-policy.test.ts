import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import {
  evaluateProductionBundle,
  OPERATOR_CONSOLE_BUNDLE_POLICY,
} from './production-bundle-policy';

const DASHBOARD_MODULE = '/workspace/src/views/dashboard/index.vue';

function dashboardBundle(code = 'export const dashboard = true;') {
  return {
    'js/dashboard.js': {
      code,
      facadeModuleId: DASHBOARD_MODULE,
      fileName: 'js/dashboard.js',
      type: 'chunk' as const,
    },
  };
}

describe('production bundle policy', () => {
  it('accepts a uniquely owned dashboard chunk within raw and gzip budgets', () => {
    const report = evaluateProductionBundle(dashboardBundle());

    expect(report.violations).toEqual([]);
    expect(report.routeChunks).toEqual([
      expect.objectContaining({ fileName: 'js/dashboard.js', id: 'dashboard' }),
    ]);
  });

  it('fails closed when the governed route chunk is missing', () => {
    const report = evaluateProductionBundle({});

    expect(report.violations).toEqual([
      '[route-chunk-missing] dashboard: /src/views/dashboard/index.vue',
    ]);
  });

  it('rejects route chunks that exceed a typed budget', () => {
    const report = evaluateProductionBundle(dashboardBundle('payload'), {
      forbiddenPatterns: [],
      routeChunks: [
        {
          id: 'dashboard',
          maxGzipBytes: 1,
          maxRawBytes: 1,
          moduleIdSuffix: '/src/views/dashboard/index.vue',
        },
      ],
    });

    expect(report.violations).toEqual([
      '[route-raw-budget] dashboard: 7 > 1 bytes (js/dashboard.js)',
      expect.stringMatching(
        /^\[route-gzip-budget\] dashboard: \d+ > 1 bytes \(js\/dashboard\.js\)$/,
      ),
    ]);
  });

  it('scans emitted chunks and text assets but not binary assets', () => {
    const bundle = {
      ...dashboardBundle(),
      'assets/config.json': {
        fileName: 'assets/config.json',
        source: '{"endpoint":"https://hm.baidu.com"}',
        type: 'asset' as const,
      },
      'assets/logo.png': {
        fileName: 'assets/logo.png',
        source: Buffer.from('https://hm.baidu.com'),
        type: 'asset' as const,
      },
    };

    expect(evaluateProductionBundle(bundle).violations).toEqual([
      '[forbidden-pattern] baidu-analytics: assets/config.json',
    ]);
  });

  it('keeps the production dashboard budget intentionally tight', () => {
    expect(OPERATOR_CONSOLE_BUNDLE_POLICY.routeChunks).toEqual([
      expect.objectContaining({
        maxGzipBytes: 40 * 1024,
        maxRawBytes: 128 * 1024,
      }),
    ]);
  });
});
