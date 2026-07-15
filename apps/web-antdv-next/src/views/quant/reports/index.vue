<script lang="ts" setup>
import type { QuantReportView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message, TabPane, Tabs } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listQuantReports } from '#/api/quant-reports';
import { $t } from '#/locales';
import { useRunReportAction } from '#/shared/composables/use-run-report-action';
import { useQuantReportStore } from '#/store';

import { useReportColumns, useReportSearchSchema } from './modules/schemas';
import { useReportActions } from './modules/use-report-actions';
import ReportOperationsWorkspace from './modules/widgets/report-operations-workspace.vue';
import ReportRunDrawer from './modules/widgets/report-run-drawer.vue';

defineOptions({ name: 'QuantReportsPage' });

const router = useRouter();
const route = useRoute();
const { handleRequest } = useRequestHandler();
const quantReportStore = useQuantReportStore();
const activeTab = ref('reports');

const [RunDrawer, runDrawerApi] = useVbenDrawer({
  connectedComponent: ReportRunDrawer,
  destroyOnClose: true,
});

const { canRun, openRunReport, RunReportModalHost } = useRunReportAction();
const { canRevoke, revoke } = useReportActions(() => {
  void gridApi.query();
});

const emptyPage = {
  has_next: false,
  items: [] as QuantReportView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<QuantReportView>({
  formOptions: {
    schema: useReportSearchSchema(),
  },
  gridOptions: {
    columns: useReportColumns(onActionClick, canRevoke),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listQuantReports({
              from: (range[0] as string | undefined) || undefined,
              kind: (formValues.kind as any) || undefined,
              page: page.currentPage,
              profile_id: (formValues.profile_id as string) || undefined,
              runtime_mode: (formValues.runtime_mode as any) || undefined,
              size: page.pageSize,
              status: (formValues.status as any) || undefined,
              to: (range[1] as string | undefined) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'recommendation_report_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function openDetail(id: string) {
  void router.push(`/quant/reports/${id}`);
}

function openRun(id: string) {
  activeTab.value = 'operations';
  void router.push({
    path: '/quant/reports',
    query: { ...route.query, run_id: id },
  });
}

function onActionClick({ code, row }: OnActionClickParams<QuantReportView>) {
  switch (code) {
    case 'detail': {
      openDetail(row.recommendation_report_id);
      break;
    }
    case 'revoke': {
      void revoke(row);
      break;
    }
    // No default
  }
}

// WS `quant.report` frames are revision hints only. Re-fetch the durable list
// and surface the committed artifact id; no build state is inferred from WS.
watch(
  () => quantReportStore.revision,
  () => {
    const event = quantReportStore.lastEvent;
    if (event) {
      message.info(
        $t(`page.quantReports.wsToast.${event.event}`, {
          id: event.recommendation_report_id,
        }),
      );
    }
    void gridApi.query();
  },
);

watch(
  () => route.query.run_id,
  async (id) => {
    if (typeof id !== 'string' || !id) return;
    activeTab.value = 'operations';
    await nextTick();
    if (route.query.run_id !== id) return;
    runDrawerApi.setData({ runId: id }).open();
  },
  { immediate: true },
);
</script>

<template>
  <Page auto-content-height data-testid="reports-workspace">
    <Tabs v-model:active-key="activeTab" destroy-on-hidden>
      <TabPane key="reports" :tab="$t('page.quantReports.tabs.reports')">
        <Grid :table-title="$t('page.quantReports.listTitle')">
          <template #toolbar-tools>
            <Button v-if="canRun" type="primary" @click="openRunReport">
              {{ $t('page.quantReports.run.title') }}
            </Button>
          </template>
        </Grid>
      </TabPane>
      <TabPane key="operations" :tab="$t('page.quantReports.tabs.operations')">
        <ReportOperationsWorkspace @open-run="openRun" />
      </TabPane>
    </Tabs>
    <RunReportModalHost />
    <RunDrawer />
  </Page>
</template>
