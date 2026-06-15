<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { AnalyticsDailyPoint, IsoDate } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { $t } from '#/locales';
import EchartsCard from '#/shared/components/echarts-card.vue';
import {
  decimalSign,
  formatUsd,
  parseDecimal,
} from '#/shared/components/format';

defineOptions({ name: 'AnalyticsDailyPnlBar' });

const props = withDefaults(
  defineProps<{
    error?: null | string;
    loading?: boolean;
    points: AnalyticsDailyPoint[];
  }>(),
  { error: null, loading: false },
);

const emit = defineEmits<{
  drilldown: [date: IsoDate];
}>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts, resize } = useEcharts(chartRef);

const isEmpty = computed(
  () => !props.loading && !props.error && props.points.length === 0,
);

function buildOption(): ECOption {
  return {
    grid: { bottom: 32, left: 64, right: 16, top: 24 },
    series: [
      {
        data: props.points.map((point) => {
          const decimal = parseDecimal(point.daily_pnl);
          return {
            itemStyle: {
              color:
                decimalSign(point.daily_pnl) === -1 ? '#dc2626' : '#16a34a',
            },
            value: decimal?.toNumber() ?? 0,
          };
        }),
        name: $t('page.analytics.charts.dailyPnl.series'),
        type: 'bar',
      },
    ],
    tooltip: {
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const index = item?.dataIndex ?? 0;
        const point = props.points[index];
        return point
          ? [point.date, formatUsd(point.daily_pnl)].join('<br/>')
          : '';
      },
      trigger: 'axis',
    },
    xAxis: {
      data: props.points.map((point) => point.date),
      type: 'category',
    },
    yAxis: {
      axisLabel: { formatter: (value: number) => `$${value}` },
      scale: true,
      type: 'value',
    },
  };
}

async function render() {
  const chart = await renderEcharts(buildOption());
  chart?.off('click');
  chart?.on('click', (params: any) => {
    const point = props.points[params?.dataIndex ?? -1];
    if (point) {
      emit('drilldown', point.date);
    }
  });
}

watch(
  () => [props.points, props.loading, props.error],
  () => {
    if (!props.loading && !props.error && !isEmpty.value) {
      void render();
    }
  },
  { immediate: true },
);
</script>

<template>
  <EchartsCard
    :empty="isEmpty"
    :error="error"
    icon="lucide:bar-chart-3"
    :loading="loading"
    tone="teal"
    :title="$t('page.analytics.charts.dailyPnl.title')"
    @resize="resize"
  >
    <template #extra>
      <span class="text-muted-foreground text-xs">
        {{ $t('page.analytics.charts.dailyPnl.drilldownHint') }}
      </span>
    </template>
    <EchartsUI ref="chartRef" class="h-full" />
  </EchartsCard>
</template>
