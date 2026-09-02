<script lang="ts" setup>
import type { PositionView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getPosition, listPositions } from '#/api/positions';
import { $t } from '#/locales';
import { useWorkspaceInspectorRoute } from '#/shared/composables/use-workspace-inspector-route';
import { useExecutionOrderStore, useSettlementRedeemStore } from '#/store';

import PositionDetailDrawer from './modules/position-detail-drawer.vue';
import { usePositionColumns, usePositionSearchSchema } from './modules/schemas';

defineOptions({ name: 'PositionsPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const executionOrderStore = useExecutionOrderStore();
const settlementRedeemStore = useSettlementRedeemStore();

const query = route.query;
const initialFilters = {
  market_id: (query.market_id as string) || undefined,
  order_intent_id: (query.order_intent_id as string) || undefined,
  state: (query.state as string) || undefined,
  token_id: (query.token_id as string) || undefined,
};

const emptyPage = {
  has_next: false,
  items: [] as PositionView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: PositionDetailDrawer,
  destroyOnClose: true,
  onOpenChange: (open) => onInspectorOpenChange(open),
});

const [Grid, gridApi] = useVbenVxeGrid<PositionView>({
  formOptions: {
    schema: usePositionSearchSchema(initialFilters),
  },
  gridOptions: {
    columns: usePositionColumns(onActionClick),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listPositions({
              from: (range[0] as string | undefined) || undefined,
              market_id:
                (formValues.market_id as string | undefined) || undefined,
              order_intent_id:
                (formValues.order_intent_id as string | undefined) || undefined,
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
    rowConfig: { keyField: 'strategy_position_lot_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function onActionClick({ code, row }: OnActionClickParams<PositionView>) {
  if (code === 'detail') {
    openInspector(row.strategy_position_lot_id);
  }
}

const { onInspectorOpenChange, openInspector } = useWorkspaceInspectorRoute({
  close: () => drawerApi.close?.(),
  entity: 'position',
  fetch: (id) => getPosition(id),
  open: (detail) => drawerApi.setData({ position: detail }).open(),
});

// Order fills/exits and settlement redemption independently invalidate positions.
watch(
  () => [executionOrderStore.revision, settlementRedeemStore.revision],
  () => void gridApi.query(),
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.quantPositions.listTitle')" />
    <Drawer />
  </Page>
</template>
