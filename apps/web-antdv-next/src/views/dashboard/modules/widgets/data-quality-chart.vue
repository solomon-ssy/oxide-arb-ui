<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { DataQualitySnapshot } from '@vben/types';

import { ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import { Empty, Skeleton, Tag } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';

defineOptions({ name: 'DataQualityChart' });

const props = defineProps<{
  loading: boolean;
  snapshot: DataQualitySnapshot | null;
}>();

const CHART_HEIGHT = '200px';

const chartRef = ref<EchartsUIType>();
const chartAreaRef = ref<HTMLElement | null>(null);
const { renderEcharts, resize } = useEcharts(chartRef);

useResizeObserver(
  chartAreaRef,
  useDebounceFn(() => {
    resize();
  }, 200),
);

function render() {
  const snapshot = props.snapshot;
  if (!snapshot) {
    return;
  }
  void renderEcharts({
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        data: [
          {
            name: $t('page.dashboard.dataQuality.fresh'),
            value: snapshot.fresh,
          },
          {
            name: $t('page.dashboard.dataQuality.acceptable'),
            value: snapshot.acceptable,
          },
          {
            name: $t('page.dashboard.dataQuality.degraded'),
            value: snapshot.degraded,
          },
          {
            name: $t('page.dashboard.dataQuality.stale'),
            value: snapshot.stale,
          },
          {
            name: $t('page.dashboard.dataQuality.insufficient'),
            value: snapshot.insufficient,
          },
        ],
        emphasis: { label: { fontSize: 14, show: true } },
        label: { formatter: '{b}: {c}', show: true },
        radius: ['42%', '68%'],
        type: 'pie',
      },
    ],
    tooltip: { trigger: 'item' },
  });
}

watch(
  () => props.snapshot,
  () => render(),
  { immediate: true },
);
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.dataQuality.title')"
    icon="lucide:pie-chart"
    tone="sky"
  >
    <div class="flex flex-col gap-3">
      <div
        ref="chartAreaRef"
        :style="{ height: CHART_HEIGHT }"
        class="relative w-full"
      >
        <Skeleton v-if="loading" :paragraph="{ rows: 5 }" active />
        <div
          v-else-if="!snapshot"
          class="flex h-full items-center justify-center"
        >
          <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </div>
        <EchartsUI v-else ref="chartRef" :height="CHART_HEIGHT" />
      </div>

      <template v-if="snapshot">
        <div
          class="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs"
        >
          <span>{{ $t('page.dashboard.dataQuality.totalTokens') }}</span>
          <span class="text-right font-medium tabular-nums">
            {{ snapshot.total_tokens }}
          </span>
          <span>{{ $t('page.dashboard.dataQuality.maxBookAge') }}</span>
          <span class="text-right tabular-nums">
            {{ snapshot.max_book_age_ms }}ms
          </span>
          <span>{{ $t('page.dashboard.dataQuality.worstFactLag') }}</span>
          <span
            :class="{ 'text-destructive': snapshot.fact_lag_exceeded }"
            class="text-right tabular-nums"
          >
            {{ snapshot.worst_fact_lag_ms }}ms
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <Tag color="success">
            {{ $t('page.dashboard.dataQuality.fresh') }}: {{ snapshot.fresh }}
          </Tag>
          <Tag color="error">
            {{ $t('page.dashboard.dataQuality.stale') }}: {{ snapshot.stale }}
          </Tag>
        </div>
      </template>
    </div>
  </DashboardPanel>
</template>
