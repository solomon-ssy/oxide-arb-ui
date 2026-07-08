<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';
import { resolveThemeColor } from '#/shared/components/theme-color';

defineOptions({ name: 'WaterfallChart' });

const props = defineProps<{ steps: WaterfallChartStep[] }>();

/** One multiplier stage in a sequential fraction-shrink waterfall. */
export interface WaterfallChartStep {
  /** The multiplier applied at this stage (`null` for the starting value / a cap). */
  factor: null | number;
  /** Whether this stage's shrink is the one that bound the final size. */
  isBinding: boolean;
  key: string;
  label: string;
  /** The running fraction after this stage, in `[0, 1]`. */
  value: number;
}

const chartHeight = computed(
  () => `${Math.max(160, props.steps.length * 34)}px`,
);

// `useEcharts` already observes `chartRef`'s own element for resize — no
// separate observer needed (see packages/effects/plugins/src/echarts).
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function formatFactor(factor: null | number): string {
  return factor === null ? '' : `×${factor.toFixed(3)}`;
}

function formatFraction(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * ECharts' native `aria` support (WAI-ARIA `role="img"` + a generated
 * `aria-label` on the chart container) replaces a hand-maintained hidden
 * data table as the screen-reader text alternative — see
 * https://echarts.apache.org/handbook/en/best-practices/aria/. The default
 * auto-generated description reads out every bar in axis order, which loses
 * the "which stage is binding" signal that matters most here, so we provide
 * a purpose-written summary instead.
 */
function ariaDescription(steps: WaterfallChartStep[]): string {
  const first = steps[0];
  const last = steps.at(-1);
  const binding = steps.find((step) => step.isBinding);
  if (!first || !last) {
    return '';
  }
  return $t('page.quantRecommendations.sizingPlan.waterfall.aria', {
    bindingLabel: binding?.label ?? last.label,
    finalValue: formatFraction(last.value),
    stepCount: steps.length,
  });
}

function render() {
  const steps = props.steps;
  const primary = resolveThemeColor('--primary');
  const destructive = resolveThemeColor('--destructive');
  void renderEcharts({
    aria: { description: ariaDescription(steps), enabled: true },
    grid: { bottom: 8, containLabel: true, left: 8, right: 64, top: 8 },
    series: [
      {
        barMaxWidth: 20,
        data: steps.map((step) => ({
          itemStyle: { color: step.isBinding ? destructive : primary },
          value: step.value,
        })),
        label: {
          formatter: (params: { dataIndex: number }) => {
            const step = steps[params.dataIndex];
            return step ? formatFraction(step.value) : '';
          },
          position: 'right',
          show: true,
        },
        type: 'bar',
      },
    ],
    tooltip: {
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const step = steps[item?.dataIndex ?? -1];
        if (!step) {
          return '';
        }
        const factorText =
          step.factor === null ? '' : `<br/>${formatFactor(step.factor)}`;
        return `${step.label}: ${formatFraction(step.value)}${factorText}`;
      },
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: {
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
      type: 'value',
    },
    yAxis: {
      data: steps.map((step) => step.label),
      inverse: true,
      type: 'category',
    },
  });
}

watch(() => props.steps, render, { deep: true, immediate: true });
</script>

<template>
  <div class="flex flex-col gap-2">
    <div :style="{ height: chartHeight }" class="relative w-full">
      <EchartsUI ref="chartRef" :height="chartHeight" />
    </div>
  </div>
</template>
