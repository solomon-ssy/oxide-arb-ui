<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { DataQualitySnapshot } from '@vben/types';

import type { KeyValueGridItem } from '#/shared/components/key-value-grid.vue';

import { computed, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Empty, Skeleton, Tag } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import KeyValueGrid from '#/shared/components/key-value-grid.vue';
import SignedValue from '#/shared/components/signed-value.vue';

defineOptions({ name: 'DataQualityChart' });

const props = defineProps<{
  loading: boolean;
  snapshot: DataQualitySnapshot | null;
}>();

const CHART_HEIGHT = '200px';

// `useEcharts` already observes `chartRef`'s own element for resize — no
// separate observer needed (see packages/effects/plugins/src/echarts).
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const kvItems = computed<KeyValueGridItem[]>(() => {
  const snapshot = props.snapshot;
  if (!snapshot) {
    return [];
  }
  return [
    {
      key: 'totalTokens',
      label: $t('page.dashboard.dataQuality.totalTokens'),
      value: String(snapshot.total_tokens),
    },
    {
      key: 'worstBookAge',
      label: $t('page.dashboard.dataQuality.worstBookAge'),
      value: `${snapshot.worst_book_age_ms}ms / ${snapshot.max_book_age_ms}ms`,
    },
    {
      key: 'worstIngestLag',
      label: $t('page.dashboard.dataQuality.worstIngestLag'),
      value: `${snapshot.worst_ingest_lag_ms}ms / ${snapshot.max_ingest_lag_ms}ms`,
    },
  ];
});

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
      <div :style="{ height: CHART_HEIGHT }" class="relative w-full">
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
        <KeyValueGrid :bordered="false" :items="kvItems">
          <template #worstIngestLag="{ item }">
            <SignedValue
              :sign="snapshot.ingest_lag_exceeded ? -1 : null"
              :value="item.value ?? ''"
            />
          </template>
        </KeyValueGrid>
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
