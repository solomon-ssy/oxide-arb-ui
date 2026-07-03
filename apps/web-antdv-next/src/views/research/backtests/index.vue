<script lang="ts" setup>
import type { BacktestReportView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getBacktestReport, listBacktestReports } from '#/api/research';
import { $t } from '#/locales';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import BacktestDetailDrawer from './modules/backtest-detail-drawer.vue';
import {
  useBacktestReportColumns,
  useBacktestReportSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchBacktestsPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const researchStore = useResearchStore();

const initialFilters = {
  model_version_id: (route.query.model_version_id as string) || undefined,
};

const emptyPage = {
  has_next: false,
  items: [] as BacktestReportView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: BacktestDetailDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<BacktestReportView>({
  formOptions: { schema: useBacktestReportSearchSchema(initialFilters) },
  gridOptions: {
    columns: useBacktestReportColumns(onActionClick),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listBacktestReports({
              from: (range[0] as string | undefined) || undefined,
              model_version_id:
                (formValues.model_version_id as string | undefined) ||
                undefined,
              page: page.currentPage,
              size: page.pageSize,
              to: (range[1] as string | undefined) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'backtest_report_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function onActionClick({ code, row }: OnActionClickParams<BacktestReportView>) {
  if (code === 'detail') {
    drawerApi.setData({ report: row }).open();
  }
}

useQueryOpenDrawer({
  fetch: (id) => getBacktestReport(id),
  open: (report) => drawerApi.setData({ report }).open(),
});

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.backtests.listTitle')" />
    <Drawer />
  </Page>
</template>
