<script lang="ts" setup>
import type { MarketView } from '@vben/types';

import type { MarketRow } from './modules/schemas/table-columns';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { MARKET_CATEGORY_UNKNOWN_FILTER } from '@vben/types';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchMarketPage } from '#/api/markets';
import { $t } from '#/locales';
import { useMarketStore } from '#/store';

import { useMarketSearchSchema } from './modules/schemas/search-form';
import { useMarketColumns } from './modules/schemas/table-columns';
import { useMarketActions } from './modules/use-market-actions';
import MarketDetailDrawer from './modules/widgets/market-detail-drawer.vue';

defineOptions({ name: 'MarketsPage' });

const { handleRequest } = useRequestHandler();
const marketStore = useMarketStore();

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: MarketDetailDrawer,
  destroyOnClose: true,
});

const { block, canUpdate, setSubscription, unblock, UnblockModalHost } =
  useMarketActions(() => {
    void gridApi.query();
  });

const emptyPage = {
  has_next: false,
  items: [] as MarketRow[],
  page: 1,
  size: 0,
  total: 0,
};

const columns = computed(() =>
  useMarketColumns(onActionClick, canUpdate, setSubscription),
);

const [Grid, gridApi] = useVbenVxeGrid<MarketRow>({
  formOptions: {
    schema: useMarketSearchSchema(),
  },
  gridOptions: {
    columns: columns.value,
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const subscribed =
            formValues.subscribed === undefined || formValues.subscribed === ''
              ? undefined
              : formValues.subscribed === 'true';
          const categoryValue = formValues.category as string | undefined;
          const categoryUnknown =
            categoryValue === MARKET_CATEGORY_UNKNOWN_FILTER ? true : undefined;
          const result = await handleRequest(() =>
            fetchMarketPage({
              category:
                categoryUnknown || !categoryValue
                  ? undefined
                  : (categoryValue as any),
              category_unknown: categoryUnknown,
              event_id:
                (formValues.event_id as string | undefined) || undefined,
              keyword: (formValues.keyword as string | undefined) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              status: formValues.status as any,
              subscribed,
            }),
          );
          if (!result) {
            return emptyPage;
          }
          const items = result.items.map((row) => ({
            ...row,
            _resolved:
              row.resolved_at !== null ||
              marketStore.resolved.has(row.market_id),
          })) satisfies MarketRow[];
          return { ...result, items };
        },
      },
    },
    rowConfig: { keyField: 'market_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

watch(columns, (next) => gridApi.setGridOptions({ columns: next }));

// A market resolving live marks its row without a full re-render race; refetch
// so the resolved overlay + status converge from the authoritative REST view.
watch(
  () => marketStore.resolved.size,
  () => void gridApi.query(),
);

function openDetail(row: MarketView) {
  detailDrawerApi.setData({ market: row }).open();
}

function onActionClick({ code, row }: OnActionClickParams<MarketRow>) {
  switch (code) {
    case 'block': {
      void block(row);
      break;
    }
    case 'detail': {
      openDetail(row);
      break;
    }
    case 'unblock': {
      unblock(row);
      break;
    }
    // No default
  }
}
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.markets.title')" />
    <DetailDrawer />
    <UnblockModalHost />
  </Page>
</template>
