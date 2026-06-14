<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { DailyPnlSeriesPoint } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { useRequestHandler } from '@vben/request/oxide';

import Decimal from 'decimal.js';

import { getDailyPnlSeries } from '#/api/pnl';
import { $t } from '#/locales';
import EchartsCard from '#/shared/components/echarts-card.vue';
import { formatUsd, parseDecimal } from '#/shared/components/format';
import { usePnlStore } from '#/store';

defineOptions({ name: 'DashboardPnlCurve' });

/** History window length (days) shown on the overview curve. */
const HISTORY_DAYS = 7;

const router = useRouter();
const pnlStore = usePnlStore();
const { handleRequest } = useRequestHandler();

const chartRef = ref<EchartsUIType>();
const { renderEcharts, resize } = useEcharts(chartRef);

const loading = ref(true);
const history = ref<DailyPnlSeriesPoint[]>([]);

onMounted(async () => {
  await handleRequest(
    () => getDailyPnlSeries(HISTORY_DAYS),
    (series) => {
      history.value = series.points;
    },
  );
  loading.value = false;
});

const isEmpty = computed(
  () => history.value.length === 0 && pnlStore.intradaySeries.length === 0,
);

/**
 * Cumulative base for today's realtime segment: the running total of the last
 * settled day before today. Today's live cumulative = base + live daily pnl.
 */
const todayBase = computed<Decimal>(() => {
  const today = new Date().toISOString().slice(0, 10);
  let base = new Decimal(0);
  for (const point of history.value) {
    if (point.date < today) {
      base = parseDecimal(point.total_pnl) ?? base;
    }
  }
  return base;
});

/** `[epoch ms, plotted value, formatted tooltip value]` chart tuples. */
type ChartPoint = [number, number, string];

const historyPoints = computed<ChartPoint[]>(() =>
  history.value.map((point) => {
    const value = parseDecimal(point.total_pnl) ?? new Decimal(0);
    return [
      Date.parse(`${point.date}T00:00:00Z`),
      value.toNumber(),
      formatUsd(point.total_pnl),
    ];
  }),
);

const intradayPoints = computed<ChartPoint[]>(() => {
  const base = todayBase.value;
  return pnlStore.intradaySeries.map(([at, daily]) => {
    // Exact decimal math for the value; floats only at the pixel boundary.
    const cumulative = base.add(parseDecimal(daily) ?? 0);
    return [
      Date.parse(at),
      cumulative.toNumber(),
      formatUsd(cumulative.toString()),
    ];
  });
});

function render() {
  renderEcharts({
    grid: { bottom: 32, left: 64, right: 16, top: 24 },
    series: [
      {
        areaStyle: { opacity: 0.08 },
        data: historyPoints.value,
        name: $t('page.dashboard.pnlCurve.history'),
        showSymbol: historyPoints.value.length === 1,
        smooth: true,
        type: 'line',
      },
      {
        data: intradayPoints.value,
        lineStyle: { type: 'dashed' },
        name: $t('page.dashboard.pnlCurve.today'),
        showSymbol: false,
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: {
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        const lines = items.map(
          (item: any) =>
            `${item.marker} ${item.seriesName}: ${item.value?.[2] ?? '—'}`,
        );
        const at = items[0]?.value?.[0];
        const head = at ? new Date(at).toLocaleString() : '';
        return [head, ...lines].join('<br/>');
      },
      trigger: 'axis',
    },
    xAxis: { type: 'time' },
    yAxis: {
      axisLabel: { formatter: (value: number) => `$${value}` },
      scale: true,
      type: 'value',
    },
  });
}

watch([historyPoints, intradayPoints, loading], () => {
  if (!loading.value && !isEmpty.value) {
    render();
  }
});

function goAnalytics() {
  router.push('/analytics');
}
</script>

<template>
  <EchartsCard
    :empty="isEmpty"
    icon="lucide:line-chart"
    :loading="loading"
    tone="indigo"
    :title="$t('page.dashboard.pnlCurve.title')"
    @resize="resize"
  >
    <template #extra>
      <a class="cursor-pointer text-xs" @click="goAnalytics">
        {{ $t('page.dashboard.pnlCurve.toAnalytics') }}
      </a>
    </template>
    <EchartsUI ref="chartRef" class="h-full" />
  </EchartsCard>
</template>
