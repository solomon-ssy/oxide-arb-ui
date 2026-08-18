import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const UI_ROOT = process.cwd();
const PLUGIN_USE_ECHARTS = join(
  UI_ROOT,
  'packages/effects/plugins/src/echarts/use-echarts.ts',
);

describe('echarts cartesian layout contract', () => {
  it('normalizes every chart render through applyCartesianLayout', () => {
    const source = readFileSync(PLUGIN_USE_ECHARTS, 'utf8');
    expect(source).toContain(
      "import { applyCartesianLayout } from './cartesian-layout'",
    );
    expect(source.includes('applyCartesianLayout({')).toBe(true);
  });

  it('does not poll hidden charts every 30ms', () => {
    const source = readFileSync(PLUGIN_USE_ECHARTS, 'utf8');
    expect(source).not.toContain('useTimeoutFn');
    expect(source).toContain('void renderEcharts(cacheOptions, cacheClear)');
  });
});
