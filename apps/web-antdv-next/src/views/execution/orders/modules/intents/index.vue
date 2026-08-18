<script lang="ts" setup>
import type { OrderIntentView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOrderIntent, listOrderIntents } from '#/api/order-intents';
import { $t } from '#/locales';
import { useWorkspaceInspectorRoute } from '#/shared/composables/use-workspace-inspector-route';
import { useOrderIntentStore } from '#/store';

import IntentDetailDrawer from './modules/intent-detail-drawer.vue';
import { useIntentColumns, useIntentSearchSchema } from './modules/schemas';
import { useIntentActions } from './modules/use-intent-actions';

defineOptions({ name: 'OrderIntentsPage' });

const { handleRequest } = useRequestHandler();
const route = useRoute();
const orderIntentStore = useOrderIntentStore();
const approvalQueue = computed(() => route.query.module === 'approvals');

const { approve, canApprove, canCancel, canReject, cancel, reject } =
  useIntentActions(() => void gridApi.query());

const emptyPage = {
  has_next: false,
  items: [] as OrderIntentView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<OrderIntentView>({
  formOptions: {
    schema: useIntentSearchSchema({
      approval_status: approvalQueue.value ? 'pending' : undefined,
    }),
  },
  gridOptions: {
    columns: useIntentColumns(onActionClick, {
      canApprove,
      canCancel,
      canReject,
    }),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listOrderIntents({
              approval_status: (formValues.approval_status as any) || undefined,
              from: (range[0] as string | undefined) || undefined,
              page: page.currentPage,
              recommendation_id:
                (formValues.recommendation_id as string | undefined) ||
                undefined,
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
    rowConfig: { keyField: 'order_intent_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function onActionClick({ code, row }: OnActionClickParams<OrderIntentView>) {
  switch (code) {
    case 'approve': {
      void approve(row);
      break;
    }
    case 'cancel': {
      void cancel(row);
      break;
    }
    case 'detail': {
      openInspector(row.order_intent_id);
      break;
    }
    case 'reject': {
      void reject(row);
      break;
    }
    // No default
  }
}

const { openInspector } = useWorkspaceInspectorRoute({
  close: () => {},
  entity: 'order-intent',
  fetch: (id) => getOrderIntent(id),
  open: () => {},
});

watch(
  () => orderIntentStore.revision,
  () => {
    const event = orderIntentStore.lastEvent;
    if (event && orderIntentStore.shouldShowWsToast(event)) {
      message.info(
        $t(`page.quantIntents.wsToast.${event.event}`, {
          id: event.order_intent_id,
        }),
      );
    }
    void gridApi.query();
  },
);
</script>

<template>
  <Page auto-content-height>
    <Grid
      :table-title="
        approvalQueue
          ? $t('page.commandPalette.module.approvals')
          : $t('page.quantIntents.listTitle')
      "
    />
    <IntentDetailDrawer @changed="() => void gridApi.query()" />
  </Page>
</template>
