<script lang="ts" setup>
import type { TrainedModelView } from '@vben/types';

import type { BacktestBody } from './modules/model-backtest-modal.vue';
import type { CpcvBody } from './modules/model-cpcv-modal.vue';
import type { TrainModelBody } from './modules/model-train-modal.vue';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  backtestModel,
  cpcvBacktestModel,
  getModel,
  listModels,
  trainModel,
} from '#/api/research';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryEntityDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import ModelBacktestModal from './modules/model-backtest-modal.vue';
import ModelCpcvModal from './modules/model-cpcv-modal.vue';
import ModelDetailDrawer from './modules/model-detail-drawer.vue';
import ModelTrainModal from './modules/model-train-modal.vue';
import {
  useTrainedModelColumns,
  useTrainedModelSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchModelsPage' });

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const canTrain = hasAccessByCodes(['materialization:create']);
const access = {
  canBacktest: hasAccessByCodes(['replay:create']),
  canCpcv: hasAccessByCodes(['replay:create']),
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
const [CpcvModal, cpcvModalApi] = useVbenModal({
  connectedComponent: ModelCpcvModal,
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
      onSubmit: (body: TrainModelBody) => submitTrain(body),
      trainingDatasetId,
    })
    .open();
}

/** Connected modals extend the parent api only after the child mounts. */
function isTrainModalApiReady(): boolean {
  return (
    typeof trainModalApi.setData === 'function' &&
    typeof trainModalApi.open === 'function'
  );
}

async function waitForTrainModalApi(): Promise<boolean> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await nextTick();
    if (isTrainModalApiReady()) {
      return true;
    }
  }
  return false;
}

/** Dataset-row handoff: open the train modal, then strip `?train=` from the URL. */
async function handleTrainQueryHandoff(trainDataset: string) {
  if (canTrain) {
    if (!(await waitForTrainModalApi())) {
      message.error($t('page.research.models.train.modalUnavailable'));
      return;
    }
    openTrain(trainDataset);
  } else {
    message.warning($t('page.research.models.train.noPermission'));
  }
  if (route.query.train === undefined) {
    return;
  }
  const { train: _train, ...rest } = route.query;
  await router.replace({ path: route.path, query: rest });
}

async function submitTrain(body: TrainModelBody): Promise<boolean> {
  const result = await governed(
    (ctx) => trainModel({ ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.models.train.summary'),
      title: $t('page.research.models.train.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.train.feedback'));
    void router.push(
      `/runtime/activity?domain=research&entity=research-job&id=${result.job_id}`,
    );
    return true;
  }
  return false;
}

function openBacktest(model: TrainedModelView) {
  backtestModalApi
    .setData({
      modelSpecId: model.model_spec_id,
      modelVersionId: model.model_version_id,
      onSubmit: (body: BacktestBody) =>
        submitBacktest(model.model_version_id, body),
    })
    .open();
}

async function submitBacktest(
  modelVersionId: string,
  body: BacktestBody,
): Promise<boolean> {
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
    await router.push(
      `/runtime/activity?domain=research&entity=research-job&id=${result.job_id}`,
    );
    return true;
  }
  return false;
}

function openCpcv(model: TrainedModelView) {
  cpcvModalApi
    .setData({
      modelSpecId: model.model_spec_id,
      modelVersionId: model.model_version_id,
      onSubmit: (body: CpcvBody) => submitCpcv(model.model_version_id, body),
      trainingDatasetId: model.training_dataset_id ?? undefined,
    })
    .open();
}

async function submitCpcv(
  modelVersionId: string,
  body: CpcvBody,
): Promise<boolean> {
  const result = await governed(
    (ctx) =>
      cpcvBacktestModel(modelVersionId, { ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.models.cpcv.summary'),
      title: $t('page.research.models.cpcv.title'),
    },
  );
  if (result) {
    message.success($t('page.research.models.cpcv.feedback'));
    await router.push(
      `/runtime/activity?domain=research&entity=research-job&id=${result.job_id}`,
    );
    return true;
  }
  return false;
}

function onActionClick({ code, row }: OnActionClickParams<TrainedModelView>) {
  switch (code) {
    case 'backtest': {
      openBacktest(row);
      break;
    }
    case 'cpcv': {
      openCpcv(row);
      break;
    }
    case 'detail': {
      drawerApi.setData({ model: row }).open();
      break;
    }
    // No default
  }
}

useQueryEntityDrawer({
  entity: 'model-version',
  fetch: (id) => getModel(id),
  open: (model) => drawerApi.setData({ model }).open(),
});

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);

// A dataset-row "Train" handoff deep-links with `?train=<datasetId>`. Watch (not
// just onMounted) so an in-app navigation onto the already-mounted page still
// fires; clear the query so a refresh does not reopen the modal.
watch(
  () => route.query.train,
  (raw) => {
    const trainDataset = typeof raw === 'string' ? raw : '';
    if (!trainDataset) {
      return;
    }
    void handleTrainQueryHandoff(trainDataset);
  },
  { immediate: true },
);
</script>

<template>
  <Page auto-content-height data-testid="models-page">
    <Grid :table-title="$t('page.research.models.listTitle')">
      <template #toolbar-tools>
        <Button
          v-if="canTrain"
          class="min-h-11"
          type="primary"
          @click="openTrain()"
        >
          {{ $t('page.research.models.actions.train') }}
        </Button>
      </template>
    </Grid>
    <Drawer />
    <TrainModal />
    <BacktestModal />
    <CpcvModal />
  </Page>
</template>
