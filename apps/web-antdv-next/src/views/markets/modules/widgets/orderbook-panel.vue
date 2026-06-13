<script lang="ts" setup>
import type {
  BookLevelView,
  MarketBookSideView,
  MarketBookView,
} from '@vben/types';

import { computed } from 'vue';

import { Empty } from 'antdv-next';
import Decimal from 'decimal.js';

import { $t } from '#/locales';
import {
  formatPrice,
  formatShares,
  parseDecimal,
} from '#/shared/components/format';

defineOptions({ name: 'OrderbookPanel' });

const props = defineProps<{
  /** Published two-sided book; `null` renders the empty state. */
  book: MarketBookView | null;
}>();

const DEPTH_LEVELS = 5;

interface LevelRow {
  price: string;
  size: string;
  /** Bar width percentage relative to the deepest displayed level. */
  pct: number;
}

interface SidePanel {
  token: 'no' | 'yes';
  bids: LevelRow[];
  asks: LevelRow[];
}

function topLevels(
  levels: BookLevelView[],
  descending: boolean,
): BookLevelView[] {
  const sorted = levels.toSorted((a, b) => {
    const pa = parseDecimal(a.price) ?? new Decimal(0);
    const pb = parseDecimal(b.price) ?? new Decimal(0);
    return descending ? pb.comparedTo(pa) : pa.comparedTo(pb);
  });
  return sorted.slice(0, DEPTH_LEVELS);
}

function toRows(levels: BookLevelView[]): LevelRow[] {
  let max = new Decimal(0);
  for (const level of levels) {
    const size = parseDecimal(level.size) ?? new Decimal(0);
    if (size.gt(max)) {
      max = size;
    }
  }
  return levels.map((level) => {
    const size = parseDecimal(level.size) ?? new Decimal(0);
    return {
      pct: max.isZero() ? 0 : size.div(max).mul(100).toNumber(),
      price: formatPrice(level.price),
      size: formatShares(level.size),
    };
  });
}

function sidePanel(
  token: 'no' | 'yes',
  side: MarketBookSideView | null,
): SidePanel {
  return {
    asks: side ? toRows(topLevels(side.asks, false)) : [],
    bids: side ? toRows(topLevels(side.bids, true)) : [],
    token,
  };
}

const panels = computed<SidePanel[]>(() => [
  sidePanel('yes', props.book?.yes ?? null),
  sidePanel('no', props.book?.no ?? null),
]);

const hasAnyLevel = computed(() =>
  panels.value.some((panel) => panel.bids.length > 0 || panel.asks.length > 0),
);
</script>

<template>
  <Empty
    v-if="!hasAnyLevel"
    :description="$t('page.markets.book.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div
      v-for="panel in panels"
      :key="panel.token"
      class="flex flex-col gap-1.5"
    >
      <div class="text-sm font-semibold">
        {{
          panel.token === 'yes'
            ? $t('page.markets.book.yes')
            : $t('page.markets.book.no')
        }}
      </div>
      <!-- Asks above bids, ask rows reversed so best ask sits next to best bid. -->
      <div class="flex flex-col gap-0.5">
        <div
          v-for="row in [...panel.asks].reverse()"
          :key="`ask-${row.price}`"
          class="relative flex items-center justify-between rounded px-2 py-0.5 font-mono text-xs tabular-nums"
        >
          <span
            class="absolute inset-y-0 right-0 rounded bg-red-500/15"
            :style="{ width: `${row.pct}%` }"
          ></span>
          <span class="text-destructive relative">{{ row.price }}</span>
          <span class="relative">{{ row.size }}</span>
        </div>
        <div
          v-if="panel.asks.length === 0"
          class="text-muted-foreground px-2 py-0.5 text-xs"
        >
          {{ $t('page.markets.book.noAsks') }}
        </div>
        <div class="border-border my-1 border-t"></div>
        <div
          v-for="row in panel.bids"
          :key="`bid-${row.price}`"
          class="relative flex items-center justify-between rounded px-2 py-0.5 font-mono text-xs tabular-nums"
        >
          <span
            class="absolute inset-y-0 right-0 rounded bg-green-500/15"
            :style="{ width: `${row.pct}%` }"
          ></span>
          <span class="text-success relative">{{ row.price }}</span>
          <span class="relative">{{ row.size }}</span>
        </div>
        <div
          v-if="panel.bids.length === 0"
          class="text-muted-foreground px-2 py-0.5 text-xs"
        >
          {{ $t('page.markets.book.noBids') }}
        </div>
      </div>
    </div>
  </div>
</template>
