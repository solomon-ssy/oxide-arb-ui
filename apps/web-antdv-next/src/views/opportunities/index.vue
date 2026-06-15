<script lang="ts" setup>
import type {
  OpportunityFunnelView,
  OpportunityListView,
  OpportunityView,
  UuidString,
} from '@vben/types';

import type { FunnelStageRow } from './modules/schemas';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { OPPORTUNITY_AUDIT_STAGES } from '@vben/types';

import { TabPane, Tabs } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  fetchOpportunityHistory,
  fetchOpportunityStats,
  fetchRecentOpportunities,
} from '#/api/opportunities';
import { $t } from '#/locales';
import OpportunityAuditDrawer from '#/shared/components/opportunity-audit-drawer.vue';
import OpportunityFeed from '#/shared/components/opportunity-feed.vue';
import { rangeToWindow } from '#/shared/composables/use-time-range-query';

import {
  useDetectionColumns,
  useFunnelColumns,
  useFunnelSearchSchema,
  useHistorySearchSchema,
} from './modules/schemas';

defineOptions({ name: 'OpportunitiesPage' });

const activeTab = ref('recent');

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: OpportunityAuditDrawer,
});

function openAudit(opportunityId: UuidString) {
  drawerApi.setData({ opportunityId }).open();
}

function onFeedSelect(entry: OpportunityView) {
  openAudit(entry.opportunity_id);
}

function onDetectionAction({
  code,
  row,
}: OnActionClickParams<OpportunityListView>) {
  if (code === 'audit') {
    openAudit(row.opportunity_id);
  }
}

const [RecentGrid] = useVbenVxeGrid<OpportunityListView>({
  gridOptions: {
    columns: useDetectionColumns(onDetectionAction),
    proxyConfig: {
      ajax: {
        query: async ({
          page,
        }: {
          page: { currentPage: number; pageSize: number };
        }) =>
          fetchRecentOpportunities({
            page: page.currentPage,
            size: page.pageSize,
          }),
      },
    },
    rowConfig: { keyField: 'opportunity_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

const [HistoryGrid] = useVbenVxeGrid<OpportunityListView>({
  formOptions: {
    schema: useHistorySearchSchema(),
    submitOnChange: false,
  },
  gridOptions: {
    columns: useDetectionColumns(onDetectionAction),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          const { range: _range, ...rest } = formValues ?? {};
          return fetchOpportunityHistory({
            page: page.currentPage,
            size: page.pageSize,
            ...rest,
            ...rangeToWindow(formValues ?? {}),
          });
        },
      },
    },
    rowConfig: { keyField: 'opportunity_id' },
    toolbarConfig: { refresh: { code: 'query' }, search: true },
  },
});

/** Prefix the audit stages with the detection baseline as a synthetic row. */
function funnelRows(funnel: OpportunityFunnelView): FunnelStageRow[] {
  return [
    {
      count: funnel.total_detected,
      rate: funnel.total_detected > 0 ? '1' : null,
      stage: OPPORTUNITY_AUDIT_STAGES.detected,
    },
    ...funnel.stages.map((stage) => ({
      count: stage.count,
      rate: stage.rate,
      stage: stage.stage,
    })),
  ];
}

const [FunnelGrid] = useVbenVxeGrid<FunnelStageRow>({
  formOptions: {
    schema: useFunnelSearchSchema(),
    submitOnChange: false,
  },
  gridOptions: {
    columns: useFunnelColumns(),
    pagerConfig: { enabled: false },
    proxyConfig: {
      ajax: {
        query: async (_params: unknown, formValues: Record<string, any>) => {
          const funnel = await fetchOpportunityStats(
            rangeToWindow(formValues ?? {}),
          );
          const items = funnelRows(funnel);
          return { items, total: items.length };
        },
      },
    },
    rowConfig: { keyField: 'stage' },
    toolbarConfig: { refresh: { code: 'query' }, search: true },
  },
});
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col gap-4">
      <div class="h-72 shrink-0">
        <OpportunityFeed variant="full" @select="onFeedSelect" />
      </div>
      <Tabs v-model:active-key="activeTab" class="min-h-0 flex-1">
        <TabPane key="recent" :tab="$t('page.opportunities.tabs.recent')">
          <RecentGrid :table-title="$t('page.opportunities.tabs.recent')" />
        </TabPane>
        <TabPane key="history" :tab="$t('page.opportunities.tabs.history')">
          <HistoryGrid :table-title="$t('page.opportunities.tabs.history')" />
        </TabPane>
        <TabPane key="funnel" :tab="$t('page.opportunities.tabs.funnel')">
          <FunnelGrid :table-title="$t('page.opportunities.tabs.funnel')" />
        </TabPane>
      </Tabs>
    </div>
    <Drawer />
  </Page>
</template>
