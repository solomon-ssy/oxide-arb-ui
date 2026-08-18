<script lang="ts" setup>
import type {
  MarketBookView,
  MarketMicrostructureView,
  MarketView,
} from '@vben/types';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/qp';

import { Button, Empty, Spin } from 'antdv-next';

import {
  getMarketBook,
  getMarketById,
  getMarketMicrostructure,
} from '#/api/markets';
import { $t } from '#/locales';
import WorkspaceObjectStage from '#/shared/components/workspace/workspace-object-stage.vue';
import { useQpWs } from '#/shared/composables/use-qp-ws';
import { useMarketStore } from '#/store';

import { useMarketActions } from '../modules/use-market-actions';
import OrderBookSide from '../modules/widgets/order-book-side.vue';
import {
  bestAsk,
  bestBid,
  imbalance,
  midPrice,
  sideDepthUsd,
  spreadBps,
} from './modules/metrics';
import DepthLiquidityChart from './modules/widgets/depth-liquidity-chart.vue';
import ImbalanceChart from './modules/widgets/imbalance-chart.vue';
import LiveDepthChart from './modules/widgets/live-depth-chart.vue';
import LiveKpiStrip from './modules/widgets/live-kpi-strip.vue';
import MarketDetailHeader from './modules/widgets/market-detail-header.vue';
import PriceHistoryChart from './modules/widgets/price-history-chart.vue';
import SpreadChart from './modules/widgets/spread-chart.vue';

defineOptions({ name: 'MarketDetailPage' });

/** Default look-back span (1 hour) when the selected range is unresolved. */
const DEFAULT_RANGE_MS = 60 * 60_000;

/** Selectable look-back windows (label key + span in ms). */
const RANGE_OPTIONS = [
  { key: 'm5', ms: 5 * 60_000, value: '5m' },
  { key: 'h1', ms: DEFAULT_RANGE_MS, value: '1h' },
  { key: 'h6', ms: 6 * 60 * 60_000, value: '6h' },
  { key: 'h24', ms: 24 * 60 * 60_000, value: '24h' },
  { key: 'd3', ms: 3 * 24 * 60 * 60_000, value: '3d' },
] as const;

/** Live-tail retention: cap accumulated WS mid samples to bound memory. */
const LIVE_TAIL_CAP = 900;
/** Book age (ms) beyond which the freshness indicator turns stale. */
const FRESH_THRESHOLD_MS = 5000;

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const marketStore = useMarketStore();
const qpWs = useQpWs();

const marketId = computed(() => {
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  return entity === 'market' && typeof id === 'string' ? id : '';
});
const inspectorOpen = computed({
  get: () => marketId.value !== '',
  set: (value: boolean) => {
    if (!value) goBack();
  },
});

const market = ref<MarketView | null>(null);
const marketLoading = ref(false);
/** REST baseline book; live WS frames in the store take precedence. */
const restBook = ref<MarketBookView | null>(null);

const micro = ref<MarketMicrostructureView | null>(null);
const microLoading = ref(false);
const range = ref<string>('1h');

const rangeMs = computed(
  () =>
    RANGE_OPTIONS.find((option) => option.value === range.value)?.ms ??
    DEFAULT_RANGE_MS,
);

/** Client-accumulated live mid samples appended to the price chart tail. */
interface LiveTailPoint {
  ts: number;
  yesMid: null | number;
  noMid: null | number;
}
const liveTail = ref<LiveTailPoint[]>([]);

const { block, canUpdate, setSubscription, unblock, UnblockModalHost } =
  useMarketActions();

// Live book (WS `market.book_update`) overrides the REST baseline once it lands.
const book = computed<MarketBookView | null>(() => {
  const id = marketId.value;
  return marketStore.books[id] ?? restBook.value;
});

const isLive = computed(() => Boolean(marketStore.books[marketId.value]));

const bookTimestampMs = computed<null | number>(() => {
  const timestamps = [
    book.value?.yes?.timestamp_ms,
    book.value?.no?.timestamp_ms,
  ].filter((value): value is number => value !== undefined);
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
});

const bookAgeMs = computed<null | number>(() => {
  return bookTimestampMs.value === null
    ? null
    : Date.now() - bookTimestampMs.value;
});

const fresh = computed(
  () => bookAgeMs.value !== null && bookAgeMs.value <= FRESH_THRESHOLD_MS,
);

/** Live KPI projection derived from the freshest book frame. */
const metrics = computed(() => {
  const yes = book.value?.yes ?? null;
  const no = book.value?.no ?? null;
  const yesMid = midPrice(yes);
  const noMid = midPrice(no);
  return {
    yesMid,
    noMid,
    sum: yesMid !== null && noMid !== null ? yesMid + noMid : null,
    yesBestBid: bestBid(yes),
    yesBestAsk: bestAsk(yes),
    spreadBps: spreadBps(yes),
    depthUsd: sideDepthUsd(yes) + sideDepthUsd(no),
    imbalance: imbalance(yes),
  };
});

