<script lang="ts" setup>
import type { SettlementRedeemView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getSettlementRedeem,
  listSettlementRedeems,
} from '#/api/settlement-redeems';
import { $t } from '#/locales';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';

import {
  useSettlementRedeemColumns,
  useSettlementRedeemSearchSchema,
} from './modules/schemas';
import SettlementRedeemDetailDrawer from './modules/settlement-redeem-detail-drawer.vue';

defineOptions({ name: 'SettlementRedeemsPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();

const query = route.query;
const initialFilters = {
  market_id: (query.market_id as string) || undefined,
};

const emptyPage = {
  has_next: false,
  items: [] as SettlementRedeemView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: SettlementRedeemDetailDrawer,
  destroyOnClose: true,
});

const [Grid] = useVbenVxeGrid<SettlementRedeemView>({
  formOptions: {
    schema: useSettlementRedeemSearchSchema(initialFilters),
  },
  gridOptions: {
    columns: useSettlementRedeemColumns(onActionClick),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listSettlementRedeems({
              from: (range[0] as string | undefined) || undefined,
              market_id:
                (formValues.market_id as string | undefined) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              state: (formValues.state as any) || undefined,
              to: (range[1] as string | undefined) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'settlement_redeem_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function onActionClick({
  code,
  row,
}: OnActionClickParams<SettlementRedeemView>) {
  if (code === 'detail') {
    drawerApi.setData({ redeem: row }).open();
  }
}

// Deep-link `?open=<id>` reactively opens the detail drawer for that batch.
useQueryOpenDrawer({
  fetch: (id) => getSettlementRedeem(id),
  open: (redeem) => drawerApi.setData({ redeem }).open(),
});
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.quantSettlementRedeems.listTitle')" />
    <Drawer />
  </Page>
</template>
