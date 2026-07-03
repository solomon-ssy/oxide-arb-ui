<script lang="ts" setup>
import type { ExecutionOrderView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getExecutionOrder, listExecutionOrders } from '#/api/execution-orders';
import { $t } from '#/locales';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useOrderIntentStore } from '#/store';

import ExecutionOrderDetailDrawer from './modules/execution-order-detail-drawer.vue';
import {
  useExecutionOrderColumns,
  useExecutionOrderSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ExecutionOrdersPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const orderIntentStore = useOrderIntentStore();

const query = route.query;
const initialFilters = {
  market_id: (query.market_id as string) || undefined,
  order_intent_id: (query.order_intent_id as string) || undefined,
  state: (query.state as string) || undefined,
  token_id: (query.token_id as string) || undefined,
};

const emptyPage = {
  has_next: false,
  items: [] as ExecutionOrderView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ExecutionOrderDetailDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<ExecutionOrderView>({
  formOptions: {
    schema: useExecutionOrderSearchSchema(initialFilters),
  },
  gridOptions: {
    columns: useExecutionOrderColumns(onActionClick),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listExecutionOrders({
              from: (range[0] as string | undefined) || undefined,
              market_id:
                (formValues.market_id as string | undefined) || undefined,
              order_intent_id:
                (formValues.order_intent_id as string | undefined) || undefined,
              order_phase: (formValues.order_phase as any) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              state: (formValues.state as any) || undefined,
              to: (range[1] as string | undefined) || undefined,
              token_id:
                (formValues.token_id as string | undefined) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'execution_order_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function onActionClick({ code, row }: OnActionClickParams<ExecutionOrderView>) {
  if (code === 'detail') {
    drawerApi.setData({ order: row }).open();
  }
}

// Deep-link `?open=<id>` reactively opens the detail drawer for that order.
useQueryOpenDrawer({
  fetch: (id) => getExecutionOrder(id),
  open: (order) => drawerApi.setData({ order }).open(),
});

// Submission completes over `quant.intent`; refresh the ledger on any bump.
watch(
  () => orderIntentStore.revision,
  () => void gridApi.query(),
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.quantExecutionOrders.listTitle')" />
    <Drawer />
  </Page>
</template>
