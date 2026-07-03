<script lang="ts" setup>
import type { TrainingDatasetView } from '@vben/types';

import type { DatasetFormBody } from './modules/dataset-form-modal.vue';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  buildTrainingDataset,
  getTrainingDataset,
  listTrainingDatasets,
  planTrainingDataset,
} from '#/api/research';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import DatasetDetailDrawer from './modules/dataset-detail-drawer.vue';
import DatasetFormModal from './modules/dataset-form-modal.vue';
import {
  useTrainingDatasetColumns,
  useTrainingDatasetSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchDatasetsPage' });

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const canCreate = hasAccessByCodes(['materialization:create']);
const canTrain = hasAccessByCodes(['materialization:create']);

const initialFilters = {
  model_spec_id: (route.query.model_spec_id as string) || undefined,
};

const emptyPage = {
  has_next: false,
  items: [] as TrainingDatasetView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: DatasetDetailDrawer,
  destroyOnClose: true,
});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: DatasetFormModal,
});

const [Grid, gridApi] = useVbenVxeGrid<TrainingDatasetView>({
  formOptions: { schema: useTrainingDatasetSearchSchema(initialFilters) },
  gridOptions: {
    columns: useTrainingDatasetColumns(onActionClick, canTrain),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listTrainingDatasets({
              from: (range[0] as string | undefined) || undefined,
              model_spec_id:
                (formValues.model_spec_id as string | undefined) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              status: (formValues.status as any) || undefined,
              to: (range[1] as string | undefined) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'training_dataset_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function openForm(mode: 'build' | 'plan') {
  formModalApi
    .setData({
      mode,
      onSubmit: (body: DatasetFormBody) => void submitDataset(mode, body),
    })
    .open();
}

async function submitDataset(mode: 'build' | 'plan', body: DatasetFormBody) {
  if (mode === 'plan') {
    const plan = await governed(
      (ctx) => planTrainingDataset({ ...body, reason: ctx.reason }, ctx),
      {
        summary: $t('page.research.datasets.plan.summary'),
        title: $t('page.research.datasets.plan.title'),
      },
    );
    if (plan) {
      message.info(
        $t('page.research.datasets.plan.feedback', {
          samples: plan.planned_samples,
        }),
      );
    }
    return;
  }
  const dataset = await governed(
    (ctx) => buildTrainingDataset({ ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.datasets.build.summary'),
      title: $t('page.research.datasets.build.title'),
    },
  );
  if (dataset) {
    message.success($t('page.research.datasets.build.feedback'));
    void gridApi.query();
    drawerApi.setData({ dataset }).open();
  }
}

function goToTrain(dataset: TrainingDatasetView) {
  void router.push(`/research/models?train=${dataset.training_dataset_id}`);
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<TrainingDatasetView>) {
  switch (code) {
    case 'detail': {
      drawerApi.setData({ dataset: row }).open();
      break;
    }
    case 'train': {
      goToTrain(row);
      break;
    }
    // No default
  }
}

useQueryOpenDrawer({
  fetch: (id) => getTrainingDataset(id),
  open: (dataset) => drawerApi.setData({ dataset }).open(),
});

// Materialization completions bump the research revision; refresh the catalog.
watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.datasets.listTitle')">
      <template #toolbar-tools>
        <div v-if="canCreate" class="flex gap-2">
          <Button @click="openForm('plan')">
            {{ $t('page.research.datasets.actions.plan') }}
          </Button>
          <Button type="primary" @click="openForm('build')">
            {{ $t('page.research.datasets.actions.build') }}
          </Button>
        </div>
      </template>
    </Grid>
    <Drawer @train="goToTrain" />
    <FormModal />
  </Page>
</template>
