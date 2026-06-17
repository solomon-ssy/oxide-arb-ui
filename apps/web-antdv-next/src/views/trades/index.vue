<script lang="ts" setup>
import type { RiskAuditEventView, TradeView, UuidString } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, onActivated, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { Alert, Badge, message, TabPane, Tabs } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  fetchReconciliationQueue,
  fetchTradeDecisions,
  fetchTradePage,
  reconcileTrade,
} from '#/api/trades';
import { $t } from '#/locales';
import OpportunityAuditDrawer from '#/shared/components/opportunity-audit-drawer.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import {
  clearRouteTimeWindow,
  readRouteTimeWindow,
} from '#/shared/composables/use-route-time-window';
import { rangeToWindow } from '#/shared/composables/use-time-range-query';
import { useTradesPageTab } from '#/shared/composables/use-trades-page-tab';
import { useSystemStore, useTradeStore } from '#/store';

import {
  RECONCILE_UNRESOLVABLE,
  useDecisionColumns,
  useDecisionSearchSchema,
  useReconciliationColumns,
  useTradeColumns,
  useTradeSearchSchema,
} from './modules/schemas';
import TradeDetailDrawer from './modules/widgets/trade-detail-drawer.vue';

defineOptions({ name: 'TradesPage' });

const route = useRoute();
const router = useRouter();
const { activeTab, syncTabOnEnter } = useTradesPageTab();
const tradeRouteSeedBanner = ref<null | string>(null);

const systemStore = useSystemStore();
const tradeStore = useTradeStore();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useOxideAccess();

const canReconcile = computed(() => hasAccessByCodes(['trade:update']));
const reconcileBadgeCount = computed(
  () => systemStore.balance?.needs_reconcile_count ?? 0,
);

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: TradeDetailDrawer,
});
const [AuditDrawer, auditDrawerApi] = useVbenDrawer({
  connectedComponent: OpportunityAuditDrawer,
});

function openTradeDetail(tradeId: UuidString) {
  detailDrawerApi.setData({ tradeId }).open();
}

function onTradeAction({ code, row }: OnActionClickParams<TradeView>) {
  if (code === 'detail') {
    openTradeDetail(row.trade_id);
  }
}

async function onReconcileAction({
  code,
  row,
}: OnActionClickParams<TradeView>) {
  if (code === 'detail') {
    openTradeDetail(row.trade_id);
    return;
  }
  if (code !== 'reconcile' || !canReconcile.value) {
    return;
  }
  const result = await governed(
    (ctx) =>
      reconcileTrade(
        row.trade_id,
        { note: ctx.reason, resolution: RECONCILE_UNRESOLVABLE },
        ctx,
      ),
    {
      confirmWord: 'unresolvable',
      danger: true,
      summary: $t('page.trades.reconcile.summary', {
        market: row.market_id,
        resolution: $t(
          `enum.tradeReconcileResolution.${RECONCILE_UNRESOLVABLE}`,
        ),
      }),
      title: $t('page.trades.reconcile.title'),
    },
  );
  if (result !== null) {
    message.success($t('page.trades.reconcile.submitted'));
    await reconGridApi.query();
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

const [ReconGrid, reconGridApi] = useVbenVxeGrid<TradeView>({
  gridOptions: {
    columns: useReconciliationColumns(onReconcileAction),
    proxyConfig: {
      ajax: {
        query: async ({
          page,
        }: {
          page: { currentPage: number; pageSize: number };
        }) =>
          fetchReconciliationQueue({
            page: page.currentPage,
            size: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'trade_id' },
    toolbarConfig: { refresh: { code: 'query' } },
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

async function applyRouteSeed() {
  const seed = readRouteTimeWindow(route.query);
  if (!seed) {
    return;
  }
  const executionMode = route.query.execution_mode;
  await tradeGridApi.formApi.setValues({
    range: seed.range,
    ...(typeof executionMode === 'string'
      ? { execution_mode: executionMode }
      : {}),
  });
  await tradeGridApi.query();
  tradeRouteSeedBanner.value = $t('page.trades.routeSeed.active', {
    from: seed.range[0].format('YYYY-MM-DD'),
    to: seed.range[1].format('YYYY-MM-DD'),
  });
  clearRouteTimeWindow(router, ['execution_mode']);
}

function dismissRouteSeedBanner() {
  tradeRouteSeedBanner.value = null;
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
    toolbarConfig: { refresh: { code: 'query' }, search: true },
  },
});

function onTabEnter() {
  syncTabOnEnter();
}

watch(
  () => tradeStore.recent[0],
  (trade) => {
    if (activeTab.value === 'reconciliation' && trade?.needs_reconcile) {
      void reconGridApi.query();
    }
  },
);

watch(activeTab, (tab) => {
  if (tab === 'reconciliation') {
    void reconGridApi.query();
  }
});

onMounted(() => {
  onTabEnter();
  void applyRouteSeed();
});

onActivated(() => {
  onTabEnter();
});
</script>

<template>
  <Page auto-content-height>
    <Tabs v-model:active-key="activeTab" class="h-full">
      <TabPane key="trades" :tab="$t('page.trades.tabs.list')">
        <Alert
          v-if="tradeRouteSeedBanner"
          class="mb-2"
          closable
          show-icon
          type="info"
          @close="dismissRouteSeedBanner"
        >
          <template #message>{{ tradeRouteSeedBanner }}</template>
        </Alert>
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
      <TabPane key="reconciliation">
        <template #tab>
          <Badge
            :count="reconcileBadgeCount"
            :offset="[6, 0]"
            :show-zero="false"
          >
            <span>{{ $t('page.trades.tabs.reconciliation') }}</span>
          </Badge>
        </template>
        <ReconGrid />
      </TabPane>
    </Tabs>
    <DetailDrawer />
    <AuditDrawer />
  </Page>
</template>
