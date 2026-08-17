<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { DashboardLifecycleView, DashboardSection } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { usePreferredReducedMotion } from '@vueuse/core';
import { Empty, Steps } from 'antdv-next';

import { $t } from '#/locales';
import InsightPanel from '#/shared/components/insight-panel.vue';

defineOptions({ name: 'DashboardLifecycleSankey' });

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

const stageOrder = [
  'prepared',
  'published',
  'intent_pending_approval',
  'execution_submitted',
  'execution_partially_filled',
  'execution_ambiguous',
  'reconciliation_unresolved',
  'expired',
  'revoked',
];

const stages = computed(() => {
  const counts = lifecycle.value?.counts ?? {};
  const entries = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .toSorted(([left], [right]) => {
      const leftIndex = stageOrder.indexOf(left);
      const rightIndex = stageOrder.indexOf(right);
      return (
        (leftIndex === -1 ? stageOrder.length : leftIndex) -
          (rightIndex === -1 ? stageOrder.length : rightIndex) ||
        left.localeCompare(right)
      );
    });
  return entries.length > 0
    ? entries
    : [
        ['prepared', 0],
        ['published', 0],
        ['expired', 0],
      ];
});

function render() {
  if (!lifecycle.value || stages.value.length === 0) return;
  const nodes = stages.value.map(([name]) => ({ name }));
  const links = stages.value.slice(0, -1).map(([source, count], index) => ({
    source,
    target: stages.value[index + 1]?.[0] ?? source,
    value: Math.max(1, Number(count)),
  }));
  void renderEcharts({
    animationDuration: reducedMotion.value === 'reduce' ? 0 : 220,
    aria: {
      decal: { show: true },
      description: $t('page.dashboard.lifecycle.aria'),
      enabled: true,
    },
    series: [
      {
        data: nodes,
        emphasis: { focus: 'adjacency' },
        label: { formatter: ({ name }: { name: string }) => name },
        lineStyle: { color: 'gradient', curveness: 0.55, opacity: 0.38 },
        links,
        nodeAlign: 'justify',
        nodeGap: 16,
        type: 'sankey',
      },
    ],
    tooltip: { trigger: 'item' },
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
    <EchartsUI
      v-if="lifecycle"
      ref="chartRef"
      class="chart-fill"
      height="100%"
    />
    <div v-else class="panel-empty">
      <Empty
        :description="$t('page.dashboard.section.noSamples')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </div>
    <Steps
      v-if="lifecycle"
      class="lifecycle-steps mt-3"
      :items="
        stages.map(([name, count]) => ({
          content: String(count),
          title: $t(`page.dashboard.reportLifecycle.event.${name}`),
        }))
      "
      responsive
      size="small"
      type="dot"
    />
  </InsightPanel>
</template>

<style scoped>
.chart-fill {
  flex: 1 1 auto;
  min-height: 16.875rem;
}

.lifecycle-steps {
  flex: none;
}
</style>
