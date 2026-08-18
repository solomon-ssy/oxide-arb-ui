<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { PnlSimulation } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import { Descriptions, DescriptionsItem, Empty } from 'antdv-next';

import { $t } from '#/locales';
import { formatPercent, formatUsd } from '#/shared/components/format';

import { buildPnlCurveSeries } from './backtest-pnl-series';

defineOptions({ name: 'BacktestPnlChart' });

const props = defineProps<{
  simulation?: null | PnlSimulation;
}>();

const CHART_HEIGHT = '260px';

const chartRef = ref<EchartsUIType>();
const chartAreaRef = ref<HTMLElement | null>(null);
const { renderEcharts, resize } = useEcharts(chartRef);

const curve = computed(() => buildPnlCurveSeries(props.simulation?.pnl_curve));
const hasCurve = computed(() => curve.value.length > 0);

useResizeObserver(
  chartAreaRef,
  useDebounceFn(() => resize(), 200),
);

function render() {
  if (!hasCurve.value) {
    return;
  }
  void renderEcharts({
    grid: { bottom: 24, containLabel: true, left: 16, right: 16, top: 16 },
    series: [
      {
        areaStyle: { opacity: 0.08 },
        data: curve.value,
        name: $t('page.research.backtests.detail.pnlChart.seriesLabel'),
        showSymbol: false,
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => formatUsd(String(value)),
    },
    xAxis: { type: 'time' },
    yAxis: {
      axisLabel: { formatter: (value: number) => formatUsd(String(value)) },
      type: 'value',
    },
  });
}

watch(curve, () => render(), { immediate: true });
</script>

<template>
  <div class="flex flex-col gap-3">
    <Descriptions v-if="simulation" :column="3" bordered size="small">
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.pnlChart.allocated')"
      >
        {{ formatUsd(simulation.total_allocated_usd) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.pnlChart.realized')"
      >
        {{ formatUsd(simulation.realized_pnl_usd) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.pnlChart.return')"
      >
        {{ formatPercent(simulation.gross_return) }}
      </DescriptionsItem>
    </Descriptions>

    <div
      ref="chartAreaRef"
      :style="{ height: CHART_HEIGHT }"
      class="relative w-full"
    >
      <EchartsUI v-if="hasCurve" ref="chartRef" :height="CHART_HEIGHT" />
      <div v-else class="flex h-full items-center justify-center">
        <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </div>
    </div>
  </div>
</template>
