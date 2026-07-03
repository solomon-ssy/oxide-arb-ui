<script lang="ts" setup>
import type { CategoryRankIcDelta } from '@vben/types';

import { computed } from 'vue';

import { Empty, Table, Tag } from 'antdv-next';

import { $t } from '#/locales';
import {
  decimalSign,
  formatScore,
  parseDecimal,
} from '#/shared/components/format';
import {
  findTagOption,
  useMarketCategoryTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'CategoryDiffTable' });

const props = withDefaults(
  defineProps<{
    value?: CategoryRankIcDelta[];
  }>(),
  { value: () => [] },
);

const categoryTagOptions = useMarketCategoryTagOptions();

// Scale the diverging bar to the largest absolute delta so the widest bar
// fills half the track (positive right, negative left).
const maxAbsDelta = computed(() => {
  let max = 0;
  for (const row of props.value) {
    const magnitude = Math.abs(
      parseDecimal(row.rank_ic_delta)?.toNumber() ?? 0,
    );
    if (magnitude > max) {
      max = magnitude;
    }
  }
  return max;
});

const columns = computed(() => [
  {
    dataIndex: 'category',
    key: 'category',
    title: $t('page.research.comparisons.detail.categoryDiffPanel.category'),
  },
  {
    align: 'right' as const,
    dataIndex: 'baseline_rank_ic',
    key: 'baseline_rank_ic',
    title: $t('page.research.comparisons.detail.categoryDiffPanel.baseline'),
  },
  {
    align: 'right' as const,
    dataIndex: 'candidate_rank_ic',
    key: 'candidate_rank_ic',
    title: $t('page.research.comparisons.detail.categoryDiffPanel.candidate'),
  },
  {
    dataIndex: 'rank_ic_delta',
    key: 'rank_ic_delta',
    sorter: (a: CategoryRankIcDelta, b: CategoryRankIcDelta) =>
      (parseDecimal(a.rank_ic_delta)?.toNumber() ?? 0) -
      (parseDecimal(b.rank_ic_delta)?.toNumber() ?? 0),
    title: $t('page.research.comparisons.detail.categoryDiffPanel.delta'),
    width: 220,
  },
]);

function signClass(value: string): string {
  const sign = decimalSign(value);
  if (sign === 1) {
    return 'text-success';
  }
  if (sign === -1) {
    return 'text-destructive';
  }
  return '';
}

/** Half-track width % for the diverging bar of one delta value. */
function barWidth(value: string): number {
  if (maxAbsDelta.value === 0) {
    return 0;
  }
  const magnitude = Math.abs(parseDecimal(value)?.toNumber() ?? 0);
  return Math.round((magnitude / maxAbsDelta.value) * 50);
}
</script>

<template>
  <Table
    v-if="value.length > 0"
    :columns="columns"
    :data-source="value"
    :pagination="false"
    row-key="category"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'category'">
        <Tag
          :color="findTagOption(categoryTagOptions, record.category)?.color"
          :bordered="false"
        >
          {{ findTagOption(categoryTagOptions, record.category)?.label }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'baseline_rank_ic'">
        <span class="font-mono">{{
          formatScore(record.baseline_rank_ic)
        }}</span>
      </template>
      <template v-else-if="column.key === 'candidate_rank_ic'">
        <span class="font-mono">{{
          formatScore(record.candidate_rank_ic)
        }}</span>
      </template>
      <template v-else-if="column.key === 'rank_ic_delta'">
        <div class="flex items-center gap-2">
          <!-- Diverging track: center line, positive fills right, negative left. -->
          <div class="relative h-2 flex-1">
            <div class="bg-border absolute inset-y-0 left-1/2 w-px"></div>
            <div
              v-if="decimalSign(record.rank_ic_delta) === 1"
              :style="{ width: `${barWidth(record.rank_ic_delta)}%` }"
              class="bg-success absolute inset-y-0 left-1/2 rounded-r-full"
            ></div>
            <div
              v-else-if="decimalSign(record.rank_ic_delta) === -1"
              :style="{ width: `${barWidth(record.rank_ic_delta)}%` }"
              class="bg-destructive absolute inset-y-0 right-1/2 rounded-l-full"
            ></div>
          </div>
          <span
            :class="signClass(record.rank_ic_delta)"
            class="w-16 text-right font-mono"
          >
            {{ formatScore(record.rank_ic_delta) }}
          </span>
        </div>
      </template>
    </template>
  </Table>
  <Empty
    v-else
    :description="
      $t('page.research.comparisons.detail.categoryDiffPanel.empty')
    "
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
</template>
