<script lang="ts" setup>
import type { MarketBookSideView } from '@vben/types';

import { computed } from 'vue';

import { Empty } from 'antdv-next';

import { $t } from '#/locales';
import {
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  truncateHexId,
} from '#/shared/components/format';

defineOptions({ name: 'OrderBookSide' });

const props = defineProps<{
  /** Depth levels rendered per side (top of book first). */
  depth?: number;
  side: MarketBookSideView | null | undefined;
}>();

const depthLimit = computed(() => props.depth ?? 8);
// Bids: highest price first (best bid at top). Asks: lowest price first.
const bids = computed(() =>
  (props.side?.bids ?? []).slice(0, depthLimit.value),
);
const asks = computed(() =>
  (props.side?.asks ?? []).slice(0, depthLimit.value),
);

const updatedAtIso = computed(() =>
  props.side ? new Date(props.side.timestamp_ms).toISOString() : null,
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
      <div class="flex flex-col gap-1">
        <div
          class="text-muted-foreground flex justify-between text-xs font-medium"
        >
          <span>{{ $t('page.markets.detail.bidPrice') }}</span>
          <span>{{ $t('page.markets.detail.size') }}</span>
        </div>
        <div
          v-for="(level, index) in bids"
          :key="`bid-${index}`"
          class="flex justify-between font-mono text-xs tabular-nums"
        >
          <span class="text-emerald-600 dark:text-emerald-400">
            {{ formatPrice(level.price) }}
          </span>
          <span>{{ formatShares(level.size) }}</span>
        </div>
        <div v-if="bids.length === 0" class="text-muted-foreground text-xs">
          {{ $t('page.markets.detail.emptySide') }}
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <div
          class="text-muted-foreground flex justify-between text-xs font-medium"
        >
          <span>{{ $t('page.markets.detail.askPrice') }}</span>
          <span>{{ $t('page.markets.detail.size') }}</span>
        </div>
        <div
          v-for="(level, index) in asks"
          :key="`ask-${index}`"
          class="flex justify-between font-mono text-xs tabular-nums"
        >
          <span class="text-rose-600 dark:text-rose-400">
            {{ formatPrice(level.price) }}
          </span>
          <span>{{ formatShares(level.size) }}</span>
        </div>
        <div v-if="asks.length === 0" class="text-muted-foreground text-xs">
          {{ $t('page.markets.detail.emptySide') }}
        </div>
      </div>
    </div>
  </div>
  <Empty
    v-else
    :description="$t('page.markets.detail.bookUnavailable')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
</template>
