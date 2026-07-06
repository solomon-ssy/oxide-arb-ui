<script lang="ts" setup>
import type { BiasTableSummaryView } from '@vben/types';

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
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useResearchStore } from '#/store';

import BiasTableDetailDrawer from './modules/bias-table-detail-drawer.vue';

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
    columns: [
      {
        field: 'content_hash',
        title: 'Content hash',
        minWidth: 220,
        slots: { default: 'content_hash' },
      },
      { field: 'category_count', title: 'Categories', width: 110 },
      { field: 'total_sample_count', title: 'Samples', width: 110 },
      {
        field: 'fit_window_start',
        title: 'Fit window',
        minWidth: 260,
        slots: { default: 'fit_window' },
      },
      {
        field: 'created_at',
        title: 'Created',
        width: 180,
        formatter: ({ cellValue }: { cellValue: string }) =>
          formatDateTimeLocal(cellValue),
      },
      {
        field: 'actions',
        title: 'Actions',
        fixed: 'right',
        width: 200,
        slots: { default: 'actions' },
      },
    ],
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
      summary: `Fit a favorite-longshot bias table over the trailing ${FIT_WINDOW_DAYS} days. Fails closed (no artifact) when the settlement spine is too thin.`,
      title: 'Fit bias table',
    },
  );
  if (job) {
    message.success('Bias-table fit enqueued');
    void gridApi.query();
  }
}

async function activate(row: BiasTableSummaryView) {
  const version = await governed(
    (ctx) => activateBiasTable(row.bias_table_id, { reason: ctx.reason }, ctx),
    {
      summary:
        'Stage a runtime-config version pinning this bias table as the favorite-longshot source. Activate that version from the runtime-config console to make it live.',
      title: 'Activate bias table',
    },
  );
  if (version) {
    message.success('Config version staged — activate it in runtime config');
  }
}

function openDetail(row: BiasTableSummaryView) {
  void handleRequest(() => getBiasTable(row.bias_table_id)).then((detail) => {
    if (detail) {
      drawerApi.setData({ detail }).open();
    }
  });
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="Favorite-longshot bias tables">
      <template #toolbar-tools>
        <Button v-if="canFit" type="primary" @click="fit">
          Fit bias table
        </Button>
      </template>
      <template #content_hash="{ row }">
        <span class="font-mono text-xs break-all">{{ row.content_hash }}</span>
      </template>
      <template #fit_window="{ row }">
        <span class="text-xs">
          {{ formatDateTimeLocal(row.fit_window_start) }} →
          {{ formatDateTimeLocal(row.fit_window_end) }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-2">
          <Button size="small" @click="openDetail(row)">Detail</Button>
          <Button
            v-if="canActivate"
            size="small"
            type="link"
            @click="activate(row)"
          >
            Activate
          </Button>
        </div>
      </template>
    </Grid>
    <Drawer />
  </Page>
</template>
