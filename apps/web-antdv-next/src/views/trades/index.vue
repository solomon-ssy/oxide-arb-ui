<script lang="ts" setup>
import type { RiskAuditEventView, TradeView, UuidString } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Alert, TabPane, Tabs } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchTradeDecisions, fetchTradePage } from '#/api/trades';
import { $t } from '#/locales';
import OpportunityAuditDrawer from '#/shared/components/opportunity-audit-drawer.vue';
import { rangeToWindow } from '#/shared/composables/use-time-range-query';
import { useTradeStore } from '#/store';

import {
  useDecisionColumns,
  useDecisionSearchSchema,
  useTradeColumns,
  useTradeSearchSchema,
} from './modules/schemas';
import TradeDetailDrawer from './modules/widgets/trade-detail-drawer.vue';

defineOptions({ name: 'TradesPage' });

const activeTab = ref('trades');
const tradeStore = useTradeStore();

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: TradeDetailDrawer,
});
const [AuditDrawer, auditDrawerApi] = useVbenDrawer({
  connectedComponent: OpportunityAuditDrawer,
});

function onTradeAction({ code, row }: OnActionClickParams<TradeView>) {
  if (code === 'detail') {
    detailDrawerApi.setData({ tradeId: row.trade_id }).open();
  }
}

function onDecisionAction({
  code,
  row,
}: OnActionClickParams<RiskAuditEventView>) {
  if (code === 'audit' && row.opportunity_id) {
    auditDrawerApi
      .setData({ opportunityId: row.opportunity_id as UuidString })
      .open();
  }
}

/** Newest trade id of the page currently rendered in the grid. */
const pageHeadTradeId = ref<null | UuidString>(null);

const [TradeGrid, tradeGridApi] = useVbenVxeGrid<TradeView>({
  formOptions: {
    schema: useTradeSearchSchema(),
    submitOnChange: false,
  },
  gridOptions: {
    columns: useTradeColumns(onTradeAction),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          const { range: _range, ...rest } = formValues ?? {};
          const result = await fetchTradePage({
            page: page.currentPage,
            size: page.pageSize,
            ...rest,
            ...rangeToWindow(formValues ?? {}),
          });
          if (page.currentPage === 1) {
            pageHeadTradeId.value = result.items[0]?.trade_id ?? null;
          }
          return result;
        },
      },
    },
    rowConfig: { keyField: 'trade_id' },
    toolbarConfig: { refresh: { code: 'query' }, search: true },
  },
});

/** WS pushes ahead of the rendered first page → "N new trades" banner. */
const newTradeCount = computed(() => {
  const head = pageHeadTradeId.value;
  if (tradeStore.recent.length === 0) {
    return 0;
  }
  if (!head) {
    return tradeStore.recent.length;
  }
  const index = tradeStore.recent.findIndex((t) => t.trade_id === head);
  return index === -1 ? tradeStore.recent.length : index;
});

async function refreshTrades() {
  await tradeGridApi.query();
}

const [DecisionGrid] = useVbenVxeGrid<RiskAuditEventView>({
  formOptions: {
    schema: useDecisionSearchSchema(),
    submitOnChange: false,
  },
  gridOptions: {
    columns: useDecisionColumns(onDecisionAction),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) =>
          fetchTradeDecisions({
            page: page.currentPage,
            size: page.pageSize,
            ...rangeToWindow(formValues ?? {}),
          }),
      },
    },
    // No stable wire id on audit rows — let vxe assign internal row keys.
    toolbarConfig: { refresh: { code: 'query' }, search: true },
  },
});
</script>

<template>
  <Page auto-content-height>
    <Tabs v-model:active-key="activeTab" class="h-full">
      <TabPane key="trades" :tab="$t('page.trades.tabs.list')">
        <Alert
          v-if="newTradeCount > 0"
          class="mb-2 cursor-pointer"
          show-icon
          type="info"
          @click="refreshTrades"
        >
          <template #message>
            {{ $t('page.trades.newTrades', { count: newTradeCount }) }}
          </template>
        </Alert>
        <TradeGrid />
      </TabPane>
      <TabPane key="decisions" :tab="$t('page.trades.tabs.decisions')">
        <DecisionGrid />
      </TabPane>
    </Tabs>
    <DetailDrawer />
    <AuditDrawer />
  </Page>
</template>
