<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { DashboardExposureView, DashboardSection } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { usePreferredReducedMotion } from '@vueuse/core';
import { Empty, Progress } from 'antdv-next';

import { $t } from '#/locales';
import { formatUsd } from '#/shared/components/format';
import InsightPanel from '#/shared/components/insight-panel.vue';

defineOptions({ name: 'DashboardExposureTreemap' });

const props = defineProps<{
  section: DashboardSection<DashboardExposureView>;
}>();
const chartRef = ref<EchartsUIType>();
const reducedMotion = usePreferredReducedMotion();
const { renderEcharts } = useEcharts(chartRef);
const exposure = computed(() =>
  props.section.state === 'ready' || props.section.state === 'stale'
    ? props.section.value
    : null,
);
const categories = computed(() =>
  Object.entries(exposure.value?.exposures.per_category ?? {})
    .map(([name, value]) => ({ name, raw: value, value: Number(value) }))
    .toSorted((left, right) => right.value - left.value),
);
const total = computed(() =>
  categories.value.reduce((sum, item) => sum + item.value, 0),
);

function render() {
  if (categories.value.length === 0) return;
  void renderEcharts({
    animationDuration: reducedMotion.value === 'reduce' ? 0 : 220,
    aria: {
      decal: { show: true },
      description: $t('page.dashboard.exposure.aria'),
      enabled: true,
    },
    series: [
      {
        breadcrumb: { show: false },
        data: categories.value,
        label: { formatter: '{b}\n{@raw}', show: true },
        roam: false,
        type: 'treemap',
        upperLabel: { show: false },
      },
    ],
    tooltip: {
      formatter: (params: unknown) => {
        const data = (params as { data: { name: string; raw: string } }).data;
        return `${data.name}: ${formatUsd(data.raw)}`;
      },
    },
  });
}

watch([categories, reducedMotion], render, { deep: true, immediate: true });
</script>

<template>
  <InsightPanel
    :title="$t('page.dashboard.exposure.title')"
    icon="lucide:blocks"
    tone="amber"
  >
    <EchartsUI v-if="categories.length > 0" ref="chartRef" height="270px" />
    <Empty
      v-else
      :description="$t('page.dashboard.exposure.none')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <ul v-if="categories.length > 0" class="mt-3 grid gap-2">
      <li
        v-for="item in categories"
        :key="item.name"
        class="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-xs"
      >
        <span class="truncate">{{ item.name }}</span>
        <Progress
          :percent="total > 0 ? Math.round((item.value / total) * 100) : 0"
          :show-info="false"
          size="small"
        />
        <span class="tabular-nums">{{ formatUsd(item.raw) }}</span>
      </li>
    </ul>
  </InsightPanel>
</template>
