<script lang="ts" setup>
import type { CategoryMetric } from '@vben/types';

import { computed } from 'vue';

import { Empty, Table } from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import {
  decimalSign,
  formatBps,
  formatPercent,
  formatScore,
  parseDecimal,
} from '#/shared/components/format';
import InlineBar from '#/shared/components/inline-bar.vue';
import SignedValue from '#/shared/components/signed-value.vue';

defineOptions({ name: 'BacktestCategoryBreakdown' });

const props = withDefaults(
  defineProps<{
    value?: CategoryMetric[];
  }>(),
  { value: () => [] },
);

interface CategoryRow extends CategoryMetric {
  share: number;
}

const rows = computed<CategoryRow[]>(() => {
  let total = 0;
  for (const item of props.value) {
    total += item.sample_count;
  }
  return props.value.map((item) => ({
    ...item,
    share: total > 0 ? item.sample_count / total : 0,
  }));
});

// The most-concentrated category — highlighted to surface the concentration
// soft gate (`category_concentration`) visually.
const maxShareCategory = computed(() => {
  let top: null | string = null;
  let max = 0;
  for (const row of rows.value) {
    if (row.share > max) {
      max = row.share;
      top = row.category;
    }
  }
  return top;
});

const columns = computed(() => [
  {
    dataIndex: 'category',
    key: 'category',
    title: $t('page.research.backtests.detail.categoryPanel.category'),
  },
  {
    align: 'right' as const,
    dataIndex: 'sample_count',
    key: 'sample_count',
    sorter: (a: CategoryRow, b: CategoryRow) => a.sample_count - b.sample_count,
    title: $t('page.research.backtests.detail.categoryPanel.samples'),
  },
  {
    dataIndex: 'share',
    key: 'share',
    title: $t('page.research.backtests.detail.categoryPanel.share'),
    width: 160,
  },
  {
    align: 'right' as const,
    dataIndex: 'rank_ic',
    key: 'rank_ic',
    sorter: (a: CategoryRow, b: CategoryRow) =>
      (parseDecimal(a.rank_ic)?.toNumber() ?? 0) -
      (parseDecimal(b.rank_ic)?.toNumber() ?? 0),
    title: $t('page.research.backtests.detail.categoryPanel.rankIc'),
  },
  {
    align: 'right' as const,
    dataIndex: 'hit_rate',
    key: 'hit_rate',
    title: $t('page.research.backtests.detail.categoryPanel.hitRate'),
  },
  {
    align: 'right' as const,
    dataIndex: 'mean_realized_bps',
    key: 'mean_realized_bps',
    title: $t('page.research.backtests.detail.categoryPanel.meanRealized'),
  },
]);
</script>

<template>
  <Table
    v-if="rows.length > 0"
    :columns="columns"
    :data-source="rows"
    :pagination="false"
    :scroll="{ x: 680 }"
    row-key="category"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'category'">
        <EnumTag
          context="backtest-category-breakdown"
          name="MarketCategory"
          :value="record.category"
        />
      </template>
      <template v-else-if="column.key === 'share'">
        <div class="flex items-center gap-2">
          <InlineBar
            class="flex-1"
            :label="`${record.category} share`"
            :max="1"
            :min="0"
            :tone="record.category === maxShareCategory ? 'warning' : 'primary'"
            :value="record.share"
          />
          <SignedValue
            class="w-12 text-right"
            :sign="null"
            :value="formatPercent(String(record.share))"
          />
        </div>
      </template>
      <template v-else-if="column.key === 'rank_ic'">
        <SignedValue
          :sign="decimalSign(record.rank_ic)"
          :value="formatScore(record.rank_ic)"
        />
      </template>
      <template v-else-if="column.key === 'hit_rate'">
        <SignedValue :sign="null" :value="formatPercent(record.hit_rate)" />
      </template>
      <template v-else-if="column.key === 'mean_realized_bps'">
        <SignedValue
          :sign="decimalSign(record.mean_realized_bps)"
          :value="formatBps(record.mean_realized_bps)"
        />
      </template>
    </template>
  </Table>
  <Empty
    v-else
    :description="$t('page.research.backtests.detail.categoryPanel.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
</template>
