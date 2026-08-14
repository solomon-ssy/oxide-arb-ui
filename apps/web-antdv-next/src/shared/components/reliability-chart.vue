<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { ReliabilityBinView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Empty } from 'antdv-next';

import { $t } from '#/locales';
import { resolveThemeColor } from '#/shared/components/theme-color';

defineOptions({ name: 'ReliabilityChart' });

const props = defineProps<{ bins: ReliabilityBinView[] }>();

interface Point {
  ciHi: number;
  ciLo: number;
  key: string;
  n: number;
  x: number;
  y: number;
}

const points = computed<Point[]>(() =>
  props.bins.map((bin) => ({
    key: `${bin.predicted_lo}-${bin.predicted_hi}`,
    n: bin.sample_count,
    x: Number(bin.mean_predicted),
    y: Number(bin.empirical_frequency),
    ciHi: Number(bin.wilson_ci[1]),
    ciLo: Number(bin.wilson_ci[0]),
  })),
);

const hasPoints = computed(() => points.value.length > 0);

/**
 * ECharts' native `aria` support (WAI-ARIA `role="img"` + a generated
 * `aria-label` on the chart container) replaces a hand-maintained hidden
 * data table as the screen-reader text alternative — see
 * https://echarts.apache.org/handbook/en/best-practices/aria/. A canvas
 * scatter plot with many bins produces an unreadably long auto-generated
 * description, so we provide a purpose-written summary instead of relying
 * on the default template.
 */
const ariaDescription = computed(() => {
  if (points.value.length === 0) {
    return '';
  }
  const predicted = points.value.map((point) => point.x);
  const empirical = points.value.map((point) => point.y);
  const samples = points.value.reduce((sum, point) => sum + point.n, 0);
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  return $t('page.research.calibrationArtifacts.detail.reliabilityAria', {
    binCount: points.value.length,
    empiricalMax: pct(Math.max(...empirical)),
    empiricalMin: pct(Math.min(...empirical)),
    predictedMax: pct(Math.max(...predicted)),
    predictedMin: pct(Math.min(...predicted)),
    sampleCount: samples,
  });
});

// `useEcharts` already observes `chartRef`'s own element for resize — no
// separate observer needed (see packages/effects/plugins/src/echarts).
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function render() {
  if (!hasPoints.value) {
    return;
  }
  const primary = resolveThemeColor('--qp-accent-command');
  const muted = resolveThemeColor('--qp-text-muted');
  const maxN = Math.max(...points.value.map((point) => point.n), 1);

  void renderEcharts({
    aria: { description: ariaDescription.value, enabled: true },
    grid: { bottom: 48, containLabel: true, left: 8, right: 24, top: 16 },
    series: [
      {
        data: [
          [0, 0],
          [1, 1],
        ],
        itemStyle: { color: muted },
        lineStyle: { color: muted, type: 'dashed', width: 1 },
        name: $t(
          'page.research.calibrationArtifacts.detail.reliabilityDiagonal',
        ),
        showSymbol: false,
        silent: true,
        type: 'line',
      },
      {
        // x, y, ciLo, ciHi, n — indices consumed by `renderItem` below.
        data: points.value.map((point) => [
          point.x,
          point.y,
          point.ciLo,
          point.ciHi,
          point.n,
        ]),
        renderItem: (_params, api) => {
          const x = api.value(0) as number;
          const lo = api.coord([x, api.value(2) as number]);
          const hi = api.coord([x, api.value(3) as number]);
          if (!lo || !hi) {
            return undefined;
          }
          return {
            shape: { x1: lo[0], x2: hi[0], y1: lo[1], y2: hi[1] },
            style: { lineWidth: 2, opacity: 0.4, stroke: primary },
            type: 'line',
          };
        },
        silent: true,
        type: 'custom',
      },
      {
        data: points.value.map((point) => [point.x, point.y, point.n]),
        itemStyle: { color: primary, opacity: 0.75 },
        name: $t('page.research.calibrationArtifacts.detail.reliabilityBins'),
        symbolSize: (value: number[]) => {
          const n = value[2] ?? 0;
          return Math.min(28, 8 + 20 * Math.sqrt(n / maxN));
        },
        type: 'scatter',
      },
    ],
    tooltip: {
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const value = item?.value as number[] | undefined;
        if (!value) {
          return '';
        }
        const [x, y, n] = value;
        return [
          `${$t('page.research.calibrationArtifacts.detail.reliabilityXAxis')}: ${((x ?? 0) * 100).toFixed(1)}%`,
          `${$t('page.research.calibrationArtifacts.detail.reliabilityYAxis')}: ${((y ?? 0) * 100).toFixed(1)}%`,
          n === undefined ? '' : `n = ${n}`,
        ]
          .filter(Boolean)
          .join('<br/>');
      },
      trigger: 'item',
    },
    xAxis: {
      axisLabel: {
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
      max: 1,
      min: 0,
      name: $t('page.research.calibrationArtifacts.detail.reliabilityXAxis'),
      nameGap: 28,
      nameLocation: 'middle',
      type: 'value',
    },
    yAxis: {
      axisLabel: {
        formatter: (value: number) => `${(value * 100).toFixed(0)}%`,
      },
      max: 1,
      min: 0,
      name: $t('page.research.calibrationArtifacts.detail.reliabilityYAxis'),
      nameGap: 44,
      nameLocation: 'middle',
      type: 'value',
    },
  });
}

watch(points, render, { deep: true, immediate: true });
</script>

<template>
  <div class="flex flex-col gap-2">
    <Empty
      v-if="!hasPoints"
      :description="
        $t('page.research.calibrationArtifacts.detail.reliabilityEmpty')
      "
    />
    <template v-else>
      <div style="height: 320px" class="relative w-full">
        <EchartsUI ref="chartRef" height="320px" />
      </div>
      <p class="text-muted-foreground text-xs">
        {{ $t('page.research.calibrationArtifacts.detail.reliabilityHint') }}
      </p>
    </template>
  </div>
</template>
