<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';

import type { ExposureBreakdown } from '@vben/types';

import { computed } from 'vue';

import { Empty } from 'antdv-next';

import { $t } from '#/locales';
import CompactDataTable from '#/shared/components/compact-data-table.vue';
import { formatUsd, truncateHexId } from '#/shared/components/format';
import InsightPanel from '#/shared/components/insight-panel.vue';

defineOptions({ name: 'ExposureBreakdownPanel' });

const props = defineProps<{
  exposures: ExposureBreakdown | null;
}>();

interface ExposureRow {
  key: string;
  label: string;
  value: string;
}

const allocationColumns: TableColumnsType<ExposureRow> = [
  { dataIndex: 'label', ellipsis: true, key: 'label' },
  { dataIndex: 'value', key: 'value' },
];

function toRows(
  map: Record<string, string> | undefined,
  labelFn: (key: string) => string,
): ExposureRow[] {
  return Object.entries(map ?? {})
    .map(([key, value]) => ({ key, label: labelFn(key), value }))
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
  <InsightPanel
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
        <CompactDataTable
          :columns="allocationColumns"
          :data-source="perCategory"
          row-key="key"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'value'">
              <span class="font-mono tabular-nums">{{
                formatUsd(record.value)
              }}</span>
            </template>
          </template>
        </CompactDataTable>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.quantAccount.exposure.byMarket') }}
        </span>
        <CompactDataTable
          :columns="allocationColumns"
          :data-source="perMarket"
          row-key="key"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'label'">
              <span class="font-mono text-xs">{{ record.label }}</span>
            </template>
            <template v-else-if="column.key === 'value'">
              <span class="font-mono tabular-nums">{{
                formatUsd(record.value)
              }}</span>
            </template>
          </template>
        </CompactDataTable>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-muted-foreground text-xs font-medium">
          {{ $t('page.quantAccount.exposure.byEvent') }}
        </span>
        <CompactDataTable
          :columns="allocationColumns"
          :data-source="perEvent"
          row-key="key"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'label'">
              <span class="font-mono text-xs">{{ record.label }}</span>
            </template>
            <template v-else-if="column.key === 'value'">
              <span class="font-mono tabular-nums">{{
                formatUsd(record.value)
              }}</span>
            </template>
          </template>
        </CompactDataTable>
      </div>
    </div>
  </InsightPanel>
</template>
