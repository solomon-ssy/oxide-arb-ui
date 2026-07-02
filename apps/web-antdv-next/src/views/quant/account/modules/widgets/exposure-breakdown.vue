<script lang="ts" setup>
import type { ExposureBreakdown } from '@vben/types';

import { computed } from 'vue';

import { Empty } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatUsd, truncateHexId } from '#/shared/components/format';

defineOptions({ name: 'ExposureBreakdownPanel' });

const props = defineProps<{
  exposures: ExposureBreakdown | null;
}>();

interface ExposureRow {
  label: string;
  value: string;
}

function toRows(
  map: Record<string, string> | undefined,
  labelFn: (key: string) => string,
): ExposureRow[] {
  return Object.entries(map ?? {})
    .map(([key, value]) => ({ label: labelFn(key), value }))
    .toSorted((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
}

const perCategory = computed(() =>
  toRows(props.exposures?.per_category, (key) =>
    $t(`enum.marketCategory.${key}`),
  ),
);
const perMarket = computed(() =>
  toRows(props.exposures?.per_market, (key) => truncateHexId(key)),
);
const perEvent = computed(() =>
  toRows(props.exposures?.per_event, (key) => truncateHexId(key)),
);

const isEmpty = computed(
  () =>
    perCategory.value.length === 0 &&
    perMarket.value.length === 0 &&
    perEvent.value.length === 0,
);
</script>

<template>
  <DashboardPanel
    :title="$t('page.quantAccount.exposure.title')"
    icon="lucide:layers"
    tone="violet"
  >
    <Empty
      v-if="isEmpty"
      :description="$t('page.quantAccount.exposure.none')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.quantAccount.exposure.byCategory') }}
        </span>
        <div
          v-for="row in perCategory"
          :key="row.label"
          class="flex justify-between text-sm"
        >
          <span class="truncate">{{ row.label }}</span>
          <span class="font-mono tabular-nums">{{ formatUsd(row.value) }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.quantAccount.exposure.byMarket') }}
        </span>
        <div
          v-for="row in perMarket"
          :key="row.label"
          class="flex justify-between text-sm"
        >
          <span class="truncate font-mono text-xs">{{ row.label }}</span>
          <span class="font-mono tabular-nums">{{ formatUsd(row.value) }}</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.quantAccount.exposure.byEvent') }}
        </span>
        <div
          v-for="row in perEvent"
          :key="row.label"
          class="flex justify-between text-sm"
        >
          <span class="truncate font-mono text-xs">{{ row.label }}</span>
          <span class="font-mono tabular-nums">{{ formatUsd(row.value) }}</span>
        </div>
      </div>
    </div>
  </DashboardPanel>
</template>
