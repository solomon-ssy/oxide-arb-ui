<script lang="ts" setup>
import type { MarketBookView, MarketId, MarketView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { Descriptions, DescriptionsItem, Tag } from 'antdv-next';

import { getMarketBook, getMarketById } from '#/api/markets';
import { $t } from '#/locales';
import { formatDateTimeLocal, truncateHexId } from '#/shared/components/format';
import { useOxideWs } from '#/shared/composables/use-oxide-ws';
import { useMarketStore } from '#/store';

import OrderbookPanel from './orderbook-panel.vue';

defineOptions({ name: 'MarketDetailDrawer' });

const { handleRequest } = useRequestHandler();
const marketStore = useMarketStore();
const oxideWs = useOxideWs();

const market = ref<MarketView | null>(null);
const restBook = ref<MarketBookView | null>(null);
const loading = ref(false);
/** Market currently subscribed via the WS refcount (for teardown). */
let subscribedMarket: MarketId | null = null;

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const { marketId } = drawerApi.getData<{ marketId: MarketId }>();
      void load(marketId);
      oxideWs.subscribeMarket(marketId);
      subscribedMarket = marketId;
    } else {
      if (subscribedMarket) {
        oxideWs.unsubscribeMarket(subscribedMarket);
        subscribedMarket = null;
      }
      market.value = null;
      restBook.value = null;
    }
  },
});

async function load(marketId: MarketId) {
  loading.value = true;
  try {
    await handleRequest(
      () => getMarketById(marketId),
      (view) => {
        market.value = view;
      },
    );
    // The published book 404s before the first CLOB snapshot; degrade quietly.
    try {
      restBook.value = await getMarketBook(marketId);
    } catch {
      restBook.value = null;
    }
  } finally {
    loading.value = false;
  }
}

/** Live WS book wins over the REST first paint. */
const book = computed<MarketBookView | null>(() => {
  const id = market.value?.market_id;
  if (!id) {
    return null;
  }
  return marketStore.books[id] ?? restBook.value;
});

const resolvedLive = computed(() => {
  const id = market.value?.market_id;
  return id ? marketStore.resolved.has(id) : false;
});
</script>

<template>
  <Drawer
    class="w-[640px]"
    :loading="loading"
    :title="$t('page.markets.detail.title')"
  >
    <div v-if="market" class="flex flex-col gap-5">
      <Descriptions bordered :column="2" size="small">
        <DescriptionsItem :label="$t('page.markets.detail.question')" :span="2">
          {{ market.question }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.markets.columns.marketId')"
          :span="2"
        >
          <span class="font-mono text-xs">{{ market.market_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.eventId')">
          <span class="font-mono text-xs">{{ market.event_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.slug')">
          {{ market.slug }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.columns.status')">
          <Tag>{{ $t(`enum.marketStatus.${market.status}`) }}</Tag>
          <Tag v-if="resolvedLive" color="processing">
            {{ $t('page.markets.detail.resolvedLive') }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.categories')">
          <Tag v-for="category in market.categories" :key="category">
            {{ category }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.yesToken')">
          <span class="font-mono text-xs">
            {{ truncateHexId(market.yes_token_id, 8, 6) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.noToken')">
          <span class="font-mono text-xs">
            {{ truncateHexId(market.no_token_id, 8, 6) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.tickSize')">
          {{ market.tick_size }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.flags')">
          <Tag v-if="market.neg_risk" color="warning">neg_risk</Tag>
          <Tag v-if="market.fees_enabled">
            {{ $t('page.markets.detail.feesEnabled') }}
          </Tag>
          <Tag :color="market.subscribed ? 'success' : 'default'">
            {{
              market.subscribed
                ? $t('page.markets.columns.subscribedOn')
                : $t('page.markets.columns.subscribedOff')
            }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.endDate')">
          {{ formatDateTimeLocal(market.end_date) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.resolvedAt')">
          {{ formatDateTimeLocal(market.resolved_at) }}
          <template v-if="market.outcome"> · {{ market.outcome }}</template>
        </DescriptionsItem>
      </Descriptions>

      <div>
        <div class="mb-2 text-sm font-semibold">
          {{ $t('page.markets.book.title') }}
        </div>
        <OrderbookPanel :book="book" />
      </div>
    </div>
  </Drawer>
</template>
