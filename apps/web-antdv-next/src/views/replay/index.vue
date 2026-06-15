<script lang="ts" setup>
import type {
  ControlFactorMaterializationRunView,
  UuidString,
} from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { ReplayCreateRequest } from '#/api/replay';

import { watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { createReplay, fetchReplayPage } from '#/api/replay';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useReplayStore } from '#/store/replay';

import { useReplayRunColumns, useReplaySearchSchema } from './modules/schemas';
import CreateReplayDrawer from './modules/widgets/create-replay-drawer.vue';
import RunDetailDrawer from './modules/widgets/run-detail-drawer.vue';

defineOptions({ name: 'ReplayPage' });

const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useOxideAccess();
const replayStore = useReplayStore();
const canCreate = hasAccessByCodes(['replay:create']);

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
        }) => {
          const result = await handleRequest(() =>
            fetchReplayPage({
              page: page.currentPage,
              size: page.pageSize,
              status: form?.status as
                | ControlFactorMaterializationRunView['status']
                | undefined,
            }),
          );
          return (
            result ?? {
              has_next: false,
              items: [],
              page: page.currentPage,
              size: 0,
              total: 0,
            }
          );
        },
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
      void gridApi.query();
    }
  },
});

const [CreateDrawer, createDrawerApi] = useVbenDrawer({
  connectedComponent: CreateReplayDrawer,
  destroyOnClose: true,
});

function openDetail(runId: UuidString) {
  drawerApi.setData({ runId }).open();
}

function openCreateDrawer() {
  createDrawerApi.setData({ onSubmit: onCreateSubmit }).open();
}

async function onCreateSubmit(payload: ReplayCreateRequest) {
  const result = await governed(
    (ctx) => createReplay({ ...payload, reason: ctx.reason }, ctx),
    {
      summary: $t('page.replay.create.summary'),
      title: $t('page.replay.create.title'),
    },
  );
  if (result) {
    message.success(
      $t('page.replay.create.created', {
        id: result.run.materialization_run_id,
      }),
    );
    openDetail(result.run.materialization_run_id);
    void gridApi.query();
  }
  return result !== null;
}

watch(
  () => replayStore.revision,
  () => {
    void gridApi.query();
  },
);
</script>

<template>
  <Page auto-content-height>
    <Grid>
      <template #toolbar-tools>
        <Button
          v-if="canCreate"
          v-access:code="'replay:create'"
          type="primary"
          @click="openCreateDrawer"
        >
          {{ $t('page.replay.create.title') }}
        </Button>
      </template>
    </Grid>
    <Drawer />
    <CreateDrawer />
  </Page>
</template>
