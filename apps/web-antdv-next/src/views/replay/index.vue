<script lang="ts" setup>
import type {
  ControlFactorMaterializationRunView,
  UuidString,
} from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchReplayPage } from '#/api/replay';

import { useReplayRunColumns, useReplaySearchSchema } from './modules/schemas';
import RunDetailDrawer from './modules/widgets/run-detail-drawer.vue';

defineOptions({ name: 'ReplayPage' });

const route = useRoute();
const router = useRouter();

function clearRunQuery() {
  if (!route.query.run_id) {
    return;
  }
  const nextQuery = { ...route.query };
  delete nextQuery.run_id;
  void router.replace({ path: route.path, query: nextQuery });
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ControlFactorMaterializationRunView>) {
  if (code === 'detail') {
    openDetail(row.materialization_run_id);
  }
}

const [Grid, gridApi] = useVbenVxeGrid<ControlFactorMaterializationRunView>({
  formOptions: {
    schema: useReplaySearchSchema(),
  },
  gridOptions: {
    columns: useReplayRunColumns(onActionClick),
    proxyConfig: {
      ajax: {
        query: async ({
          page,
          form,
        }: {
          form?: { status?: string };
          page: { currentPage: number; pageSize: number };
        }) =>
          fetchReplayPage({
            page: page.currentPage,
            size: page.pageSize,
            status: form?.status as
              | ControlFactorMaterializationRunView['status']
              | undefined,
          }),
      },
    },
    rowConfig: { keyField: 'materialization_run_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: RunDetailDrawer,
  destroyOnClose: true,
  onOpenChange(isOpen) {
    if (!isOpen) {
      clearRunQuery();
      void gridApi.query();
    }
  },
});

function openDetail(runId: UuidString) {
  drawerApi.setData({ runId }).open();
  void router.replace({
    path: route.path,
    query: { ...route.query, run_id: runId },
  });
}

onMounted(() => {
  const runId = route.query.run_id;
  if (typeof runId === 'string' && runId.length > 0) {
    openDetail(runId);
  }
});
</script>

<template>
  <Page auto-content-height>
    <Grid />
    <Drawer />
  </Page>
</template>
