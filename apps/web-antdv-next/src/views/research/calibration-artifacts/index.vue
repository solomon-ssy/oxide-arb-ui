<script lang="ts" setup>
import type { CalibrationArtifactSummaryView } from '@vben/types';

import type { FitModelCalibratorBody } from './modules/fit-model-calibrator-modal.vue';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { ref, watch } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { CALIBRATION_KINDS } from '@vben/types';

import { Button, Empty, message, TabPane, Tabs } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  activateCalibrationArtifact,
  fitBiasTable,
  fitModelCalibrator,
  getCalibrationArtifact,
  listCalibrationArtifacts,
} from '#/api/calibration';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import CalibrationArtifactDetailDrawer from './modules/calibration-artifact-detail-drawer.vue';
import FitModelCalibratorModal from './modules/fit-model-calibrator-modal.vue';
import { useCalibrationArtifactColumns } from './modules/schemas';

defineOptions({ name: 'ResearchCalibrationArtifactsPage' });

type KindFilter =
  | 'all'
  | (typeof CALIBRATION_KINDS)[keyof typeof CALIBRATION_KINDS];

const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const canFit = hasAccessByCodes(['materialization:create']);
const canActivate = hasAccessByCodes(['runtime_config:create']);

const kindFilter = ref<KindFilter>('all');

/** Default fit window: the trailing 180 days of settled markets. */
const FIT_WINDOW_DAYS = 180;

const emptyPage = {
  has_next: false,
  items: [] as CalibrationArtifactSummaryView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: CalibrationArtifactDetailDrawer,
  destroyOnClose: true,
});

const [CalibratorModal, calibratorModalApi] = useVbenModal({
  connectedComponent: FitModelCalibratorModal,
});

const [Grid, gridApi] = useVbenVxeGrid<CalibrationArtifactSummaryView>({
  gridOptions: {
    columns: useCalibrationArtifactColumns(onActionClick, { canActivate }),
    proxyConfig: {
      ajax: {
        query: async ({
          page,
        }: {
          page: { currentPage: number; pageSize: number };
        }) => {
          const result = await handleRequest(() =>
            listCalibrationArtifacts({
              kind: kindFilter.value === 'all' ? undefined : kindFilter.value,
              page: page.currentPage,
              size: page.pageSize,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'artifact_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

watch(kindFilter, () => void gridApi.query());

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);

async function fitBiasTableJob() {
  const to = new Date();
  const from = new Date(to.getTime() - FIT_WINDOW_DAYS * 86_400_000);
  const job = await governed(
    (ctx) =>
      fitBiasTable(
        {
          reason: ctx.reason,
          window_end: to.toISOString(),
          window_start: from.toISOString(),
        },
        ctx,
      ),
    {
      summary: $t('page.research.calibrationArtifacts.fitBiasTable.summary', {
        days: FIT_WINDOW_DAYS,
      }),
      title: $t('page.research.calibrationArtifacts.fitBiasTable.title'),
    },
  );
  if (job) {
    message.success(
      $t('page.research.calibrationArtifacts.fitBiasTable.feedback'),
    );
    void gridApi.query();
  }
}

function openFitCalibratorModal() {
  calibratorModalApi
    .setData({
      onSubmit: (body: FitModelCalibratorBody) => submitFitCalibrator(body),
    })
    .open();
}

async function submitFitCalibrator(
  body: FitModelCalibratorBody,
): Promise<boolean> {
  const job = await governed(
    (ctx) => fitModelCalibrator({ ...body, reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.calibrationArtifacts.fitCalibrator.summary'),
      title: $t('page.research.calibrationArtifacts.fitCalibrator.title'),
    },
  );
  if (job) {
    message.success(
      $t('page.research.calibrationArtifacts.fitCalibrator.feedback'),
    );
    void gridApi.query();
    return true;
  }
  return false;
}

async function activate(row: CalibrationArtifactSummaryView) {
  const version = await governed(
    (ctx) =>
      activateCalibrationArtifact(row.artifact_id, { reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.calibrationArtifacts.activate.summary'),
      title: $t('page.research.calibrationArtifacts.activate.title'),
    },
  );
  if (version) {
    message.success($t('page.research.calibrationArtifacts.activate.feedback'));
    void gridApi.query();
  }
}

function openDetail(row: CalibrationArtifactSummaryView) {
  void handleRequest(() => getCalibrationArtifact(row.artifact_id)).then(
    (detail) => {
      if (detail) {
        drawerApi.setData({ detail }).open();
      }
    },
  );
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<CalibrationArtifactSummaryView>) {
  switch (code) {
    case 'activate': {
      void activate(row);
      break;
    }
    case 'detail': {
      openDetail(row);
      break;
    }
    // No default
  }
}

useQueryOpenDrawer({
  fetch: (id) => getCalibrationArtifact(id),
  open: (detail) => drawerApi.setData({ detail }).open(),
});
</script>

<template>
  <Page auto-content-height>
    <Tabs v-model:active-key="kindFilter" class="mb-2">
      <TabPane
        key="all"
        :tab="$t('page.research.calibrationArtifacts.tabs.all')"
      />
      <TabPane
        key="model_score"
        :tab="$t('page.research.calibrationArtifacts.tabs.modelScore')"
      />
      <TabPane
        key="market_price_bias"
        :tab="$t('page.research.calibrationArtifacts.tabs.marketPriceBias')"
      />
    </Tabs>
    <Grid :table-title="$t('page.research.calibrationArtifacts.listTitle')">
      <template #empty>
        <Empty
          :description="
            $t('page.research.calibrationArtifacts.empty.description')
          "
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        >
          <div v-if="canFit" class="flex flex-wrap justify-center gap-2">
            <Button @click="fitBiasTableJob">
              {{ $t('page.research.calibrationArtifacts.fitBiasTable.action') }}
            </Button>
            <Button type="primary" @click="openFitCalibratorModal">
              {{
                $t('page.research.calibrationArtifacts.fitCalibrator.action')
              }}
            </Button>
          </div>
        </Empty>
      </template>
      <template #toolbar-tools>
        <Button v-if="canFit" @click="fitBiasTableJob">
          {{ $t('page.research.calibrationArtifacts.fitBiasTable.action') }}
        </Button>
        <Button v-if="canFit" type="primary" @click="openFitCalibratorModal">
          {{ $t('page.research.calibrationArtifacts.fitCalibrator.action') }}
        </Button>
      </template>
      <template #fit_window="{ row }">
        <span class="text-xs">
          {{ formatDateTimeLocal(row.fit_window_start) }}
          {{ $t('page.research.calibrationArtifacts.fitWindowSeparator') }}
          {{ formatDateTimeLocal(row.fit_window_end) }}
        </span>
      </template>
    </Grid>
    <Drawer />
    <CalibratorModal />
  </Page>
</template>
