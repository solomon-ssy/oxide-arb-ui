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
        areaStyle: { opacity: 0.14 },
        data: rows.map((row) => Number(row.venue_net_liquidation_usd)),
        emphasis: { focus: 'series' },
        name: $t('page.dashboard.kpi.netLiq'),
        showSymbol: false,
        smooth: true,
        type: 'line',
        yAxisIndex: 0,
      },
      {
        areaStyle: { opacity: 0.1 },
        data: rows.map((row) => Number(row.drawdown_pct) * 100),
        emphasis: { focus: 'series' },
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
      data: rows.map((row) => new Date(row.as_of).toLocaleString()),
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
    icon="lucide:chart-no-axes-combined"
    tone="teal"
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
