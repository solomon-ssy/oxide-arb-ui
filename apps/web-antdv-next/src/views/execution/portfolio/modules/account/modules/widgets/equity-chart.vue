<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { EquitySnapshotView } from '@vben/types';

import { ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';
import ChartPanel from '#/shared/components/chart-panel.vue';
import { parseDecimal } from '#/shared/components/format';

defineOptions({ name: 'EquityChart' });

const props = defineProps<{
  loading: boolean;
  /** Equity snapshots in ascending `as_of` order. */
  snapshots: EquitySnapshotView[];
}>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts, resize } = useEcharts(chartRef);

/** Chart-only numeric projection (decimal.js parse → number; never money math). */
function toNumber(value: string): number {
  return parseDecimal(value)?.toNumber() ?? 0;
}

function render() {
  const axis = props.snapshots.map((row) => row.as_of);
  const equity = props.snapshots.map((row) =>
    toNumber(row.venue_net_liquidation_usd),
  );
  const drawdown = props.snapshots.map(
    (row) => toNumber(row.drawdown_pct) * 100,
  );
  void renderEcharts({
    grid: { bottom: 40, left: 60, right: 60, top: 30 },
    legend: {
      data: [
        $t('page.quantAccount.chart.equity'),
        $t('page.quantAccount.chart.drawdown'),
      ],
    },
    tooltip: { axisPointer: { type: 'cross' }, trigger: 'axis' },
    xAxis: {
      axisLabel: { formatter: (value: string) => value.slice(5, 16) },
      boundaryGap: false,
      data: axis,
      type: 'category',
    },
    yAxis: [
      {
        axisLabel: { formatter: (value: number) => `$${value}` },
        name: $t('page.quantAccount.chart.equity'),
        type: 'value',
      },
      {
        axisLabel: { formatter: '{value}%' },
        name: $t('page.quantAccount.chart.drawdown'),
        position: 'right',
        type: 'value',
      },
    ],
    series: [
      {
        areaStyle: { opacity: 0.08 },
        data: equity,
        name: $t('page.quantAccount.chart.equity'),
        showSymbol: false,
        smooth: true,
        type: 'line',
      },
      {
        data: drawdown,
        lineStyle: { type: 'dashed' },
        name: $t('page.quantAccount.chart.drawdown'),
        showSymbol: false,
        type: 'line',
        yAxisIndex: 1,
      },
    ],
  });
}

watch(
  () => props.snapshots,
  () => render(),
  { immediate: true },
);
</script>

<template>
  <ChartPanel
    :empty="!loading && snapshots.length === 0"
    :loading="loading"
    :title="$t('page.quantAccount.chart.title')"
    icon="lucide:line-chart"
    @resize="resize"
  >
    <EchartsUI ref="chartRef" height="320px" />
  </ChartPanel>
</template>
