<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';

import type { ExposureBreakdown } from '@vben/types';

import { computed } from 'vue';

import { Button, Empty } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import DataList from '#/shared/components/data-list.vue';
import { formatUsd, truncateHexId } from '#/shared/components/format';

defineOptions({ name: 'ExposureTopNCard' });

const props = defineProps<{
  exposures: ExposureBreakdown | null;
}>();

const emit = defineEmits<{
  navigate: [];
}>();

interface ExposureRow {
  key: string;
  label: string;
  value: string;
}

function toRows(
  map: Record<string, string> | undefined,
  labelFn: (key: string) => string,
  limit: number,
): ExposureRow[] {
  return Object.entries(map ?? {})
    .map(([key, value]) => ({ key, label: labelFn(key), value }))
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

const exposureColumns = computed<TableColumnsType<ExposureRow>>(() => [
  { dataIndex: 'label', key: 'label' },
  { align: 'right', dataIndex: 'value', key: 'value' },
]);
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
        <DataList
          :columns="exposureColumns"
          :data-source="topCategories"
          row-key="key"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'label'">
              <span class="truncate">{{ record.label }}</span>
            </template>
            <template v-else-if="column.key === 'value'">
              <span class="font-medium tabular-nums">
                {{ formatUsd(record.value) }}
              </span>
            </template>
          </template>
        </DataList>
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.dashboard.exposureTopN.byMarket') }}
        </span>
        <DataList
          :columns="exposureColumns"
          :data-source="topMarkets"
          row-key="key"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'label'">
              <span class="font-mono text-xs">{{ record.label }}</span>
            </template>
            <template v-else-if="column.key === 'value'">
              <span class="font-medium tabular-nums">
                {{ formatUsd(record.value) }}
              </span>
            </template>
          </template>
        </DataList>
      </div>
    </div>
  </DashboardPanel>
</template>
