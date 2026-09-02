import type { EChartsOption } from 'echarts';

import type { EchartsUIType } from '../use-echarts';

import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEcharts } from '../use-echarts';

vi.mock('../echarts', async () => {
  const { default: actual } =
    await vi.importActual<typeof import('../echarts')>('../echarts');
  const { SVGRenderer } = await import('echarts/renderers');
  actual.use(SVGRenderer);
  return {
    default: {
      ...actual,
      init: (element: HTMLElement, theme: null | string) =>
        actual.init(element, theme, {
          height: 300,
          renderer: 'svg',
          width: 600,
        }),
    },
  };
});

const browser = window as unknown as {
  happyDOM: {
    settings: {
      device: { prefersReducedMotion: 'no-preference' | 'reduce' };
    };
  };
};
const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  browser.happyDOM.settings.device.prefersReducedMotion = 'no-preference';
  vi.restoreAllMocks();
});

async function mountChart() {
  const host = document.createElement('div');
  const element = document.createElement('div');
  Object.defineProperties(element, {
    offsetHeight: { value: 300 },
    offsetWidth: { value: 600 },
  });
  document.body.append(host, element);
  let chart: ReturnType<typeof useEcharts> | undefined;
  const app = createApp({
    setup() {
      chart = useEcharts(ref(element as unknown as EchartsUIType));
      return () => h('div');
    },
  });
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
    element.remove();
  });
  await nextTick();
  if (!chart) throw new Error('chart composable was not mounted');
  return { chart, element };
}

function options(animation: boolean): EChartsOption {
  return {
    animation,
    animationDuration: 200,
    animationDurationUpdate: 200,
    series: [{ animation, data: [10, 20], type: 'line' }],
    xAxis: { data: ['first', 'second'], show: false, type: 'category' },
    yAxis: { show: false, type: 'value' },
  };
}

describe('chart render lifecycle', () => {
  it('repaints when the real media preference changes without mutating cached options', async () => {
    const { chart, element } = await mountChart();
    const instance = await chart.renderEcharts(options(true));
    if (!instance) throw new Error('chart instance is absent');
    await vi.waitFor(() => expect(element.dataset.echartsReady).toBe('true'));
    browser.happyDOM.settings.device.prefersReducedMotion = 'reduce';
    window.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(instance.getOption().animation).toBe(false));
    expect(instance.getOption().series).toMatchObject([{ animation: false }]);
    await vi.waitFor(() => expect(element.dataset.echartsReady).toBe('true'));
    browser.happyDOM.settings.device.prefersReducedMotion = 'no-preference';
    window.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(instance.getOption().animation).toBe(true));
    expect(instance.getOption().series).toMatchObject([{ animation: true }]);
    await vi.waitFor(() => expect(element.dataset.echartsReady).toBe('true'));
  });

  it('ignores real clear completion until the replacement render finishes', async () => {
    const { chart, element } = await mountChart();
    const instance = await chart.renderEcharts(options(false));
    if (!instance) throw new Error('chart instance is absent');
    await vi.waitFor(() => expect(element.dataset.echartsReady).toBe('true'));
    const events: { ready: string | undefined; seriesCount: number }[] = [];
    instance.on('finished', () => {
      const series = instance.getOption().series as unknown[];
      events.push({
        ready: element.dataset.echartsReady,
        seriesCount: series.length,
      });
    });
    await chart.renderEcharts(options(true));
    expect(events).toEqual([{ ready: 'false', seriesCount: 0 }]);
    expect(element.dataset.echartsReady).toBe('false');
    await vi.waitFor(() => expect(element.dataset.echartsReady).toBe('true'));
    expect(events.at(-1)).toEqual({ ready: 'true', seriesCount: 1 });
    expect(element.querySelector('svg path')).not.toBeNull();
  });

  it.each(['no-preference', 'reduce'] as const)(
    'respects %s for options and resize',
    async (motion) => {
      browser.happyDOM.settings.device.prefersReducedMotion = motion;
      const { chart, element } = await mountChart();
      const instance = await chart.renderEcharts(options(true));
      if (!instance) throw new Error('chart instance is absent');
      const current = instance.getOption();
      expect(current.animation).toBe(motion !== 'reduce');
      expect(current.series).toMatchObject([
        { animation: motion !== 'reduce' },
      ]);
      await vi.waitFor(() => expect(element.dataset.echartsReady).toBe('true'));
      const resize = vi.spyOn(instance, 'resize');
      chart.resize();
      expect(resize).toHaveBeenCalledWith({
        animation: {
          duration: motion === 'reduce' ? 0 : 300,
          easing: 'quadraticIn',
        },
      });
      await vi.waitFor(() => expect(element.dataset.echartsReady).toBe('true'));
    },
  );
});
