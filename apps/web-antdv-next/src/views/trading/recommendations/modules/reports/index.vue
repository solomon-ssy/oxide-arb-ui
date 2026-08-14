<script lang="ts" setup>
import type { QuantReportView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { defineAsyncComponent, nextTick, ref, watch } from 'vue';
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
const ReportDetail = defineAsyncComponent(() => import('./detail/index.vue'));

const [RunDrawer, runDrawerApi] = useVbenDrawer({
  connectedComponent: ReportRunDrawer,
  destroyOnClose: true,
});

const { canRun, openRunReport, RunReportModalHost } = useRunReportAction();
const { canRevoke, revoke } = useReportActions(() => {
  void refreshReportGrid();
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
              route: (formValues.route as any) || undefined,
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
  void router.push({
    path: '/trading/recommendations',
    query: { entity: 'report', id, module: 'reports' },
  });
}

function openRun(id: string) {
  activeTab.value = 'operations';
  void router.push({
    path: '/trading/recommendations',
    query: { ...route.query, entity: 'report-run', id, module: 'reports' },
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

async function refreshReportGrid() {
  if (activeTab.value !== 'reports') return;
  await nextTick();
  if (activeTab.value !== 'reports') return;
  await gridApi.query();
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
    void refreshReportGrid();
  },
);

watch(activeTab, (tab) => {
  if (tab === 'reports') void refreshReportGrid();
});

watch(
  () => [route.query.entity, route.query.id] as const,
  async ([entity, id]) => {
    if (entity !== 'report-run' || typeof id !== 'string' || !id) return;
    activeTab.value = 'operations';
    await nextTick();
    if (route.query.entity !== 'report-run' || route.query.id !== id) return;
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
            <Button
              v-if="canRun"
              data-testid="run-report-open"
              type="primary"
              @click="openRunReport"
            >
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
    <ReportDetail />
  </Page>
</template>
