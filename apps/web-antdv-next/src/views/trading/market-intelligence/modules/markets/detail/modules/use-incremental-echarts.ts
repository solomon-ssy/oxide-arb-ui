import type { Ref } from 'vue';

import type {
  EchartsUIType,
  ECOption,
  TooltipComponentOption,
} from '@vben/plugins/echarts';

import { nextTick, onMounted, ref } from 'vue';

import { useEcharts } from '@vben/plugins/echarts';

/** Shared ECharts tuning for live market-detail charts. Layout (legend / grid
 * collision) is owned by `applyCartesianLayout` inside `useEcharts`. */
export const MARKET_CHART_BASE: ECOption = {
  animationDurationUpdate: 0,
  animationEasingUpdate: 'linear',
};

/** Axis tooltip preset — typed so literal fields stay narrow (not `string`). */
export const MARKET_AXIS_TOOLTIP: TooltipComponentOption = {
  axisPointer: { type: 'cross' },
  trigger: 'axis',
};

/**
 * Wraps `useEcharts` with an initial full render plus merge updates that skip
 * `clear()` — avoids the "chart redraws from scratch" flicker on live data.
 */
export function useIncrementalEcharts(
  chartRef: Ref<EchartsUIType | undefined>,
) {
  const { getChartInstance, renderEcharts, resize, updateData } =
    useEcharts(chartRef);
  const ready = ref(false);
  let pendingOptions: ECOption | null = null;

  async function renderInitial(options: ECOption) {
    pendingOptions = options;
    const deterministic =
      document.documentElement.dataset.uiDeterministic === 'true';
    const instance = await renderEcharts(
      {
        ...MARKET_CHART_BASE,
        ...options,
        ...(deterministic ? { animation: false } : {}),
      },
      true,
    );
    ready.value = instance !== null && instance !== undefined;
    if (ready.value) {
      pendingOptions = null;
    }
    return instance;
  }

  /** Merge-update without clearing the canvas. */
  async function patchChart(options: ECOption, lazyUpdate = false) {
    if (!ready.value) {
      await renderInitial(options);
      return;
    }
    const deterministic =
      document.documentElement.dataset.uiDeterministic === 'true';
    await updateData(
      {
        ...MARKET_CHART_BASE,
        ...options,
        ...(deterministic ? { animation: false } : {}),
      },
      false,
      lazyUpdate,
    );
  }

  function resetChart() {
    ready.value = false;
  }

  onMounted(() => {
    void nextTick(() => {
      if (pendingOptions && !ready.value) {
        void renderInitial(pendingOptions);
      }
    });
  });

  return {
    getChartInstance,
    patchChart,
    ready,
    renderInitial,
    resetChart,
    resize,
  };
}
