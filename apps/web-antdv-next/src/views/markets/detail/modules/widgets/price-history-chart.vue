<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type {
  MarketTradeTick,
  MicrostructureBucket,
  MicrostructureResolution,
} from '@vben/types';

import type { BucketPoint } from '../metrics';

import { computed, ref, watch } from 'vue';

import { EchartsUI } from '@vben/plugins/echarts';

import { useDebounceFn } from '@vueuse/core';

import { $t } from '#/locales';
import EchartsCard from '#/shared/components/echarts-card.vue';

import { bucketSeries, toNumber } from '../metrics';
import {
  MARKET_AXIS_TOOLTIP,
  useIncrementalEcharts,
} from '../use-incremental-echarts';

interface LiveTailPoint {
  noMid: null | number;
  ts: number;
  yesMid: null | number;
}

defineOptions({ name: 'PriceHistoryChart' });

const props = defineProps<{
  liveTail: LiveTailPoint[];
  loading: boolean;
  no: MicrostructureBucket[];
  resolution?: MicrostructureResolution;
  trades: MarketTradeTick[];
  yes: MicrostructureBucket[];
  yesTokenId: string;
}>();

const chartRef = ref<EchartsUIType>();
const {
  getChartInstance,
  patchChart,
  ready,
  renderInitial,
  resetChart,
  resize,
} = useIncrementalEcharts(chartRef);

const lastRenderedTailLen = ref(0);
const lastRenderedTailHeadTs = ref<null | number>(null);

const isEmpty = computed(
  () =>
    props.yes.length === 0 &&
    props.no.length === 0 &&
    props.liveTail.length === 0,
);

/** Merge historical mid buckets with the accumulated live tail, time-sorted. */
function withTail(
  history: BucketPoint[],
  pick: (point: LiveTailPoint) => null | number,
): BucketPoint[] {
  const tail = props.liveTail.map(
    (point) => [point.ts, pick(point)] as BucketPoint,
  );
  return [...history, ...tail].toSorted((a, b) => a[0] - b[0]);
}

function buildOptions(): ECOption {
  const yesSeries = withTail(
    bucketSeries(props.yes, (bucket) => toNumber(bucket.mid_close)),
    (point) => point.yesMid,
  );
  const noSeries = withTail(
    bucketSeries(props.no, (bucket) => toNumber(bucket.mid_close)),
    (point) => point.noMid,
  );
  const tradeSeries = props.trades.map((trade) => [
    trade.ts_ms,
    toNumber(trade.price),
  ]);

  return {
    grid: { bottom: 40, left: 48, right: 16, top: 30 },
    legend: {
      data: [
        $t('page.markets.detail.series.yesMid'),
        $t('page.markets.detail.series.noMid'),
        $t('page.markets.detail.series.trades'),
      ],
    },
    series: [
      {
        animationDurationUpdate: 0,
        connectNulls: false,
        data: yesSeries,
        name: $t('page.markets.detail.series.yesMid'),
        showSymbol: false,
        smooth: false,
        type: 'line',
      },
      {
        animationDurationUpdate: 0,
        connectNulls: false,
        data: noSeries,
        name: $t('page.markets.detail.series.noMid'),
        showSymbol: false,
        smooth: false,
        type: 'line',
      },
      {
        animationDurationUpdate: 0,
        data: tradeSeries,
        name: $t('page.markets.detail.series.trades'),
        symbolSize: 5,
        type: 'scatter',
      },
    ],
    tooltip: MARKET_AXIS_TOOLTIP,
    xAxis: { type: 'time' },
    yAxis: {
      axisLabel: { formatter: (value: number) => value.toFixed(2) },
      scale: true,
      type: 'value',
    },
  };
}

function syncTailCursor() {
  lastRenderedTailLen.value = props.liveTail.length;
  lastRenderedTailHeadTs.value = props.liveTail[0]?.ts ?? null;
}

function tailWasTrimmed(): boolean {
  const tail = props.liveTail;
  const head = tail[0];
  if (!head) {
    return false;
  }
  const headTs = head.ts;
  return (
    lastRenderedTailHeadTs.value !== null &&
    headTs !== lastRenderedTailHeadTs.value &&
    tail.length <= lastRenderedTailLen.value
  );
}

async function renderHistorical() {
  if (props.loading) {
    return;
  }
  resetChart();
  syncTailCursor();
  await renderInitial(buildOptions());
}

async function appendLiveTail() {
  const tail = props.liveTail;
  if (tail.length === 0) {
    return;
  }

  if (!ready.value) {
    await renderHistorical();
    return;
  }

  if (tailWasTrimmed()) {
    syncTailCursor();
    await patchChart(buildOptions(), true);
    return;
  }

  const newPoints = tail.slice(lastRenderedTailLen.value);
  if (newPoints.length === 0) {
    return;
  }

  const instance = getChartInstance();
  if (!instance) {
    syncTailCursor();
    await patchChart(buildOptions(), true);
    return;
  }

  for (const point of newPoints) {
    instance.appendData({
      seriesIndex: 0,
      data: [[point.ts, point.yesMid]],
    });
    instance.appendData({
      seriesIndex: 1,
      data: [[point.ts, point.noMid]],
    });
  }
  syncTailCursor();
}

const debouncedAppendLiveTail = useDebounceFn(() => {
  void appendLiveTail();
}, 50);

watch(
  () =>
    [
      props.loading,
      props.yes,
      props.no,
      props.trades,
      props.resolution,
    ] as const,
  ([loading]) => {
    if (loading) {
      return;
    }
    void renderHistorical();
  },
  { flush: 'post', immediate: true },
);

watch(
  () => props.liveTail,
  () => {
    debouncedAppendLiveTail();
  },
  { deep: true },
);
</script>

<template>
  <EchartsCard
    :empty="!loading && isEmpty"
    :loading="loading"
    :title="$t('page.markets.detail.charts.price')"
    height="340px"
    icon="lucide:activity"
    @resize="resize"
  >
    <template #extra>
      <span v-if="resolution" class="text-muted-foreground text-xs">
        {{ $t(`page.markets.detail.resolution.${resolution}`) }}
      </span>
    </template>
    <EchartsUI ref="chartRef" height="340px" />
  </EchartsCard>
</template>
