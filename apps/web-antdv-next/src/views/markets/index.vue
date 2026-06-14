<script lang="ts" setup>
import type { MarketView } from '@vben/types';

import type {
  OnActionClickParams,
  VxeGridListeners,
} from '#/adapter/vxe-table';

import { watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  fetchMarketPage,
  subscribeMarket,
  unsubscribeMarket,
} from '#/api/markets';
import { $t } from '#/locales';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useMarketStore } from '#/store';

import { useColumns, useSearchFormSchema } from './modules/schemas';
import MarketDetailDrawer from './modules/widgets/market-detail-drawer.vue';

defineOptions({ name: 'MarketsPage' });

const { hasAccessByCodes } = useOxideAccess();
const { handleRequest } = useRequestHandler();
const marketStore = useMarketStore();

const canToggleSubscription = hasAccessByCodes(['market:update']);

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: MarketDetailDrawer,
});

/** CellSwitch beforeChange: call the API first, only flip on success. */
async function onSubscribeToggle(
  checked: boolean,
  row: MarketView,
): Promise<boolean | undefined> {
  let succeeded = false;
  await handleRequest(
    () =>
      checked
        ? subscribeMarket(row.market_id)
        : unsubscribeMarket(row.market_id),
    {
      onSuccess: () => {
        succeeded = true;
        void gridApi.query();
      },
    },
  );
  return succeeded ? undefined : false;
}

function openDetailDrawer(row: MarketView) {
  detailDrawerApi
    .setData({ marketId: row.market_id })
    .setState({ title: $t('page.markets.detail.title') })
    .open();
}

function onActionClick({ code, row }: OnActionClickParams<MarketView>) {
  if (code === 'detail') {
    openDetailDrawer(row);
  }
}

/** Skip interactive columns so copy/switches/row actions do not open the drawer. */
const DETAIL_SKIP_COLUMNS = new Set(['market_id', 'operation', 'subscribed']);

const gridEvents: VxeGridListeners<MarketView> = {
  cellClick: ({ column, row }) => {
    if (DETAIL_SKIP_COLUMNS.has(column.field)) {
      return;
    }
    openDetailDrawer(row);
  },
};

const [Grid, gridApi] = useVbenVxeGrid<MarketView>({
  formOptions: {
    schema: useSearchFormSchema(),
    submitOnChange: false,
  },
  gridEvents,
  gridOptions: {
    columns: useColumns(
      onActionClick,
      onSubscribeToggle,
      canToggleSubscription,
    ),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) =>
          fetchMarketPage({
            page: page.currentPage,
            size: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'market_id' },
    toolbarConfig: { refresh: { code: 'query' }, search: true },
  },
});

// `market.resolved` pushes refresh the visible rows' status tags.
watch(
  () => marketStore.resolved.size,
  () => {
    void gridApi.query();
  },
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.markets.title')" />
    <DetailDrawer />
  </Page>
</template>
