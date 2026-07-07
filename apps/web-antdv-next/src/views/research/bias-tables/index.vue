<script lang="ts" setup>
import type { BiasTableSummaryView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  activateBiasTable,
  fitBiasTable,
  getBiasTable,
  listBiasTables,
} from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import BiasTableDetailDrawer from './modules/bias-table-detail-drawer.vue';
import { useBiasTableColumns } from './modules/schemas';

defineOptions({ name: 'ResearchBiasTablesPage' });

const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const canFit = hasAccessByCodes(['materialization:create']);
const canActivate = hasAccessByCodes(['runtime_config:create']);

/** Default fit window: the trailing 180 days of settled markets. */
const FIT_WINDOW_DAYS = 180;

const emptyPage = {
  has_next: false,
  items: [] as BiasTableSummaryView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: BiasTableDetailDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<BiasTableSummaryView>({
  gridOptions: {
    columns: useBiasTableColumns(onActionClick, { canActivate }),
    proxyConfig: {
      ajax: {
        query: async ({
          page,
        }: {
          page: { currentPage: number; pageSize: number };
        }) => {
          const result = await handleRequest(() =>
            listBiasTables({ page: page.currentPage, size: page.pageSize }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'bias_table_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);

async function fit() {
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
      summary: $t('page.research.biasTables.fit.summary', {
        days: FIT_WINDOW_DAYS,
      }),
      title: $t('page.research.biasTables.fit.title'),
    },
  );
  if (job) {
    message.success($t('page.research.biasTables.fit.feedback'));
    void gridApi.query();
  }
}

async function activate(row: BiasTableSummaryView) {
  const version = await governed(
    (ctx) => activateBiasTable(row.bias_table_id, { reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.biasTables.activate.summary'),
      title: $t('page.research.biasTables.activate.title'),
    },
  );
  if (version) {
    message.success($t('page.research.biasTables.activate.feedback'));
  }
}

function openDetail(row: BiasTableSummaryView) {
  void handleRequest(() => getBiasTable(row.bias_table_id)).then((detail) => {
    if (detail) {
      drawerApi.setData({ detail }).open();
    }
  });
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<BiasTableSummaryView>) {
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
  fetch: (id) => getBiasTable(id),
  open: (detail) => drawerApi.setData({ detail }).open(),
});
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.biasTables.listTitle')">
      <template #toolbar-tools>
        <Button v-if="canFit" type="primary" @click="fit">
          {{ $t('page.research.biasTables.fit.action') }}
        </Button>
      </template>
      <template #fit_window="{ row }">
        <span class="text-xs">
          {{ formatDateTimeLocal(row.fit_window_start) }}
          {{ $t('page.research.biasTables.fitWindowSeparator') }}
          {{ formatDateTimeLocal(row.fit_window_end) }}
        </span>
      </template>
    </Grid>
    <Drawer />
  </Page>
</template>
