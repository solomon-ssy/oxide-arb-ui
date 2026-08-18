<script lang="ts" setup>
import type { CategoryRankIcDelta } from '@vben/types';

import { computed } from 'vue';

import { Empty, Table } from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import {
  decimalSign,
  formatScore,
  parseDecimal,
} from '#/shared/components/format';
import InlineBar from '#/shared/components/inline-bar.vue';
import SignedValue from '#/shared/components/signed-value.vue';
import { centerTableColumns } from '#/shared/table/center-columns';

defineOptions({ name: 'CategoryDiffTable' });

const props = withDefaults(
  defineProps<{
    value?: CategoryRankIcDelta[];
  }>(),
  { value: () => [] },
);

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
    dataIndex: 'baseline_rank_ic',
    key: 'baseline_rank_ic',
    title: $t('page.research.comparisons.detail.categoryDiffPanel.baseline'),
  },
  {
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
</script>

<template>
  <Table
    v-if="value.length > 0"
    :columns="centerTableColumns(columns) ?? columns"
    :data-source="value"
    :pagination="false"
    row-key="category"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'category'">
        <EnumTag
          context="category-diff-table"
          name="MarketCategory"
          :value="record.category"
        />
      </template>
      <template v-else-if="column.key === 'baseline_rank_ic'">
        <SignedValue
          :sign="null"
          :value="formatScore(record.baseline_rank_ic)"
        />
      </template>
      <template v-else-if="column.key === 'candidate_rank_ic'">
        <SignedValue
          :sign="null"
          :value="formatScore(record.candidate_rank_ic)"
        />
      </template>
      <template v-else-if="column.key === 'rank_ic_delta'">
        <div class="flex items-center gap-2">
          <InlineBar
            class="flex-1"
            mode="diverging"
            :center="0"
            :label="`${record.category} rank IC delta`"
            :max="maxAbsDelta"
            :min="-maxAbsDelta"
            :value="parseDecimal(record.rank_ic_delta)?.toNumber() ?? 0"
          />
          <SignedValue
            class="w-16 text-right"
            :sign="decimalSign(record.rank_ic_delta)"
            :value="formatScore(record.rank_ic_delta)"
          />
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
