<script lang="ts" setup>
import type { OperationLogView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchOperationLogPage } from '#/api/operation-logs';
import { $t } from '#/locales';

import {
  useOperationLogColumns,
  useOperationLogSearchSchema,
} from './modules/schemas';
import OperationLogDetailDrawer from './modules/widgets/operation-log-detail-drawer.vue';

defineOptions({ name: 'OperationLogPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const activeModule = computed(() =>
  typeof route.query.module === 'string' ? route.query.module : 'operations',
);
const initialFilters = {
  category:
    activeModule.value === 'receipts'
      ? 'governance'
      : (route.query.category as string | undefined),
  resource_type: route.query.resource_type as string | undefined,
};
const tableTitle = computed(() => {
  if (activeModule.value === 'receipts') {
    return $t('page.commandPalette.module.receipts');
  }
  if (activeModule.value === 'entity-timeline') {
    return $t('page.commandPalette.module.entity-timeline');
  }
  return $t('page.operationLog.title');
});

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: OperationLogDetailDrawer,
  destroyOnClose: true,
});

const emptyPage = {
  has_next: false,
  items: [] as OperationLogView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<OperationLogView>({
  formOptions: {
    schema: useOperationLogSearchSchema(initialFilters),
  },
  gridOptions: {
    columns: useOperationLogColumns(onActionClick),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const result = await handleRequest(() =>
            fetchOperationLogPage({
              actor_user_id: formValues.actor_user_id as string | undefined,
              category: formValues.category as any,
              from: Array.isArray(formValues.occurred_at)
                ? (formValues.occurred_at[0] as string | undefined)
                : undefined,
              governance_audit_event_id: route.query
                .governance_audit_event_id as string | undefined,
              outcome: formValues.outcome as any,
              page: page.currentPage,
              request_id:
                (formValues.request_id as string | undefined) ??
                (route.query.request_id as string | undefined),
              resource_type: formValues.resource_type as any,
              size: page.pageSize,
              to: Array.isArray(formValues.occurred_at)
                ? (formValues.occurred_at[1] as string | undefined)
                : undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function onActionClick({ code, row }: OnActionClickParams<OperationLogView>) {
  if (code === 'detail') {
    detailDrawerApi.setData({ row }).open();
  }
}

watch(
  () => [
    route.query.governance_audit_event_id,
    route.query.governance_audit_sequence,
    route.query.request_id,
  ],
  () => {
    void gridApi.query();
  },
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="tableTitle" />
    <DetailDrawer />
  </Page>
</template>
