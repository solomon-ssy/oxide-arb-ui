<script lang="ts" setup>
import type { QuantModelSpecView } from '@vben/types';

import type { CreateModelSpecBody } from './modules/model-spec-create-modal.vue';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { createModelSpec, getModelSpec, listModelSpecs } from '#/api/research';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryEntityDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import ModelSpecCreateModal from './modules/model-spec-create-modal.vue';
import ModelSpecDetailDrawer from './modules/model-spec-detail-drawer.vue';
import {
  useModelSpecColumns,
  useModelSpecSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchModelSpecsPage' });

const router = useRouter();
const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const canCreate = hasAccessByCodes(['materialization:create']);

const emptyPage = {
  has_next: false,
  items: [] as QuantModelSpecView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ModelSpecDetailDrawer,
  destroyOnClose: true,
});
const [CreateModal, createModalApi] = useVbenModal({
  connectedComponent: ModelSpecCreateModal,
});

const [Grid, gridApi] = useVbenVxeGrid<QuantModelSpecView>({
  formOptions: { schema: useModelSpecSearchSchema() },
  gridOptions: {
    columns: useModelSpecColumns(onActionClick),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const result = await handleRequest(() =>
            listModelSpecs({
              model_family: (formValues.model_family as any) || undefined,
              page: page.currentPage,
              size: page.pageSize,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'model_spec_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function openCreate() {
  createModalApi
    .setData({
      onSubmit: (body: CreateModelSpecBody) => submitCreate(body),
    })
    .open();
}

async function submitCreate(body: CreateModelSpecBody): Promise<boolean> {
  const result = await governed(
    (ctx) => createModelSpec({ ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.modelSpecs.create.summary'),
      title: $t('page.research.modelSpecs.create.title'),
    },
  );
  if (!result) {
    return false;
  }
  message.success(
    $t('page.research.modelSpecs.create.feedbackNamed', { name: result.name }),
  );
  void gridApi.query();
  drawerApi.setData({ spec: result }).open();
  await router.replace({
    path: '/research/lab',
    query: {
      entity: 'model-spec',
      id: result.model_spec_id,
      module: 'specs',
    },
  });
  return true;
}

function onActionClick({ code, row }: OnActionClickParams<QuantModelSpecView>) {
  if (code === 'detail') {
    drawerApi.setData({ spec: row }).open();
  }
}

useQueryEntityDrawer({
  entity: 'model-spec',
  fetch: (id) => getModelSpec(id),
  open: (spec) => drawerApi.setData({ spec }).open(),
});

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.modelSpecs.listTitle')">
      <template #toolbar-tools>
        <Button v-if="canCreate" type="primary" @click="openCreate()">
          {{ $t('page.research.modelSpecs.actions.create') }}
        </Button>
      </template>
    </Grid>
    <Drawer />
    <CreateModal />
  </Page>
</template>
