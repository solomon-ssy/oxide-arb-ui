<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { MicrostructureBucket } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI } from '@vben/plugins/echarts';

import { $t } from '#/locales';
import EchartsCard from '#/shared/components/echarts-card.vue';

import { bucketSeries, toNumber } from '../metrics';
import {
  MARKET_AXIS_TOOLTIP,
  useIncrementalEcharts,
} from '../use-incremental-echarts';

defineOptions({ name: 'SpreadChart' });

const props = defineProps<{
  loading: boolean;
  no: MicrostructureBucket[];
  yes: MicrostructureBucket[];
}>();

const chartRef = ref<EchartsUIType>();
const { resetChart, renderInitial, resize } = useIncrementalEcharts(chartRef);

const isEmpty = computed(() => props.yes.length === 0 && props.no.length === 0);

function buildOptions(): ECOption {
  const yesMin = bucketSeries(props.yes, (b) => toNumber(b.spread_bps_min));
  // Band upper edge is expressed as (max − min) stacked on top of the min line.
  const yesBand = bucketSeries(props.yes, (b) => {
    const min = toNumber(b.spread_bps_min);
    const max = toNumber(b.spread_bps_max);
    return min !== null && max !== null ? max - min : null;
  });
  const yesAvg = bucketSeries(props.yes, (b) => toNumber(b.spread_bps_avg));
  const noAvg = bucketSeries(props.no, (b) => toNumber(b.spread_bps_avg));

  return {
    grid: { bottom: 40, left: 48, right: 16, top: 30 },
    legend: {
      data: [
        $t('page.markets.detail.series.yesSpread'),
        $t('page.markets.detail.series.noSpread'),
        $t('page.markets.detail.series.spreadBand'),
      ],
    },
    series: [
      {
        data: yesMin,
        lineStyle: { opacity: 0 },
        name: $t('page.markets.detail.series.spreadBand'),
        showSymbol: false,
        silent: true,
        stack: 'yesBand',
        type: 'line',
      },
      {
        areaStyle: { opacity: 0.12 },
        data: yesBand,
        lineStyle: { opacity: 0 },
        name: $t('page.markets.detail.series.spreadBand'),
        showSymbol: false,
        silent: true,
        stack: 'yesBand',
        type: 'line',
      },
      {
        data: yesAvg,
        name: $t('page.markets.detail.series.yesSpread'),
        showSymbol: false,
        type: 'line',
      },
      {
        data: noAvg,
        lineStyle: { type: 'dashed' },
        name: $t('page.markets.detail.series.noSpread'),
        showSymbol: false,
        type: 'line',
      },
    ],
    tooltip: MARKET_AXIS_TOOLTIP,
    xAxis: { type: 'time' },
    yAxis: {
      axisLabel: { formatter: '{value} bps' },
      scale: true,
      type: 'value',
    },
  };
}

watch(
  () => [props.yes, props.no],
  () => {
    resetChart();
    void renderInitial(buildOptions());
  },
  { immediate: true },
);
</script>

<template>
  <EchartsCard
    :empty="!loading && isEmpty"
    :loading="loading"
    :title="$t('page.markets.detail.charts.spread')"
    icon="lucide:move-horizontal"
    tone="amber"
    @resize="resize"
  >
    <EchartsUI ref="chartRef" height="280px" />
  </EchartsCard>
</template>
