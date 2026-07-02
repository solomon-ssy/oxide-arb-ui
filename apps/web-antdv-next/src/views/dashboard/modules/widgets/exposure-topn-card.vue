<script lang="ts" setup>
import type { ExposureBreakdown } from '@vben/types';

import { computed } from 'vue';

import { Button, Empty } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatUsd, truncateHexId } from '#/shared/components/format';

defineOptions({ name: 'ExposureTopNCard' });

const props = defineProps<{
  exposures: ExposureBreakdown | null;
}>();

const emit = defineEmits<{
  navigate: [];
}>();

interface ExposureRow {
  label: string;
  value: string;
}

function toRows(
  map: Record<string, string> | undefined,
  labelFn: (key: string) => string,
  limit: number,
): ExposureRow[] {
  return Object.entries(map ?? {})
    .map(([key, value]) => ({ label: labelFn(key), value }))
    .toSorted((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .slice(0, limit);
}

const topCategories = computed(() =>
  toRows(
    props.exposures?.per_category,
    (key) => $t(`enum.marketCategory.${key}`),
    3,
  ),
);

const topMarkets = computed(() =>
  toRows(props.exposures?.per_market, (key) => truncateHexId(key), 3),
);

const isEmpty = computed(
  () => topCategories.value.length === 0 && topMarkets.value.length === 0,
);
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.exposureTopN.title')"
    icon="lucide:layers"
    tone="violet"
    fill
  >
    <template #extra>
      <Button size="small" type="link" @click="emit('navigate')">
        {{ $t('page.dashboard.viewAll') }}
      </Button>
    </template>
    <Empty
      v-if="isEmpty"
      :description="$t('page.dashboard.exposureTopN.none')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-1.5">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.dashboard.exposureTopN.byCategory') }}
        </span>
        <div
          v-for="row in topCategories"
          :key="row.label"
          class="flex items-center justify-between gap-2 text-sm"
        >
          <span class="truncate">{{ row.label }}</span>
          <span class="shrink-0 font-medium tabular-nums">
            {{ formatUsd(row.value) }}
          </span>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.dashboard.exposureTopN.byMarket') }}
        </span>
        <div
          v-for="row in topMarkets"
          :key="row.label"
          class="flex items-center justify-between gap-2 text-sm"
        >
          <span class="font-mono text-xs">{{ row.label }}</span>
          <span class="shrink-0 font-medium tabular-nums">
            {{ formatUsd(row.value) }}
          </span>
        </div>
      </div>
    </div>
  </DashboardPanel>
</template>
