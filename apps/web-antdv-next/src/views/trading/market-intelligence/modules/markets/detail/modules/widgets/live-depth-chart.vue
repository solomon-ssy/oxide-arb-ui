<script lang="ts" setup>
import type { EchartsUIType, ECOption } from '@vben/plugins/echarts';
import type { MarketBookView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI } from '@vben/plugins/echarts';

import { useDebounceFn } from '@vueuse/core';
import { RadioButton, RadioGroup } from 'antdv-next';

import { $t } from '#/locales';
import ChartPanel from '#/shared/components/chart-panel.vue';

import { cumulativeDepth } from '../metrics';
import {
  MARKET_AXIS_TOOLTIP,
  useIncrementalEcharts,
} from '../use-incremental-echarts';

defineOptions({ name: 'LiveDepthChart' });

const props = defineProps<{
  book: MarketBookView | null;
}>();

const chartRef = ref<EchartsUIType>();
const { patchChart, renderInitial, resetChart, resize } =
  useIncrementalEcharts(chartRef);

const selectedSide = ref<'no' | 'yes'>('yes');

const activeSide = computed(() =>
  selectedSide.value === 'yes' ? props.book?.yes : props.book?.no,
);

const isEmpty = computed(() => {
  const side = activeSide.value;
  return !side || (side.bids.length === 0 && side.asks.length === 0);
});

function buildOptions(): ECOption {
  const side = activeSide.value;
  const bids = cumulativeDepth(side?.bids, 'bid').map((point) => [
    point.price,
    point.cumSize,
  ]);
  const asks = cumulativeDepth(side?.asks, 'ask').map((point) => [
    point.price,
    point.cumSize,
  ]);

  return {
    legend: {
      data: [
        $t('page.markets.detail.series.bids'),
        $t('page.markets.detail.series.asks'),
      ],
    },
    series: [
      {
        animationDurationUpdate: 0,
        areaStyle: { opacity: 0.25 },
        data: bids,
        name: $t('page.markets.detail.series.bids'),
        showSymbol: false,
        step: 'end',
        type: 'line',
      },
      {
        animationDurationUpdate: 0,
        areaStyle: { opacity: 0.25 },
        data: asks,
        name: $t('page.markets.detail.series.asks'),
        showSymbol: false,
        step: 'start',
        type: 'line',
      },
    ],
    tooltip: MARKET_AXIS_TOOLTIP,
    xAxis: {
      axisLabel: { formatter: (value: number) => value.toFixed(2) },
      name: $t('page.markets.detail.askPrice'),
      scale: true,
      type: 'value',
    },
    yAxis: {
      name: $t('page.markets.detail.size'),
      scale: true,
      type: 'value',
    },
  };
}

const debouncedPatchBook = useDebounceFn(() => {
  void patchChart(buildOptions(), true);
}, 50);

watch(
  () => [props.book, selectedSide.value] as const,
  (_value, oldValue) => {
    const sideChanged =
      oldValue !== undefined && oldValue[1] !== selectedSide.value;
    if (sideChanged) {
      resetChart();
      void renderInitial(buildOptions());
      return;
    }
    debouncedPatchBook();
  },
  { immediate: true },
);
</script>

<template>
  <ChartPanel
    :empty="isEmpty"
    :title="$t('page.markets.detail.charts.liveDepth')"
    icon="lucide:bar-chart-big"
    tone="teal"
    @resize="resize"
  >
    <template #extra>
      <RadioGroup
        v-model:value="selectedSide"
        button-style="solid"
        size="small"
      >
        <RadioButton value="yes">
          {{ $t('page.markets.detail.sides.yes') }}
        </RadioButton>
        <RadioButton value="no">
          {{ $t('page.markets.detail.sides.no') }}
        </RadioButton>
      </RadioGroup>
    </template>
    <EchartsUI ref="chartRef" height="100%" />
  </ChartPanel>
</template>
