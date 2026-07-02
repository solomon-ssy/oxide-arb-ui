<script lang="ts" setup>
import type { MarketBookView, MarketView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Descriptions, DescriptionsItem, TabPane, Tabs, Tag } from 'antdv-next';

import { getMarketBook } from '#/api/markets';
import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
} from '#/shared/components/format';
import {
  findTagOption,
  useMarketStatusTagOptions,
} from '#/shared/components/format/tag-options';
import { useQpWs } from '#/shared/composables/use-qp-ws';
import { useMarketStore } from '#/store';

import OrderBookSide from './order-book-side.vue';

defineOptions({ name: 'MarketDetailDrawer' });

interface MarketDetailDrawerData {
  market: MarketView;
}

const { handleRequest } = useRequestHandler();
const marketStore = useMarketStore();
const qpWs = useQpWs();

const market = ref<MarketView | null>(null);
/** REST-fetched baseline book; live WS frames in the store take precedence. */
const restBook = ref<MarketBookView | null>(null);

const statusTagOptions = useMarketStatusTagOptions();
const statusTag = computed(() =>
  market.value
    ? findTagOption(statusTagOptions, market.value.status)
    : undefined,
);

// Live book (WS `market.book_update`) overrides the REST baseline once it lands.
const book = computed<MarketBookView | null>(() => {
  const id = market.value?.market_id;
  if (!id) {
    return null;
  }
  return marketStore.books[id] ?? restBook.value;
});

const lastLiveUpdate = computed(() => {
  const id = market.value?.market_id;
  return id && marketStore.books[id] ? $t('page.markets.detail.liveWs') : null;
});

async function subscribeAndLoad(target: MarketView) {
  // Refcounted scoped subscription — the coalescer streams `market.book_update`
  // frames for this market while the drawer is open.
  qpWs.subscribeMarket(target.market_id);
  restBook.value = await handleRequest(() => getMarketBook(target.market_id), {
    silent: true,
  });
}

function teardown() {
  if (market.value) {
    qpWs.unsubscribeMarket(market.value.market_id);
  }
  market.value = null;
  restBook.value = null;
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<MarketDetailDrawerData>();
      market.value = data.market;
      void subscribeAndLoad(data.market);
    } else {
      teardown();
    }
  },
});
</script>

<template>
  <Drawer :title="$t('page.markets.detail.title')" class="w-full max-w-3xl">
    <div v-if="market" class="flex flex-col gap-4">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.markets.columns.question')">
          {{ market.question }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.columns.status')">
          <Tag :color="statusTag?.color ?? 'default'">
            {{ statusTag?.label ?? market.status }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.marketId')">
          <span class="font-mono text-xs">{{ market.market_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.eventId')">
          <span class="font-mono text-xs">{{ market.event_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.slug')">
          {{ market.slug }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.columns.category')">
          {{
            market.categories
              .map((value) => $t(`enum.marketCategory.${value}`))
              .join(', ')
          }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.tickSize')">
          {{ market.tick_size }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.negRisk')">
          {{
            market.neg_risk
              ? $t('page.markets.detail.yes')
              : $t('page.markets.detail.no')
          }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.outcome')">
          {{ market.outcome ?? EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.endDate')">
          {{ formatDateTimeLocal(market.end_date) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.markets.detail.resolvedAt')">
          {{ formatDateTimeLocal(market.resolved_at) }}
        </DescriptionsItem>
      </Descriptions>

      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold">
          {{ $t('page.markets.detail.book') }}
        </span>
        <Tag v-if="lastLiveUpdate" color="success">{{ lastLiveUpdate }}</Tag>
      </div>
      <Tabs>
        <TabPane key="yes" :tab="$t('page.markets.detail.yesBook')">
          <OrderBookSide :side="book?.yes" />
        </TabPane>
        <TabPane key="no" :tab="$t('page.markets.detail.noBook')">
          <OrderBookSide :side="book?.no" />
        </TabPane>
      </Tabs>
    </div>
  </Drawer>
</template>
