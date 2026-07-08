<script lang="ts" setup>
import type { TableColumnsType } from 'antdv-next';

import type { BookLevelView, MarketBookSideView } from '@vben/types';

import { computed } from 'vue';

import { Empty, Table } from 'antdv-next';

import { $t } from '#/locales';
import {
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  truncateHexId,
} from '#/shared/components/format';
import InlineBar from '#/shared/components/inline-bar.vue';

defineOptions({ name: 'OrderBookSide' });

const props = defineProps<{
  /** Depth levels rendered per side (top of book first). */
  depth?: number;
  side: MarketBookSideView | null | undefined;
}>();

interface BookTableRow {
  cumSize: number;
  key: string;
  price: string;
  priceTone: 'ask' | 'bid';
  size: string;
}

const depthLimit = computed(() => props.depth ?? 8);

function toNumber(value: null | string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildRows(
  levels: BookLevelView[],
  side: 'ask' | 'bid',
): BookTableRow[] {
  let cumSize = 0;
  return levels.slice(0, depthLimit.value).map((level, index) => {
    cumSize += toNumber(level.size);
    return {
      cumSize,
      key: `${side}-${index}`,
      price: formatPrice(level.price),
      priceTone: side,
      size: formatShares(level.size),
    };
  });
}

const maxCumSize = computed(() => {
  let max = 0;
  let bidCum = 0;
  for (const level of (props.side?.bids ?? []).slice(0, depthLimit.value)) {
    bidCum += toNumber(level.size);
    max = Math.max(max, bidCum);
  }
  let askCum = 0;
  for (const level of (props.side?.asks ?? []).slice(0, depthLimit.value)) {
    askCum += toNumber(level.size);
    max = Math.max(max, askCum);
  }
  return max || 1;
});

const bidRows = computed(() => buildRows(props.side?.bids ?? [], 'bid'));
const askRows = computed(() => buildRows(props.side?.asks ?? [], 'ask'));

const updatedAtIso = computed(() =>
  props.side ? new Date(props.side.timestamp_ms).toISOString() : null,
);

const bidColumns = computed<TableColumnsType<BookTableRow>>(() => [
  {
    dataIndex: 'price',
    key: 'price',
    title: $t('page.markets.detail.bidPrice'),
  },
  {
    align: 'right',
    dataIndex: 'size',
    key: 'size',
    title: $t('page.markets.detail.size'),
  },
  {
    key: 'depth',
    title: $t('page.markets.columns.depth'),
    width: '30%',
  },
]);

const askColumns = computed<TableColumnsType<BookTableRow>>(() => [
  {
    dataIndex: 'price',
    key: 'price',
    title: $t('page.markets.detail.askPrice'),
  },
  {
    align: 'right',
    dataIndex: 'size',
    key: 'size',
    title: $t('page.markets.detail.size'),
  },
  {
    key: 'depth',
    title: $t('page.markets.columns.depth'),
    width: '30%',
  },
]);

const bidsTableLabel = computed(
  () =>
    `${$t('page.markets.detail.book')} — ${$t('page.markets.detail.bidPrice')}`,
);
const asksTableLabel = computed(
  () =>
    `${$t('page.markets.detail.book')} — ${$t('page.markets.detail.askPrice')}`,
);
</script>

<template>
  <div v-if="side" class="flex flex-col gap-2">
    <div
      class="text-muted-foreground flex items-center justify-between text-xs"
    >
      <span class="font-mono">{{ truncateHexId(side.token_id) }}</span>
      <span>
        {{ $t('page.markets.detail.version') }}: {{ side.version }} ·
        {{ formatDateTimeLocal(updatedAtIso) }}
      </span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <Table
        :aria-label="bidsTableLabel"
        :columns="bidColumns"
        :data-source="bidRows"
        :pagination="false"
        :show-header="true"
        row-key="key"
        size="small"
      >
        <template #emptyText>
          <Empty
            :description="$t('page.markets.detail.emptySide')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'price'">
            <span class="font-mono text-xs tabular-nums text-success">
              {{ record.price }}
            </span>
          </template>
          <template v-else-if="column.key === 'size'">
            <span class="font-mono text-xs tabular-nums">{{
              record.size
            }}</span>
          </template>
          <template v-else-if="column.key === 'depth'">
            <InlineBar
              :label="`${$t('page.markets.detail.bidPrice')} ${record.price}`"
              :max="maxCumSize"
              :min="0"
              tone="success"
              :value="record.cumSize"
            />
          </template>
        </template>
      </Table>
      <Table
        :aria-label="asksTableLabel"
        :columns="askColumns"
        :data-source="askRows"
        :pagination="false"
        :show-header="true"
        row-key="key"
        size="small"
      >
        <template #emptyText>
          <Empty
            :description="$t('page.markets.detail.emptySide')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'price'">
            <span class="font-mono text-xs tabular-nums text-destructive">
              {{ record.price }}
            </span>
          </template>
          <template v-else-if="column.key === 'size'">
            <span class="font-mono text-xs tabular-nums">{{
              record.size
            }}</span>
          </template>
          <template v-else-if="column.key === 'depth'">
            <InlineBar
              :label="`${$t('page.markets.detail.askPrice')} ${record.price}`"
              :max="maxCumSize"
              :min="0"
              tone="destructive"
              :value="record.cumSize"
            />
          </template>
        </template>
      </Table>
    </div>
  </div>
  <Empty
    v-else
    :description="$t('page.markets.detail.bookUnavailable')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
</template>
