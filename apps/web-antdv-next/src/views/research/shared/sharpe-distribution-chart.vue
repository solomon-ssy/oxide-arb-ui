<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { SharpeDistribution } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import { Empty } from 'antdv-next';

import { $t } from '#/locales';
import { formatScore } from '#/shared/components/format';

defineOptions({ name: 'SharpeDistributionChart' });

const props = defineProps<{
  distribution?: null | SharpeDistribution;
}>();

const chartRef = ref<EchartsUIType>();
const chartAreaRef = ref<HTMLElement | null>(null);
const { renderEcharts, resize } = useEcharts(chartRef);

const labels = ['min', 'p25', 'median', 'p75', 'max'] as const;

const values = computed(() => {
  const d = props.distribution;
  if (!d) {
    return [];
  }
  return labels.map((key) => Number.parseFloat(String(d[key] ?? '0')));
});

const hasData = computed(() =>
  values.value.some((value) => Number.isFinite(value)),
);

function renderChart() {
  if (!hasData.value) {
    return;
  }
  const data = values.value;
  void renderEcharts({
    grid: { left: 72, right: 16, top: 16, bottom: 24 },
    xAxis: {
      type: 'value',
      name: 'Sharpe',
    },
    yAxis: {
      type: 'category',
      data: labels.map((key) => key.toUpperCase()),
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const row = Array.isArray(params) ? params[0] : params;
        const payload = row as { name?: string; value?: number };
        return `${payload.name ?? ''}: ${formatScore(String(payload.value ?? 0))}`;
      },
    },
    series: [
      {
        type: 'bar',
        data,
        itemStyle: { color: '#1677ff' },
      },
    ],
  });
}

const debouncedRender = useDebounceFn(renderChart, 120);

watch(() => props.distribution, debouncedRender, {
  deep: true,
  immediate: true,
});

useResizeObserver(
  chartAreaRef,
  useDebounceFn(() => resize(), 200),
);
</script>

<template>
  <Empty
    v-if="!hasData"
    :description="$t('page.research.cpcv.emptyDistribution')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <div v-else ref="chartAreaRef" class="h-48 w-full">
    <EchartsUI ref="chartRef" class="h-full w-full" />
  </div>
</template>
