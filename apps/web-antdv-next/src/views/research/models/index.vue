<script lang="ts" setup>
import type { TrainedModelView } from '@vben/types';

import type { BacktestBody } from './modules/model-backtest-modal.vue';
import type { TrainModelBody } from './modules/model-train-modal.vue';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  backtestModel,
  getModel,
  listModels,
  publishModel,
  retireModel,
  rollbackModel,
  trainModel,
} from '#/api/research';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import ModelBacktestModal from './modules/model-backtest-modal.vue';
import ModelDetailDrawer from './modules/model-detail-drawer.vue';
import ModelTrainModal from './modules/model-train-modal.vue';
import {
  useTrainedModelColumns,
  useTrainedModelSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchModelsPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const canTrain = hasAccessByCodes(['materialization:create']);
const access = {
  canBacktest: hasAccessByCodes(['replay:create']),
  canPublish: hasAccessByCodes(['publication:publish']),
  canRetire: hasAccessByCodes(['publication:retire']),
  canRollback: hasAccessByCodes(['publication:rollback']),
};

const initialFilters = {
  model_spec_id: (route.query.model_spec_id as string) || undefined,
};

const emptyPage = {
  has_next: false,
  items: [] as TrainedModelView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: ModelDetailDrawer,
  destroyOnClose: true,
});
const [TrainModal, trainModalApi] = useVbenModal({
  connectedComponent: ModelTrainModal,
});
const [BacktestModal, backtestModalApi] = useVbenModal({
  connectedComponent: ModelBacktestModal,
});

const [Grid, gridApi] = useVbenVxeGrid<TrainedModelView>({
  formOptions: { schema: useTrainedModelSearchSchema(initialFilters) },
  gridOptions: {
    columns: useTrainedModelColumns(onActionClick, access),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listModels({
              from: (range[0] as string | undefined) || undefined,
              model_spec_id:
                (formValues.model_spec_id as string | undefined) || undefined,
              page: page.currentPage,
              publication_status:
                (formValues.publication_status as any) || undefined,
              size: page.pageSize,
              to: (range[1] as string | undefined) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'model_version_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function openTrain(trainingDatasetId?: string) {
  trainModalApi
    .setData({
      onSubmit: (body: TrainModelBody) => void submitTrain(body),
      trainingDatasetId,
    })
    .open();
}

async function submitTrain(body: TrainModelBody) {
  const result = await governed(
    (ctx) => trainModel({ ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.models.train.summary'),
      title: $t('page.research.models.train.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.train.feedback'));
    void gridApi.query();
    drawerApi.setData({ model: result }).open();
  }
}

function openBacktest(model: TrainedModelView) {
  backtestModalApi
    .setData({
      modelVersionId: model.model_version_id,
      onSubmit: (body: BacktestBody) =>
        void submitBacktest(model.model_version_id, body),
    })
    .open();
}

async function submitBacktest(modelVersionId: string, body: BacktestBody) {
  const result = await governed(
    (ctx) =>
      backtestModel(modelVersionId, { ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.models.backtest.summary'),
      title: $t('page.research.models.backtest.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.backtest.feedback'));
  }
}

async function publish(model: TrainedModelView) {
  const id = model.model_version_id;
  const result = await governed(
    (ctx) => publishModel(id, { reason: ctx.reason }, ctx),
    {
      confirmWord: 'PUBLISH',
      danger: true,
      summary: $t('page.research.models.publish.summary', { id }),
      title: $t('page.research.models.publish.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.publish.feedback'));
    void gridApi.query();
  }
}

async function rollback(model: TrainedModelView) {
  const id = model.model_version_id;
  const result = await governed(
    (ctx) => rollbackModel(id, { reason: ctx.reason }, ctx),
    {
      confirmWord: 'ROLLBACK',
      danger: true,
      summary: $t('page.research.models.rollback.summary', { id }),
      title: $t('page.research.models.rollback.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.rollback.feedback'));
    void gridApi.query();
  }
}

async function retire(model: TrainedModelView) {
  const id = model.model_version_id;
  const result = await governed(
    (ctx) => retireModel(id, { reason: ctx.reason }, ctx),
    {
      confirmWord: 'RETIRE',
      danger: true,
      summary: $t('page.research.models.retire.summary', { id }),
      title: $t('page.research.models.retire.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.retire.feedback'));
    void gridApi.query();
  }
}

function onActionClick({ code, row }: OnActionClickParams<TrainedModelView>) {
  switch (code) {
    case 'backtest': {
      openBacktest(row);
      break;
    }
    case 'detail': {
      drawerApi.setData({ model: row }).open();
      break;
    }
    case 'publish': {
      void publish(row);
      break;
    }
    case 'retire': {
      void retire(row);
      break;
    }
    case 'rollback': {
      void rollback(row);
      break;
    }
    // No default
  }
}

useQueryOpenDrawer({
  fetch: (id) => getModel(id),
  open: (model) => drawerApi.setData({ model }).open(),
});

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);

// A dataset-row "Train" handoff deep-links with `?train=<datasetId>`.
onMounted(() => {
  const trainDataset = route.query.train;
  if (typeof trainDataset === 'string' && trainDataset && canTrain) {
    openTrain(trainDataset);
  }
});
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.models.listTitle')">
      <template #toolbar-tools>
        <Button v-if="canTrain" type="primary" @click="openTrain()">
          {{ $t('page.research.models.actions.train') }}
        </Button>
      </template>
    </Grid>
    <Drawer />
    <TrainModal />
    <BacktestModal />
  </Page>
</template>
