import type { EChartsOption } from 'echarts';

import type { Ref } from 'vue';

import type { Nullable } from '@vben/types';

import type EchartsUI from './echarts-ui.vue';

import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  unref,
  watch,
} from 'vue';

import { usePreferences } from '@vben/preferences';

import {
  tryOnUnmounted,
  useDebounceFn,
  useResizeObserver,
  useWindowSize,
} from '@vueuse/core';

import { applyCartesianLayout } from './cartesian-layout';
import echarts from './echarts';

type EchartsUIType = typeof EchartsUI | undefined;

type EchartsThemeType = 'dark' | 'light' | null;

function useEcharts(chartRef: Ref<EchartsUIType>) {
  let chartInstance: echarts.ECharts | null = null;
  let cacheOptions: EChartsOption = {};
  let cacheClear = true;
  const isActiveRef = ref(false);

  const { isDark } = usePreferences();
  const { height, width } = useWindowSize();
  const resizeHandler: () => void = useDebounceFn(resize, 200);

  const getChartEl = (): HTMLElement | null => {
    const refValue = chartRef?.value as unknown;
    if (!refValue) return null;
    if (refValue instanceof HTMLElement) {
      return refValue;
    }
    const maybeComponent = refValue as { $el?: HTMLElement };
    return maybeComponent.$el ?? null;
  };

  onMounted(() => (isActiveRef.value = true));
  onActivated(() => (isActiveRef.value = true));
  onDeactivated(() => (isActiveRef.value = false));
  onBeforeUnmount(() => (isActiveRef.value = false));

  const isElHidden = (el: HTMLElement | null): boolean => {
    if (!el) return true;
    return el.offsetHeight === 0 || el.offsetWidth === 0;
  };

  const getOptions = computed((): EChartsOption => {
    if (!isDark.value) {
      return {};
    }

    return {
      backgroundColor: 'transparent',
    };
  });

  const initCharts = (t?: EchartsThemeType) => {
    const el = getChartEl();
    if (!el) {
      return;
    }
    chartInstance = echarts.init(el, t ?? (isDark.value ? 'dark' : null));
    el.dataset.echartsReady = 'false';
    chartInstance.on('finished', () => {
      if (chartInstance?.getDom() === el) {
        el.dataset.echartsReady = 'true';
      }
    });

    return chartInstance;
  };

  const layoutOptions = (options: EChartsOption): EChartsOption =>
    applyCartesianLayout({
      ...options,
      ...getOptions.value,
    });

  const paint = (clear: boolean): echarts.ECharts | null => {
    const el = getChartEl();
    if (!unref(isActiveRef) || isElHidden(el)) {
      return null;
    }
    if (!chartInstance || chartInstance.getDom() !== el) {
      chartInstance?.dispose();
      const instance = initCharts();
      if (!instance) {
        return null;
      }
      chartInstance = instance;
    }
    chartInstance.getDom().dataset.echartsReady = 'false';
    if (clear) {
      chartInstance.clear();
    }
    chartInstance.setOption(layoutOptions(cacheOptions));
    return chartInstance;
  };

  const renderEcharts = (
    options: EChartsOption,
    clear = true,
  ): Promise<Nullable<echarts.ECharts>> => {
    cacheOptions = options;
    cacheClear = clear;
    if (!unref(isActiveRef)) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      nextTick(() => {
        resolve(paint(clear));
      });
    });
  };

  const updateData = (
    option: EChartsOption,
    notMerge = false,
    lazyUpdate = false,
  ): Promise<echarts.ECharts | null> => {
    cacheOptions = option;
    cacheClear = false;
    return new Promise((resolve) => {
      nextTick(() => {
        if (!chartInstance) {
          renderEcharts(option, false).then(resolve);
          return;
        }
        if (isElHidden(getChartEl())) {
          resolve(null);
          return;
        }

        const finalOption = layoutOptions(option);

        chartInstance.getDom().dataset.echartsReady = 'false';
        chartInstance.setOption(finalOption, {
          notMerge,
          lazyUpdate,
        });

        resolve(chartInstance);
      });
    });
  };

  function resize() {
    const el = getChartEl();
    if (isElHidden(el)) {
      return;
    }
    if (!chartInstance) {
      if (Object.keys(cacheOptions).length > 0 && unref(isActiveRef)) {
        void renderEcharts(cacheOptions, cacheClear);
      }
      return;
    }
    chartInstance.resize({
      animation: {
        duration: 300,
        easing: 'quadraticIn',
      },
    });
  }

  watch([width, height], () => {
    resizeHandler?.();
  });

  useResizeObserver(chartRef as never, resizeHandler);

  watch([isDark, isActiveRef], () => {
    if (!unref(isActiveRef) || Object.keys(cacheOptions).length === 0) return;
    chartInstance?.dispose();
    chartInstance = null;
    void renderEcharts(cacheOptions, cacheClear).then(resize);
  });

  tryOnUnmounted(() => {
    chartInstance?.dispose();
  });
  return {
    isActive: isActiveRef,
    renderEcharts,
    resize,
    updateData,
    getChartInstance: () => chartInstance,
  };
}

export { useEcharts };

export type { EchartsUIType };
