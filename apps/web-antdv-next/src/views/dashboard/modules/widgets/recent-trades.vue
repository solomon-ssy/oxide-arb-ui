<script lang="ts" setup>
import type { TradeView } from '@vben/types';

import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/hooks';
import { SIDES } from '@vben/types';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchTradePage } from '#/api/trades';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { formatShares } from '#/shared/components/format';
import { useTradeStore } from '#/store';

defineOptions({ name: 'DashboardRecentTrades' });

const PAGE_SIZE = 10;

const router = useRouter();
const tradeStore = useTradeStore();
const { handleRequest } = useRequestHandler();

const [Grid, gridApi] = useVbenVxeGrid<TradeView>({
  gridOptions: {
    columns: [
      {
        cellRender: { name: 'CellDateTime' },
        field: 'created_at',
        title: $t('page.dashboard.trades.time'),
        width: 170,
      },
      {
        cellRender: { name: 'CellMarketId' },
        field: 'market_id',
        minWidth: 140,
        title: $t('page.dashboard.trades.market'),
      },
      {
        cellRender: {
          name: 'CellTag',
          options: [
            {
              color: 'success',
              label: $t('enum.side.BUY'),
              value: SIDES.buy,
            },
            {
              color: 'error',
              label: $t('enum.side.SELL'),
              value: SIDES.sell,
            },
          ],
        },
        field: 'side',
        title: $t('page.dashboard.trades.side'),
        width: 80,
      },
      {
        field: 'shares',
        formatter: ({ cellValue }: { cellValue: string }) =>
          formatShares(cellValue),
        title: $t('page.dashboard.trades.shares'),
        width: 110,
      },
      {
        cellRender: { name: 'CellPrice' },
        field: 'price',
        title: $t('page.dashboard.trades.price'),
        width: 100,
      },
      {
        cellRender: { name: 'CellUsd' },
        field: 'net_profit_usd',
        title: $t('page.dashboard.trades.pnl'),
        width: 120,
      },
      {
        cellRender: {
          name: 'CellTag',
          options: [
            {
              color: 'success',
              label: $t('enum.tradeOutcome.success'),
              value: 'success',
            },
            {
              color: 'warning',
              label: $t('enum.tradeOutcome.miss'),
              value: 'miss',
            },
            {
              color: 'error',
              label: $t('enum.tradeOutcome.failed'),
              value: 'failed',
            },
          ],
        },
        field: 'business_outcome',
        title: $t('page.dashboard.trades.outcome'),
        width: 100,
      },
    ],
    data: [],
    maxHeight: 360,
    pagerConfig: { enabled: false },
    rowConfig: { keyField: 'trade_id' },
    toolbarConfig: { enabled: false },
  },
});

onMounted(async () => {
  await handleRequest(
    () => fetchTradePage({ page: 1, size: PAGE_SIZE }),
    (page) => tradeStore.setRecent(page.items),
  );
});

watch(
  () => tradeStore.recent,
  (rows) => {
    gridApi.setGridOptions({ data: rows.slice(0, PAGE_SIZE) });
  },
  { deep: true, immediate: true },
);

function goTrades() {
  router.push('/trades');
}
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:arrow-left-right"
    tone="cyan"
    :title="$t('page.dashboard.trades.title')"
  >
    <template #extra>
      <a class="cursor-pointer text-xs" @click="goTrades">
        {{ $t('page.dashboard.trades.toTrades') }}
      </a>
    </template>
    <Grid />
  </DashboardPanel>
</template>
