import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  applyCartesianLayout,
  CARTESIAN_LEGEND_ROW,
} from '../cartesian-layout';

describe('applyCartesianLayout', () => {
  it('pins an unpositioned cartesian legend to the top and keeps it off the x-axis', () => {
    const option = applyCartesianLayout({
      grid: { bottom: 40, left: 48, right: 16, top: 30 },
      legend: { data: ['YES 失衡', 'NO 失衡'] },
      series: [{ data: [], type: 'line' }],
      xAxis: { type: 'time' },
      yAxis: { type: 'value' },
    });

    expect(option.legend).toMatchObject({
      data: ['YES 失衡', 'NO 失衡'],
      top: 0,
      type: 'scroll',
    });
    expect(option.legend).not.toHaveProperty('bottom');
    expect(option.grid).toMatchObject({
      bottom: 40,
      containLabel: true,
      top: CARTESIAN_LEGEND_ROW,
    });
  });

  it('is idempotent so useEcharts retries do not stack insets', () => {
    const first = applyCartesianLayout({
      legend: { data: ['YES'] },
      xAxis: { type: 'time' },
      yAxis: { type: 'value' },
    });
    const second = applyCartesianLayout(first);
    expect(second.grid).toEqual(first.grid);
    expect(second.legend).toEqual(first.legend);
  });

  it('reserves the bottom band when a chart explicitly wants a bottom legend', () => {
    const option = applyCartesianLayout({
      grid: { bottom: 20, containLabel: true, left: 20, right: 28, top: 26 },
      legend: { bottom: 0 },
      xAxis: { type: 'category' },
      yAxis: { type: 'value' },
    });

    expect(option.legend).toMatchObject({ bottom: 0 });
    expect(option.grid).toMatchObject({
      bottom: CARTESIAN_LEGEND_ROW,
      containLabel: true,
    });
  });

  it('does not invent a legend for cartesian charts that have none', () => {
    const option = applyCartesianLayout({
      series: [{ data: [], type: 'bar' }],
      xAxis: { type: 'value' },
      yAxis: { type: 'category' },
    });

    expect(option.legend).toBeUndefined();
    expect(option.grid).toMatchObject({
      bottom: 8,
      containLabel: true,
      top: 8,
    });
  });

  it('leaves pie / polar options untouched', () => {
    const option = {
      legend: { data: ['A'] },
      series: [{ data: [], type: 'pie' as const }],
    };
    expect(applyCartesianLayout(option)).toBe(option);
  });

  it('leaves multi-grid layouts untouched', () => {
    const option = {
      grid: [{ top: 8 }, { bottom: 8 }],
      xAxis: { type: 'value' as const },
      yAxis: { type: 'value' as const },
    };
    expect(applyCartesianLayout(option)).toBe(option);
  });

  it('hides overlapping time-axis labels unless the chart forces every tick', () => {
    const hidden = applyCartesianLayout({
      xAxis: { type: 'time' },
      yAxis: { type: 'value' },
    });
    expect(hidden.xAxis).toMatchObject({
      axisLabel: { hideOverlap: true },
    });

    const forced = applyCartesianLayout({
      xAxis: { axisLabel: { interval: 0, rotate: 35 }, type: 'category' },
      yAxis: { type: 'value' },
    });
    expect(forced.xAxis).toMatchObject({
      axisLabel: { interval: 0, rotate: 35 },
    });
    expect(
      (forced.xAxis as { axisLabel?: { hideOverlap?: boolean } }).axisLabel
        ?.hideOverlap,
    ).toBeUndefined();
  });
});

describe('useEcharts layout gate', () => {
  it('normalizes every render through applyCartesianLayout', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../use-echarts.ts'),
      'utf8',
    );
    expect(source).toContain('applyCartesianLayout');
  });

  it('does not poll hidden charts; ResizeObserver wakes a pending paint', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../use-echarts.ts'),
      'utf8',
    );
    expect(source).not.toContain('useTimeoutFn');
    expect(source).toContain('isElHidden');
    expect(source).toContain('useResizeObserver');
    expect(source).toContain('void renderEcharts(cacheOptions, cacheClear)');
  });
});
