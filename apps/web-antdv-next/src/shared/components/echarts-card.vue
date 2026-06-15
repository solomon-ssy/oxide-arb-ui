<script lang="ts" setup>
import type { PanelTone } from '#/shared/components/dashboard-accent';

import { ref } from 'vue';

import { useDebounceFn, useResizeObserver } from '@vueuse/core';
import { Alert, Empty, Skeleton } from 'antdv-next';

import DashboardPanel from '#/shared/components/dashboard-panel.vue';

defineOptions({ name: 'EchartsCard' });

withDefaults(
  defineProps<{
    /** Renders the empty state instead of the chart slot. */
    empty?: boolean;
    /** Operator-visible load failure (distinct from empty data). */
    error?: null | string;
    height?: string;
    icon?: string;
    loading?: boolean;
    title: string;
    tone?: PanelTone;
  }>(),
  {
    empty: false,
    error: null,
    height: '320px',
    icon: 'lucide:line-chart',
    loading: false,
    tone: 'indigo',
  },
);

const emit = defineEmits<{
  /** Fired when the chart container changes size (grid/sidebar reflow). */
  resize: [];
}>();

const chartAreaRef = ref<HTMLElement | null>(null);

useResizeObserver(
  chartAreaRef,
  useDebounceFn(() => {
    emit('resize');
  }, 200),
);
</script>

<template>
  <DashboardPanel :icon="icon" :title="title" :tone="tone" fill gap="sm">
    <template v-if="$slots.extra" #extra>
      <slot name="extra"></slot>
    </template>
    <div ref="chartAreaRef" :style="{ height }" class="relative">
      <Skeleton v-if="loading" :paragraph="{ rows: 5 }" active />
      <div
        v-else-if="error"
        class="flex h-full items-center justify-center px-4"
      >
        <Alert show-icon type="error" :message="error" />
      </div>
      <div v-else-if="empty" class="flex h-full items-center justify-center">
        <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" />
      </div>
      <slot v-else></slot>
    </div>
  </DashboardPanel>
</template>
