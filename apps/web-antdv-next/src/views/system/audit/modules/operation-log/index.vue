<script lang="ts" setup>
import type { OperationLogView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Card, Descriptions, DescriptionsItem, Empty } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { fetchOperationLogPage, getOperationLog } from '#/api/operation-logs';
import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { useWorkspaceInspectorRoute } from '#/shared/composables/use-workspace-inspector-route';

import {
  useOperationLogColumns,
  useOperationLogSearchSchema,
} from './modules/schemas';
import OperationLogDetailDrawer from './modules/widgets/operation-log-detail-drawer.vue';

defineOptions({ name: 'OperationLogPage' });

const route = useRoute();
const router = useRouter();
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
const governanceReceipts = ref<OperationLogView[]>([]);
const governanceLoading = ref(false);
const governanceAuditId = computed(() => {
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  return route.query.entity === 'governance-audit-event' &&
    typeof id === 'string' &&
    id !== ''
    ? id
    : null;
});
const governanceInspectorOpen = computed({
  get: () => governanceAuditId.value !== null,
  set: (value: boolean) => {
    if (value) return;
    const { entity: _entity, id: _id, ...query } = route.query;
    void router.push({ query });
  },
});

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: OperationLogDetailDrawer,
  destroyOnClose: true,
  onOpenChange: (open) => onInspectorOpenChange(open),
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
              governance_audit_event_id:
                route.query.entity === 'governance-audit-event' &&
                typeof route.query.id === 'string'
                  ? route.query.id
                  : undefined,
              outcome: formValues.outcome as any,
              page: page.currentPage,
              request_id: formValues.request_id as string | undefined,
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
    openInspector(row.id);
  }
}

const { onInspectorOpenChange, openInspector } = useWorkspaceInspectorRoute({
  close: () => detailDrawerApi.close?.(),
  entity: 'operation-log',
  fetch: (id) => getOperationLog(id),
  open: (row) => detailDrawerApi.setData({ row }).open(),
});

watch(
  governanceAuditId,
  async (id) => {
    governanceReceipts.value = [];
    if (!id) return;
    governanceLoading.value = true;
    const result = await handleRequest(
      () =>
        fetchOperationLogPage({
          governance_audit_event_id: id,
          page: 1,
          size: 100,
        }),
      { silent: true },
    );
    governanceLoading.value = false;
    if (governanceAuditId.value !== id) return;
    if (result?.items.length) {
      governanceReceipts.value = result.items.toSorted(
        (left, right) =>
          (left.governance_audit_sequence ?? 0) -
          (right.governance_audit_sequence ?? 0),
      );
      return;
    }
    const { entity: _entity, id: _id, ...query } = route.query;
    void router.replace({ query });
  },
  { immediate: true },
);

watch(
  () => [route.query.entity, route.query.id],
  () => {
    void gridApi.query();
  },
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="tableTitle" />
    <DetailDrawer />
    <WorkspaceInspectorSurface
      v-model:open="governanceInspectorOpen"
      :loading="governanceLoading"
      :title="$t('page.commandPalette.module.receipts')"
    >
      <div v-if="governanceReceipts.length > 0" class="grid gap-3">
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem :label="$t('page.operationLog.detail.auditEvent')">
            <span class="font-mono text-xs">{{ governanceAuditId }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.operationLog.detail.receiptCount')"
          >
            {{ governanceReceipts.length }}
          </DescriptionsItem>
        </Descriptions>
        <Card
          v-for="receipt in governanceReceipts"
          :key="receipt.id"
          size="small"
        >
          <template #title>
            <span class="font-mono text-xs">
              #{{ receipt.governance_audit_sequence ?? '—' }} ·
              {{ receipt.action }}
            </span>
          </template>
          <template #extra>
            <EnumTag
              context="governance-receipt"
              name="OperationOutcome"
              :value="receipt.outcome"
            />
          </template>
          <p class="text-muted-foreground text-xs">
            {{ formatDateTimeLocal(receipt.occurred_at) }} ·
            {{ receipt.actor_username ?? receipt.actor_user_id ?? '—' }}
          </p>
          <p class="mt-2 text-xs">
            {{ receipt.http_method }} {{ receipt.http_path }} →
            {{ receipt.http_status }}
          </p>
        </Card>
      </div>
      <Empty
        v-else-if="!governanceLoading"
        :description="$t('page.operationLog.detail.receiptsEmpty')"
      />
    </WorkspaceInspectorSurface>
  </Page>
</template>
