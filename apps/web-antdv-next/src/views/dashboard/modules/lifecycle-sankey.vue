<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { DashboardLifecycleView, DashboardSection } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { usePreferredReducedMotion } from '@vueuse/core';
import { Empty } from 'antdv-next';

import { $t } from '#/locales';
import InsightPanel from '#/shared/components/insight-panel.vue';
import { themeColors } from '#/shared/components/theme-color';

defineOptions({ name: 'DashboardLifecycleChart' });

const props = defineProps<{
  section: DashboardSection<DashboardLifecycleView>;
}>();

const chartRef = ref<EchartsUIType>();
const reducedMotion = usePreferredReducedMotion();
const { renderEcharts } = useEcharts(chartRef);

const lifecycle = computed(() =>
  props.section.state === 'ready' || props.section.state === 'stale'
    ? props.section.value
    : null,
);

/** Histogram keys from the dashboard lifecycle endpoint, pipeline order. */
const STAGE_ORDER = [
  'prepared',
  'published',
  'delivery_retrying',
  'delivery_failed',
  'report_run_queued',
  'report_run_running',
  'report_run_failed',
  'report_run_abandoned',
  'intent_pending_authorization',
  'execution_submitted',
  'execution_partially_filled',
  'execution_ambiguous',
  'reconciliation_unresolved',
  'superseded',
  'obsolete',
  'expired',
  'revoked',
] as const;

const stages = computed(() => {
  const counts = lifecycle.value?.counts ?? {};
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .toSorted(([left], [right]) => {
      const leftIndex = STAGE_ORDER.indexOf(
        left as (typeof STAGE_ORDER)[number],
      );
      const rightIndex = STAGE_ORDER.indexOf(
        right as (typeof STAGE_ORDER)[number],
      );
      return (
        (leftIndex === -1 ? STAGE_ORDER.length : leftIndex) -
          (rightIndex === -1 ? STAGE_ORDER.length : rightIndex) ||
        left.localeCompare(right)
      );
    });
});

const chartHeight = computed(
  () => `${Math.max(160, stages.value.length * 44 + 36)}px`,
);

function stageLabel(name: string): string {
  const key = `page.dashboard.reportLifecycle.event.${name}`;
  const label = $t(key);
  return label === key ? name : label;
}

function stageColor(name: string): string {
  if (/abandoned|ambiguous|failed|revoked|unresolved/.test(name)) {
    return themeColors.status.danger;
  }
  if (/expired|obsolete|pending|retrying|superseded/.test(name)) {
    return themeColors.status.warning;
  }
  if (/published|running|submitted/.test(name)) {
    return themeColors.status.success;
  }
  return themeColors.accent.command;
}

function render() {
  const rows = stages.value;
  if (!lifecycle.value || rows.length === 0) {
    return;
  }
  void renderEcharts({
    animationDuration: reducedMotion.value === 'reduce' ? 0 : 220,
    aria: {
      description: $t('page.dashboard.lifecycle.aria'),
      enabled: true,
    },
    series: [
      {
        data: rows.map(([name, count]) => ({
          itemStyle: { color: stageColor(name) },
          name: stageLabel(name),
          value: Number(count),
        })),
        emphasis: { focus: 'self' },
        label: {
          formatter: '{c}',
          position: 'right',
          show: true,
        },
        type: 'bar',
      },
    ],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => String(value ?? ''),
    },
    xAxis: {
      minInterval: 1,
      splitLine: { lineStyle: { opacity: 0.12 } },
      type: 'value',
    },
    yAxis: {
      data: rows.map(([name]) => stageLabel(name)),
      inverse: true,
      type: 'category',
    },
  });
}

watch([lifecycle, reducedMotion], render, { immediate: true });
</script>

<template>
  <InsightPanel
    :title="$t('page.dashboard.lifecycle.title')"
    fill
    icon="lucide:workflow"
    tone="sky"
  >
    <template v-if="lifecycle" #extra>
      <span class="text-muted-foreground text-xs tabular-nums">
        {{ $t('page.dashboard.lifecycle.total', { count: lifecycle.total }) }}
      </span>
    </template>
    <EchartsUI
      v-if="lifecycle && stages.length > 0"
      ref="chartRef"
      :height="chartHeight"
    />
    <div v-else class="panel-empty">
      <Empty
        :description="$t('page.dashboard.section.noSamples')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </div>
  </InsightPanel>
</template>
