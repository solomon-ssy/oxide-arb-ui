<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { AnalyticsDailyPoint } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import Decimal from 'decimal.js';

import { $t } from '#/locales';
import EchartsCard from '#/shared/components/echarts-card.vue';
import { formatUsd, parseDecimal } from '#/shared/components/format';

defineOptions({ name: 'AnalyticsCumulativePnlChart' });

const props = withDefaults(
  defineProps<{
    error?: null | string;
    loading?: boolean;
    points: AnalyticsDailyPoint[];
  }>(),
  { error: null, loading: false },
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts, resize } = useEcharts(chartRef);

type ChartPoint = [number, number, string];

const seriesPoints = computed<ChartPoint[]>(() =>
  props.points.map((point) => {
    const cumulative = parseDecimal(point.cumulative_pnl) ?? new Decimal(0);
    return [
      Date.parse(`${point.date}T00:00:00Z`),
      cumulative.toNumber(),
      formatUsd(point.cumulative_pnl),
    ];
  }),
);

const isEmpty = computed(
  () => !props.loading && !props.error && seriesPoints.value.length === 0,
);

function buildOption(): ECOption {
  return {
    grid: { bottom: 32, left: 64, right: 16, top: 24 },
    series: [
      {
        areaStyle: { opacity: 0.08 },
        data: seriesPoints.value,
        name: $t('page.analytics.charts.cumulativePnl.series'),
        showSymbol: seriesPoints.value.length === 1,
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: {
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const index = item?.dataIndex ?? 0;
        const point = props.points[index];
        if (!point) {
          return '';
        }
        return [
          point.date,
          `${$t('page.analytics.charts.cumulativePnl.daily')}: ${formatUsd(point.daily_pnl)}`,
          `${$t('page.analytics.charts.cumulativePnl.cumulative')}: ${formatUsd(point.cumulative_pnl)}`,
          `${$t('page.analytics.charts.cumulativePnl.trades')}: ${point.trade_count}`,
        ].join('<br/>');
      },
      trigger: 'axis',
    },
    xAxis: { type: 'time' },
    yAxis: {
      axisLabel: { formatter: (value: number) => `$${value}` },
      scale: true,
      type: 'value',
    },
  };
}

watch(
  () => [seriesPoints.value, props.loading, props.error],
  () => {
    if (!props.loading && !props.error && !isEmpty.value) {
      void renderEcharts(buildOption());
    }
  },
  { immediate: true },
);
</script>

<template>
  <EchartsCard
    :empty="isEmpty"
    :error="error"
    icon="lucide:line-chart"
    :loading="loading"
    tone="indigo"
    :title="$t('page.analytics.charts.cumulativePnl.title')"
    @resize="resize"
  >
    <template #extra>
      <span class="text-muted-foreground text-xs">
        {{ $t('page.analytics.basis.settlement') }}
      </span>
    </template>
    <EchartsUI ref="chartRef" class="h-full" />
  </EchartsCard>
</template>
