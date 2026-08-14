<script lang="ts" setup>
import type { ReconciliationView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Segmented } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getReconciliation, listReconciliations } from '#/api/reconciliations';
import { $t } from '#/locales';
import { useWorkspaceInspectorRoute } from '#/shared/composables/use-workspace-inspector-route';
import { useOrderIntentStore, useReconciliationStore } from '#/store';

import ReconciliationDetailDrawer from './modules/reconciliation-detail-drawer.vue';
import {
  useReconciliationColumns,
  useReconciliationSearchSchema,
} from './modules/schemas';
import { useReconciliationActions } from './modules/use-reconciliation-actions';

defineOptions({ name: 'ReconciliationsPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const orderIntentStore = useOrderIntentStore();
const reconciliationStore = useReconciliationStore();

const query = route.query;
const initialFilters = {
  execution_order_id: (query.execution_order_id as string) || undefined,
  order_intent_id: (query.order_intent_id as string) || undefined,
};

const { canResolve, resolve } = useReconciliationActions(
  () => void gridApi.query(),
);

/** Triage toggle: unresolved queue (default) / resolved / all. */
type ResolvedFilter = 'all' | 'resolved' | 'unresolved';
const resolvedFilter = ref<ResolvedFilter>('unresolved');
const resolvedOptions = [
  {
    label: $t('page.quantReconciliations.queue.unresolved'),
    value: 'unresolved',
  },
  { label: $t('page.quantReconciliations.queue.resolved'), value: 'resolved' },
  { label: $t('page.quantReconciliations.queue.all'), value: 'all' },
];

function resolvedFlag(): boolean | undefined {
  if (resolvedFilter.value === 'resolved') {
    return true;
  }
  if (resolvedFilter.value === 'unresolved') {
    return false;
  }
  return undefined;
}

const emptyPage = {
  has_next: false,
  items: [] as ReconciliationView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ReconciliationDetailDrawer,
  destroyOnClose: true,
  onOpenChange: (open) => onInspectorOpenChange(open),
});

const [Grid, gridApi] = useVbenVxeGrid<ReconciliationView>({
  formOptions: {
    schema: useReconciliationSearchSchema(initialFilters),
  },
  gridOptions: {
    columns: useReconciliationColumns(onActionClick, canResolve),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listReconciliations({
              execution_order_id:
                (formValues.execution_order_id as string | undefined) ||
                undefined,
              from: (range[0] as string | undefined) || undefined,
              order_intent_id:
                (formValues.order_intent_id as string | undefined) || undefined,
              page: page.currentPage,
              resolved: resolvedFlag(),
              result: (formValues.result as any) || undefined,
              size: page.pageSize,
              to: (range[1] as string | undefined) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'reconciliation_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function onResolvedChange(value: number | string) {
  resolvedFilter.value = value as ResolvedFilter;
  void gridApi.query();
}

function onActionClick({ code, row }: OnActionClickParams<ReconciliationView>) {
  switch (code) {
    case 'detail': {
      openInspector(row.reconciliation_id);
      break;
    }
    case 'resolve': {
      void resolve(row);
      break;
    }
    // No default
  }
}

const { onInspectorOpenChange, openInspector } = useWorkspaceInspectorRoute({
  close: () => drawerApi.close?.(),
  entity: 'reconciliation',
  fetch: (id) => getReconciliation(id),
  open: (reconciliation) => drawerApi.setData({ reconciliation }).open(),
});

// Resolve completions (and submission-driven inflows) refresh the queue. The
// `quant.reconciliation` channel bumps the reconciliation store on worker
// detect/update; `quant.intent` covers submission-driven inflows.
watch(
  () => [orderIntentStore.revision, reconciliationStore.revision],
  () => void gridApi.query(),
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.quantReconciliations.listTitle')">
      <template #toolbar-tools>
        <Segmented
          :options="resolvedOptions"
          :value="resolvedFilter"
          @change="onResolvedChange"
        />
      </template>
    </Grid>
    <Drawer @resolved="() => void gridApi.query()" />
  </Page>
</template>
