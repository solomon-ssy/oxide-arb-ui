<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { MicrostructureBucket } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI } from '@vben/plugins/echarts';

import { $t } from '#/locales';
import ChartPanel from '#/shared/components/chart-panel.vue';

import { bucketSeries, toNumber } from '../metrics';
import {
  MARKET_AXIS_TOOLTIP,
  useIncrementalEcharts,
} from '../use-incremental-echarts';

defineOptions({ name: 'ImbalanceChart' });

const props = defineProps<{
  loading: boolean;
  no: MicrostructureBucket[];
  yes: MicrostructureBucket[];
}>();

const chartRef = ref<EchartsUIType>();
const { resetChart, renderInitial, resize } = useIncrementalEcharts(chartRef);

const isEmpty = computed(() => props.yes.length === 0 && props.no.length === 0);

function buildOptions(): ECOption {
  // ClickHouse stores imbalance as a raw ratio in [-1, 1]; show it as a percent.
  const yes = bucketSeries(props.yes, (b) => {
    const value = toNumber(b.imbalance);
    return value === null ? null : value * 100;
  });
  const no = bucketSeries(props.no, (b) => {
    const value = toNumber(b.imbalance);
    return value === null ? null : value * 100;
  });

  return {
    grid: { bottom: 40, left: 48, right: 16, top: 30 },
    legend: {
      data: [
        $t('page.markets.detail.series.yesImbalance'),
        $t('page.markets.detail.series.noImbalance'),
      ],
    },
    series: [
      {
        areaStyle: { opacity: 0.1 },
        data: yes,
        name: $t('page.markets.detail.series.yesImbalance'),
        showSymbol: false,
        type: 'line',
      },
      {
        data: no,
        lineStyle: { type: 'dashed' },
        name: $t('page.markets.detail.series.noImbalance'),
        showSymbol: false,
        type: 'line',
      },
    ],
    tooltip: MARKET_AXIS_TOOLTIP,
    xAxis: { type: 'time' },
    yAxis: {
      axisLabel: { formatter: '{value}%' },
      max: 100,
      min: -100,
      type: 'value',
    },
  };
}

watch(
  () => [props.loading, props.yes, props.no] as const,
  ([loading]) => {
    if (loading) {
      return;
    }
    resetChart();
    void renderInitial(buildOptions());
  },
  { flush: 'post', immediate: true },
);
</script>

<template>
  <ChartPanel
    :empty="!loading && isEmpty"
    :loading="loading"
    :title="$t('page.markets.detail.charts.imbalance')"
    icon="lucide:git-compare"
    tone="violet"
    @resize="resize"
  >
    <EchartsUI ref="chartRef" height="280px" />
  </ChartPanel>
</template>
