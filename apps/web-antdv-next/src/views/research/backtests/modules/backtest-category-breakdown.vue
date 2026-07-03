<script lang="ts" setup>
import type { CategoryMetric } from '@vben/types';

import { computed } from 'vue';

import { Empty, Table, Tag } from 'antdv-next';

import { $t } from '#/locales';
import {
  decimalSign,
  formatBps,
  formatPercent,
  formatScore,
  parseDecimal,
} from '#/shared/components/format';
import {
  findTagOption,
  useMarketCategoryTagOptions,
} from '#/shared/components/format/tag-options';

defineOptions({ name: 'BacktestCategoryBreakdown' });

const props = withDefaults(
  defineProps<{
    value?: CategoryMetric[];
  }>(),
  { value: () => [] },
);

const categoryTagOptions = useMarketCategoryTagOptions();

interface CategoryRow extends CategoryMetric {
  share: number;
}

const rows = computed<CategoryRow[]>(() => {
  const total = props.value.reduce((sum, item) => sum + item.sample_count, 0);
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
</script>

<template>
  <Table
    v-if="rows.length > 0"
    :columns="columns"
    :data-source="rows"
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
      <template v-else-if="column.key === 'share'">
        <div class="flex items-center gap-2">
          <div class="bg-accent h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              :class="
                record.category === maxShareCategory
                  ? 'bg-warning'
                  : 'bg-primary'
              "
              :style="{ width: `${Math.round(record.share * 100)}%` }"
              class="h-full rounded-full"
            ></div>
          </div>
          <span class="text-muted-foreground w-12 text-right font-mono text-xs">
            {{ formatPercent(String(record.share)) }}
          </span>
        </div>
      </template>
      <template v-else-if="column.key === 'rank_ic'">
        <span :class="signClass(record.rank_ic)" class="font-mono">
          {{ formatScore(record.rank_ic) }}
        </span>
      </template>
      <template v-else-if="column.key === 'hit_rate'">
        <span class="font-mono">{{ formatPercent(record.hit_rate) }}</span>
      </template>
      <template v-else-if="column.key === 'mean_realized_bps'">
        <span :class="signClass(record.mean_realized_bps)" class="font-mono">
          {{ formatBps(record.mean_realized_bps) }}
        </span>
      </template>
    </template>
  </Table>
  <Empty
    v-else
    :description="$t('page.research.backtests.detail.categoryPanel.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
</template>
