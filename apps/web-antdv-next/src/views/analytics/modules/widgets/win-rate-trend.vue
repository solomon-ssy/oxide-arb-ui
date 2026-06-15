<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { AnalyticsDailyPoint } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import Decimal from 'decimal.js';

import { $t } from '#/locales';
import EchartsCard from '#/shared/components/echarts-card.vue';
import { formatPercent } from '#/shared/components/format';

defineOptions({ name: 'AnalyticsWinRateTrend' });

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
  props.points.map((point, index) => {
    const window = props.points.slice(Math.max(0, index - 6), index + 1);
    const tradeCount = window.reduce((sum, item) => sum + item.trade_count, 0);
    const successCount = window.reduce(
      (sum, item) => sum + item.success_count,
      0,
    );
    const ratio =
      tradeCount === 0
        ? new Decimal(0)
        : new Decimal(successCount).div(tradeCount);
    return [
      Date.parse(`${point.date}T00:00:00Z`),
      ratio.mul(100).toNumber(),
      formatPercent(ratio.toString(), 1),
    ];
  }),
);

const isEmpty = computed(
  () => !props.loading && !props.error && seriesPoints.value.length === 0,
);

function buildOption(): ECOption {
  return {
    grid: { bottom: 32, left: 56, right: 16, top: 24 },
    series: [
      {
        data: seriesPoints.value,
        markLine: {
          data: [{ yAxis: 50 }],
          label: { formatter: '50%' },
          symbol: 'none',
        },
        name: $t('page.analytics.charts.winRate.series'),
        showSymbol: seriesPoints.value.length === 1,
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: {
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const at = item?.value?.[0];
        const value = item?.value?.[2] ?? '—';
        return [at ? new Date(at).toLocaleDateString() : '', value].join(
          '<br/>',
        );
      },
      trigger: 'axis',
    },
    xAxis: { type: 'time' },
    yAxis: {
      axisLabel: { formatter: (value: number) => `${value}%` },
      max: 100,
      min: 0,
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
    icon="lucide:percent"
    :loading="loading"
    tone="violet"
    :title="$t('page.analytics.charts.winRate.title')"
    @resize="resize"
  >
    <template #extra>
      <span class="text-muted-foreground text-xs">
        {{ $t('page.analytics.charts.winRate.window') }}
      </span>
    </template>
    <EchartsUI ref="chartRef" class="h-full" />
  </EchartsCard>
</template>
