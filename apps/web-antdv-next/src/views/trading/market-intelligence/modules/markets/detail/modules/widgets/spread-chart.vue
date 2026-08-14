<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { MicrostructureBucket } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI } from '@vben/plugins/echarts';

import { $t } from '#/locales';
import ChartPanel from '#/shared/components/chart-panel.vue';

import { bucketSeries, relativeTimeLabel, toNumber } from '../metrics';
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
const deterministicPointCount = 8;

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
  const anchor = Math.max(
    0,
    ...yesAvg.map(([timestamp]) => timestamp),
    ...noAvg.map(([timestamp]) => timestamp),
  );
  const deterministic =
    document.documentElement.dataset.uiDeterministic === 'true';
  const normalizeTime = (series: [number, null | number][]) =>
    deterministic
      ? series
          .slice(-deterministicPointCount)
          .map(([, value], index, tail) => [
            deterministicPointCount - tail.length + index,
            value,
          ])
      : series;
  const axisAnchor = deterministic ? 0 : anchor;

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
        data: normalizeTime(yesMin),
        lineStyle: { opacity: 0 },
        name: $t('page.markets.detail.series.spreadBand'),
        showSymbol: false,
        silent: true,
        stack: 'yesBand',
        type: 'line',
      },
      {
        areaStyle: { opacity: 0.12 },
        data: normalizeTime(yesBand),
        lineStyle: { opacity: 0 },
        name: $t('page.markets.detail.series.spreadBand'),
        showSymbol: false,
        silent: true,
        stack: 'yesBand',
        type: 'line',
      },
      {
        data: normalizeTime(yesAvg),
        name: $t('page.markets.detail.series.yesSpread'),
        showSymbol: false,
        type: 'line',
      },
      {
        data: normalizeTime(noAvg),
        lineStyle: { type: 'dashed' },
        name: $t('page.markets.detail.series.noSpread'),
        showSymbol: false,
        type: 'line',
      },
    ],
    tooltip: MARKET_AXIS_TOOLTIP,
    xAxis: {
      axisLabel: {
        formatter: (value: number) =>
          deterministic
            ? `T−${deterministicPointCount - 1 - value}`
            : relativeTimeLabel(value, axisAnchor),
      },
      max: deterministic ? deterministicPointCount - 1 : undefined,
      min: deterministic ? 0 : undefined,
      type: deterministic ? 'value' : 'time',
    },
    yAxis: {
      axisLabel: { formatter: '{value} bps' },
      scale: true,
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
    :title="$t('page.markets.detail.charts.spread')"
    icon="lucide:move-horizontal"
    tone="amber"
    @resize="resize"
  >
    <EchartsUI
      ref="chartRef"
      :data-market-series-points="Math.min(yes.length, no.length)"
      :data-market-series-ready="!isEmpty"
      height="280px"
    />
  </ChartPanel>
</template>
