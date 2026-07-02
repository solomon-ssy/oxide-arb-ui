import type { Ref } from 'vue';

import type {
  EchartsUIType,
  ECOption,
  TooltipComponentOption,
} from '@vben/plugins/echarts';

import { ref } from 'vue';

import { useEcharts } from '@vben/plugins/echarts';

/** Shared ECharts tuning for live market-detail charts. */
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

  async function renderInitial(options: ECOption) {
    await renderEcharts({ ...MARKET_CHART_BASE, ...options }, true);
    ready.value = true;
  }

  /** Merge-update without clearing the canvas. */
  async function patchChart(options: ECOption, lazyUpdate = false) {
    if (!ready.value) {
      await renderInitial(options);
      return;
    }
    await updateData({ ...MARKET_CHART_BASE, ...options }, false, lazyUpdate);
  }

  function resetChart() {
    ready.value = false;
  }

  return {
    getChartInstance,
    patchChart,
    ready,
    renderInitial,
    resetChart,
    resize,
  };
}
