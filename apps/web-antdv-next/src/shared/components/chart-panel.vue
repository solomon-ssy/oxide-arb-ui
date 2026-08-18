<script lang="ts" setup>
import type { InsightTone } from '#/shared/components/insight-panel.vue';

import { ref } from 'vue';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import { Alert, Empty, Skeleton } from 'antdv-next';

import InsightPanel from '#/shared/components/insight-panel.vue';

defineOptions({ name: 'ChartPanel' });

withDefaults(
  defineProps<{
    empty?: boolean;
    emptyText?: string;
    error?: null | string;
    height?: string;
    icon?: string;
    loading?: boolean;
    title: string;
    tone?: InsightTone;
  }>(),
  {
    empty: false,
    emptyText: undefined,
    error: null,
    height: '320px',
    icon: 'lucide:line-chart',
    loading: false,
    tone: 'indigo',
  },
);

const emit = defineEmits<{ resize: [] }>();
const chartAreaRef = ref<HTMLElement | null>(null);

useResizeObserver(
  chartAreaRef,
  useDebounceFn(() => emit('resize'), 200),
);
</script>

<template>
  <InsightPanel :icon="icon" :title="title" :tone="tone" fill gap="sm">
    <template v-if="$slots.extra" #extra><slot name="extra"></slot></template>
    <div ref="chartAreaRef" :style="{ height }" class="chart-area">
      <Alert v-if="error" :message="error" show-icon type="error" />
      <Empty
        v-else-if="empty"
        :description="emptyText"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <div v-else class="chart-canvas">
        <slot></slot>
        <Skeleton
          v-if="loading"
          :paragraph="{ rows: 5 }"
          active
          class="chart-loading"
        />
      </div>
    </div>
  </InsightPanel>
</template>

<style scoped>
.chart-area {
  position: relative;
  display: grid;
  min-width: 0;
}

.chart-area > :deep(.ant-empty),
.chart-area > :deep(.ant-alert) {
  place-self: center;
}

.chart-canvas {
  position: relative;
  width: 100%;
  min-width: 0;
  height: 100%;
}

.chart-canvas > :deep(*) {
  width: 100%;
  height: 100%;
}

.chart-loading {
  position: absolute;
  inset: 0;
  padding: 16px;
  background: hsl(var(--qp-surface-raised));
}
</style>
