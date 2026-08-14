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

defineOptions({ name: 'DepthLiquidityChart' });

const props = defineProps<{
  loading: boolean;
  yes: MicrostructureBucket[];
}>();

const chartRef = ref<EchartsUIType>();
const { resetChart, renderInitial, resize } = useIncrementalEcharts(chartRef);

const isEmpty = computed(() => props.yes.length === 0);

function buildOptions(): ECOption {
  const top1 = bucketSeries(props.yes, (b) => toNumber(b.depth_top1_usd));
  const top5 = bucketSeries(props.yes, (b) => toNumber(b.depth_top5_usd));
  const top20 = bucketSeries(props.yes, (b) => toNumber(b.depth_top20_usd));

  return {
    grid: { bottom: 40, left: 56, right: 16, top: 30 },
    legend: {
      data: [
        $t('page.markets.detail.series.top1'),
        $t('page.markets.detail.series.top5'),
        $t('page.markets.detail.series.top20'),
      ],
    },
    series: [
      {
        areaStyle: { opacity: 0.15 },
        data: top20,
        name: $t('page.markets.detail.series.top20'),
        showSymbol: false,
        type: 'line',
      },
      {
        areaStyle: { opacity: 0.15 },
        data: top5,
        name: $t('page.markets.detail.series.top5'),
        showSymbol: false,
        type: 'line',
      },
      {
        areaStyle: { opacity: 0.15 },
        data: top1,
        name: $t('page.markets.detail.series.top1'),
        showSymbol: false,
        type: 'line',
      },
    ],
    tooltip: MARKET_AXIS_TOOLTIP,
    xAxis: { type: 'time' },
    yAxis: {
      axisLabel: { formatter: (value: number) => `$${value}` },
      scale: true,
      type: 'value',
    },
  };
}

watch(
  () => [props.loading, props.yes] as const,
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
    :title="$t('page.markets.detail.charts.liquidity')"
    icon="lucide:layers"
    tone="sky"
    @resize="resize"
  >
    <EchartsUI ref="chartRef" height="280px" />
  </ChartPanel>
</template>
