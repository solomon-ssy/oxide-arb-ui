<script lang="ts" setup>
import type { ResearchJobView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  cancelResearchJob,
  getResearchJob,
  listResearchJobs,
  retryResearchJob,
} from '#/api/research';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import JobDetailDrawer from './modules/job-detail-drawer.vue';
import {
  jobResultRoute,
  useResearchJobColumns,
  useResearchJobSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchJobsPage' });

const router = useRouter();
const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const canMutate = hasAccessByCodes(['materialization:create']);

const emptyPage = {
  has_next: false,
  items: [] as ResearchJobView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: JobDetailDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<ResearchJobView>({
  formOptions: { schema: useResearchJobSearchSchema() },
  gridOptions: {
    columns: useResearchJobColumns(onActionClick, canMutate),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listResearchJobs({
              from: (range[0] as string | undefined) || undefined,
              kind: (formValues.kind as any) || undefined,
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
    rowConfig: { keyField: 'job_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

// Any materialization run update bumps the revision — re-query the catalog.
// (Progress ticks push over `materialization.run_update`; the open detail
// drawer additionally polls the single job for smooth sub-30s progress.)
watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);

async function cancel(row: ResearchJobView) {
  const ok = await governed((ctx) => cancelResearchJob(row.job_id, ctx), {
    confirmWord: 'CANCEL',
    danger: true,
    summary: $t('page.research.jobs.cancel.summary'),
    title: $t('page.research.jobs.cancel.title'),
  });
  if (ok) {
    message.success($t('page.research.jobs.cancel.feedback'));
    void gridApi.query();
  }
}

async function retry(row: ResearchJobView) {
  const job = await governed((ctx) => retryResearchJob(row.job_id, ctx), {
    summary: $t('page.research.jobs.retry.summary'),
    title: $t('page.research.jobs.retry.title'),
  });
  if (job) {
    message.success($t('page.research.jobs.retry.feedback'));
    void gridApi.query();
    drawerApi.setData({ job }).open();
  }
}

function onActionClick({ code, row }: OnActionClickParams<ResearchJobView>) {
  switch (code) {
    case 'cancel': {
      void cancel(row);
      break;
    }
    case 'detail': {
      drawerApi.setData({ job: row }).open();
      break;
    }
    case 'result': {
      const to = jobResultRoute(row);
      if (to) {
        void router.push(to);
      }
      break;
    }
    case 'retry': {
      void retry(row);
      break;
    }
    // No default
  }
}

useQueryOpenDrawer({
  fetch: (id) => getResearchJob(id),
  open: (job) => drawerApi.setData({ job }).open(),
});
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.jobs.listTitle')" />
    <Drawer />
  </Page>
</template>
