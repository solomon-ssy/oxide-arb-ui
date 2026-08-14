<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { DashboardSection, EquitySnapshotView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { usePreferredReducedMotion } from '@vueuse/core';
import { Empty } from 'antdv-next';

import { $t } from '#/locales';
import { formatPercent, formatUsd } from '#/shared/components/format';
import InsightPanel from '#/shared/components/insight-panel.vue';
import {
  resolveThemeColor,
  themeColors,
} from '#/shared/components/theme-color';

defineOptions({ name: 'DashboardEquityDrawdownChart' });

const props = defineProps<{
  section: DashboardSection<EquitySnapshotView[]>;
}>();

const chartRef = ref<EchartsUIType>();
const reducedMotion = usePreferredReducedMotion();
const { renderEcharts } = useEcharts(chartRef);
const values = computed(() =>
  props.section.state === 'ready' || props.section.state === 'stale'
    ? props.section.value
    : [],
);

function render() {
  const rows = values.value;
  if (rows.length === 0) return;
  const deterministic =
    document.documentElement.dataset.uiDeterministic === 'true';
  const timeAxis = rows.map((row, index) =>
    deterministic
      ? `T−${rows.length - index - 1}`
      : new Date(row.as_of).toLocaleString(),
  );
  void renderEcharts({
    animationDuration: reducedMotion.value === 'reduce' ? 0 : 220,
    aria: {
      decal: { show: true },
      description: $t('page.dashboard.equity.aria'),
      enabled: true,
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: { bottom: 42, left: 20, right: 28, top: 26, containLabel: true },
    legend: { bottom: 0 },
    series: [
      {
        areaStyle: {
          color: {
            colorStops: [
              {
                color: resolveThemeColor('--qp-chart-cat-1', '30%'),
                offset: 0,
              },
              {
                color: resolveThemeColor('--qp-chart-cat-2', '16%'),
                offset: 0.58,
              },
              {
                color: resolveThemeColor('--qp-chart-cat-2', '0%'),
                offset: 1,
              },
            ],
            type: 'linear',
            x: 0,
            x2: 0,
            y: 0,
            y2: 1,
          },
        },
        data: rows.map((row) => Number(row.venue_net_liquidation_usd)),
        emphasis: { focus: 'series' },
        lineStyle: { color: themeColors.categorical[0], width: 2 },
        name: $t('page.dashboard.kpi.netLiq'),
        showSymbol: false,
        smooth: true,
        type: 'line',
        yAxisIndex: 0,
      },
      {
        areaStyle: {
          color: resolveThemeColor('--qp-status-danger', '10%'),
        },
        data: rows.map((row) => Number(row.drawdown_pct) * 100),
        emphasis: { focus: 'series' },
        lineStyle: { color: themeColors.status.danger, width: 1.5 },
        name: $t('page.dashboard.kpi.drawdown'),
        showSymbol: false,
        smooth: true,
        type: 'line',
        yAxisIndex: 1,
      },
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: String,
    },
    xAxis: {
      axisLabel: { hideOverlap: true },
      boundaryGap: false,
      data: timeAxis,
      type: 'category',
    },
    yAxis: [
      {
        axisLabel: { formatter: (value: number) => formatUsd(String(value)) },
        splitLine: { lineStyle: { opacity: 0.12 } },
        type: 'value',
      },
      {
        axisLabel: {
          formatter: (value: number) => formatPercent(String(value / 100)),
        },
        splitLine: { show: false },
        type: 'value',
      },
    ],
  });
}

watch([values, reducedMotion], render, { immediate: true });
</script>

<template>
  <InsightPanel
    :title="$t('page.dashboard.equity.title')"
    featured
    icon="lucide:chart-no-axes-combined"
    tone="sky"
  >
    <EchartsUI v-if="values.length > 0" ref="chartRef" height="330px" />
    <Empty
      v-else
      :description="$t('page.dashboard.section.noSamples')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <ol v-if="values.length > 0" class="sr-only">
      <li v-for="row in values" :key="row.equity_snapshot_id">
        {{ new Date(row.as_of).toLocaleString() }}:
        {{ formatUsd(row.venue_net_liquidation_usd) }},
        {{ formatPercent(row.drawdown_pct) }}
      </li>
    </ol>
  </InsightPanel>
</template>
