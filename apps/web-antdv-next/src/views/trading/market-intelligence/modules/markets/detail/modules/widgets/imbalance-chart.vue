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

defineOptions({ name: 'ImbalanceChart' });

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
  // ClickHouse stores imbalance as a raw ratio in [-1, 1]; show it as a percent.
  const yes = bucketSeries(props.yes, (b) => {
    const value = toNumber(b.imbalance);
    return value === null ? null : value * 100;
  });
  const no = bucketSeries(props.no, (b) => {
    const value = toNumber(b.imbalance);
    return value === null ? null : value * 100;
  });
  const anchor = Math.max(
    0,
    ...yes.map(([timestamp]) => timestamp),
    ...no.map(([timestamp]) => timestamp),
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
    legend: {
      data: [
        $t('page.markets.detail.series.yesImbalance'),
        $t('page.markets.detail.series.noImbalance'),
      ],
    },
    series: [
      {
        areaStyle: { opacity: 0.1 },
        data: normalizeTime(yes),
        name: $t('page.markets.detail.series.yesImbalance'),
        showSymbol: false,
        type: 'line',
      },
      {
        data: normalizeTime(no),
        lineStyle: { type: 'dashed' },
        name: $t('page.markets.detail.series.noImbalance'),
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
    <EchartsUI
      ref="chartRef"
      :data-market-series-points="Math.min(yes.length, no.length)"
      :data-market-series-ready="!isEmpty"
      height="100%"
    />
  </ChartPanel>
</template>