async function loadMarket() {
  const id = marketId.value;
  if (!id) {
    return;
  }
  marketLoading.value = true;
  market.value = await handleRequest(() => getMarketById(id), { silent: true });
  restBook.value = await handleRequest(() => getMarketBook(id), {
    silent: true,
  });
  marketLoading.value = false;
}

function windowForRange(): { from: string; to: string } {
  const toMs = bookTimestampMs.value ?? Date.now();
  const fromMs = toMs - rangeMs.value;
  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
  };
}

async function loadMicrostructure() {
  const id = marketId.value;
  if (!id) {
    return;
  }
  microLoading.value = true;
  micro.value = await handleRequest(
    () => getMarketMicrostructure(id, windowForRange()),
    { silent: true },
  );
  microLoading.value = false;
}

async function subscribeAndLoad() {
  const id = marketId.value;
  if (!id) {
    return;
  }
  liveTail.value = [];
  qpWs.subscribeMarket(id);
  await loadMarket();
  await loadMicrostructure();
}

function teardown(id: string) {
  if (id) {
    qpWs.unsubscribeMarket(id);
  }
}

// Accumulate a live mid sample on every fresh book frame for the chart tail.
watch(
  () => book.value?.yes?.timestamp_ms ?? book.value?.no?.timestamp_ms ?? null,
  (ts) => {
    if (ts === null) {
      return;
    }
    liveTail.value.push({
      ts,
      yesMid: metrics.value.yesMid,
      noMid: metrics.value.noMid,
    });
    if (liveTail.value.length > LIVE_TAIL_CAP) {
      liveTail.value.splice(0, liveTail.value.length - LIVE_TAIL_CAP);
    }
  },
);

watch(range, () => void loadMicrostructure());

// Re-bootstrap when navigating between two market detail routes in place.
watch(marketId, (_next, prev) => {
  teardown(prev);
  void subscribeAndLoad();
});

function onToggleSubscription(next: boolean) {
  const target = market.value;
  if (!target) {
    return;
  }
  void setSubscription(target, next).then((ok) => {
    if (ok && market.value) {
      market.value = { ...market.value, subscribed: next };
    }
  });
}

function onBlock() {
  if (market.value) {
    void block(market.value);
  }
}

function onUnblock() {
  if (market.value) {
    unblock(market.value);
  }
}

function goBack() {
  void router.push('/trading/market-intelligence?module=overview');
}

onMounted(() => void subscribeAndLoad());
onUnmounted(() => teardown(marketId.value));
</script>

<template>
  <WorkspaceObjectStage
    v-model:open="inspectorOpen"
    :eyebrow="market?.question ? $t('page.menu.marketIntelligence') : undefined"
    :title="market?.question ?? $t('page.menu.marketIntelligence')"
  >
    <template v-if="market && canUpdate" #actions>
      <Button
        v-if="market.status !== 'manually_blocked'"
        danger
        @click="onBlock"
      >
        {{ $t('page.markets.actions.block') }}
      </Button>
      <Button v-else @click="onUnblock">
        {{ $t('page.markets.actions.unblock') }}
      </Button>
    </template>
    <Spin :spinning="marketLoading && !market">
      <div v-if="market" class="flex min-w-0 flex-col gap-4 pb-4">
        <MarketDetailHeader
          v-model:range="range"
          :range-options="RANGE_OPTIONS"
          :market="market"
          :live="isLive"
          :fresh="fresh"
          :book-age-ms="bookAgeMs"
          :can-update="canUpdate"
          @toggle-subscription="onToggleSubscription"
        />

        <LiveKpiStrip :metrics="metrics" :fresh="fresh" />

        <PriceHistoryChart
          :anchor-ts="bookTimestampMs"
          :loading="microLoading"
          :resolution="micro?.resolution"
          :yes="micro?.yes ?? []"
          :no="micro?.no ?? []"
          :trades="micro?.trades ?? []"
          :window-ms="rangeMs"
          :yes-token-id="market.yes_token_id"
          :live-tail="liveTail"
        />

        <div class="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <SpreadChart
            :loading="microLoading"
            :yes="micro?.yes ?? []"
            :no="micro?.no ?? []"
          />
          <DepthLiquidityChart
            :loading="microLoading"
            :yes="micro?.yes ?? []"
          />
          <ImbalanceChart
            :loading="microLoading"
            :yes="micro?.yes ?? []"
            :no="micro?.no ?? []"
          />
          <LiveDepthChart :book="book" />
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <OrderBookSide :side="book?.yes" />
          <OrderBookSide :side="book?.no" />
        </div>
      </div>
      <Empty v-else-if="!marketLoading" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
    </Spin>
    <UnblockModalHost />
  </WorkspaceObjectStage>
</template>
