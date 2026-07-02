<script lang="ts" setup>
import type { QuantReportDetailView, QuantReportView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getLatestQuantReportOptional,
  listQuantReports,
} from '#/api/quant-reports';
import { $t } from '#/locales';
import { useRunReportAction } from '#/shared/composables/use-run-report-action';
import { useQuantReportStore } from '#/store';
import LatestReportCard from '#/views/dashboard/modules/widgets/latest-report-card.vue';

import { useReportColumns, useReportSearchSchema } from './modules/schemas';
import { useReportActions } from './modules/use-report-actions';

defineOptions({ name: 'QuantReportsPage' });

const router = useRouter();
const { handleRequest } = useRequestHandler();
const quantReportStore = useQuantReportStore();

const { canRun, openRunReport, RunReportModalHost } = useRunReportAction();
const { canRevoke, revoke } = useReportActions(() => {
  void gridApi.query();
  void loadLatest();
});

const latestReport = ref<null | QuantReportDetailView>(null);
const latestLoading = ref(false);

const emptyPage = {
  has_next: false,
  items: [] as QuantReportView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<QuantReportView>({
  formOptions: {
    schema: useReportSearchSchema(),
  },
  gridOptions: {
    columns: useReportColumns(onActionClick, canRevoke),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listQuantReports({
              from: (range[0] as string | undefined) || undefined,
              kind: (formValues.kind as any) || undefined,
              page: page.currentPage,
              runtime_mode: (formValues.runtime_mode as any) || undefined,
              size: page.pageSize,
              status: (formValues.status as any) || undefined,
              to: (range[1] as string | undefined) || undefined,
              trigger_kind: (formValues.trigger_kind as any) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'recommendation_report_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

async function loadLatest() {
  latestLoading.value = true;
  try {
    latestReport.value = await handleRequest(
      () => getLatestQuantReportOptional(),
      { silent: true },
    );
  } finally {
    latestLoading.value = false;
  }
}

function openDetail(id: string) {
  void router.push(`/quant/reports/${id}`);
}

function onLatestNavigate() {
  if (latestReport.value) {
    openDetail(latestReport.value.recommendation_report_id);
  }
}

function onActionClick({ code, row }: OnActionClickParams<QuantReportView>) {
  switch (code) {
    case 'detail': {
      openDetail(row.recommendation_report_id);
      break;
    }
    case 'revoke': {
      void revoke(row);
      break;
    }
    // No default
  }
}

// WS `quant.report` frames bump the store revision; refetch list + latest and
// surface a lifecycle toast keyed by the trigger correlation handle.
watch(
  () => quantReportStore.revision,
  () => {
    const event = quantReportStore.lastEvent;
    if (event) {
      message.info(
        $t(`page.quantReports.wsToast.${event.event}`, {
          key: event.trigger_key,
        }),
      );
    }
    void gridApi.query();
    void loadLatest();
  },
);

onMounted(() => {
  void loadLatest();
});
</script>

<template>
  <Page auto-content-height>
    <LatestReportCard
      class="mb-4"
      :loading="latestLoading"
      :report="latestReport"
      @navigate-detail="openDetail"
      @navigate-list="onLatestNavigate"
    />
    <Grid :table-title="$t('page.quantReports.listTitle')">
      <template #toolbar-tools>
        <Button v-if="canRun" type="primary" @click="openRunReport">
          {{ $t('page.quantReports.run.title') }}
        </Button>
      </template>
    </Grid>
    <RunReportModalHost />
  </Page>
</template>
