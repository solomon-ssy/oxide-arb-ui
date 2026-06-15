<script lang="ts" setup>
import type {
  ControlFactorPublicationInfo,
  PublicationMode,
  PublicationStatus,
  UuidString,
} from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { ref, watch } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  fetchPublicationCatalog,
  fetchPublicationRollbackTargets,
  rollbackPublication,
} from '#/api/control-factors';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useControlStore } from '#/store';

import {
  usePublicationColumns,
  usePublicationSearchSchema,
} from './modules/schemas';
import PublicationDetailDrawer from './modules/widgets/publication-detail-drawer.vue';
import RollbackModal from './modules/widgets/rollback-modal.vue';

defineOptions({ name: 'PublicationsPage' });

const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useOxideAccess();
const controlStore = useControlStore();
const canRollback = hasAccessByCodes(['publication:rollback']);
const rollbackSource = ref<ControlFactorPublicationInfo | null>(null);

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: PublicationDetailDrawer,
  destroyOnClose: true,
});
const [RollbackModalHost, rollbackModalApi] = useVbenModal({
  connectedComponent: RollbackModal,
  destroyOnClose: true,
});

const emptyPage = {
  has_next: false,
  items: [] as ControlFactorPublicationInfo[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<ControlFactorPublicationInfo>({
  formOptions: { schema: usePublicationSearchSchema() },
  gridOptions: {
    columns: usePublicationColumns(onActionClick, canRollback),
    proxyConfig: {
      ajax: {
        query: async ({ form }: { form?: Record<string, unknown> }) => {
          const items = await handleRequest(() =>
            fetchPublicationCatalog({
              limit: Number(form?.limit ?? 50),
              mode: form?.mode as PublicationMode | undefined,
              status: form?.status as PublicationStatus | undefined,
            }),
          );
          if (!items) {
            return emptyPage;
          }
          return {
            has_next: false,
            items,
            page: 1,
            size: items.length,
            total: items.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'publication_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

async function openRollback(row: ControlFactorPublicationInfo) {
  rollbackSource.value = row;
  const options = await handleRequest(() => fetchPublicationRollbackTargets());
  if (!options) {
    return;
  }
  rollbackModalApi
    .setData({
      currentId: row.publication_id,
      onSubmit: onRollbackSubmit,
      options,
    })
    .open();
}

async function onRollbackSubmit(targetPublicationId: UuidString) {
  const source = rollbackSource.value;
  if (!source) {
    return false;
  }
  const result = await governed(
    (ctx) =>
      rollbackPublication(
        source.publication_id,
        { reason: ctx.reason, target_publication_id: targetPublicationId },
        ctx,
      ),
    {
      confirmWord: 'ROLLBACK',
      danger: true,
      summary: $t('page.publications.rollback.summary', {
        source: source.publication_id,
        target: targetPublicationId,
      }),
      title: $t('page.publications.rollback.title'),
    },
  );
  if (result) {
    message.success($t('page.publications.feedback.rolledBack'));
    void gridApi.query();
  }
  return result !== null;
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ControlFactorPublicationInfo>) {
  if (code === 'detail') {
    detailDrawerApi.setData({ publicationId: row.publication_id }).open();
  } else if (code === 'rollback') {
    void openRollback(row);
  }
}

watch(
  () => controlStore.revision,
  () => {
    void gridApi.query();
  },
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.publications.title')" />
    <DetailDrawer />
    <RollbackModalHost />
  </Page>
</template>
