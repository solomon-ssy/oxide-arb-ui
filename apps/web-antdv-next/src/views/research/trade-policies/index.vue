<script lang="ts" setup>
import type {
  TradePolicyFitContract,
  TradePolicySummaryView,
} from '@vben/types';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { useRouter } from 'vue-router';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  fitTradePolicy,
  getTradePolicy,
  listTradePolicies,
} from '#/api/trade-policies';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';

import TradePolicyDetailDrawer from './modules/trade-policy-detail-drawer.vue';
import TradePolicyFitModal from './modules/trade-policy-fit-modal.vue';

defineOptions({ name: 'ResearchTradePoliciesPage' });

const { handleRequest } = useRequestHandler();
const router = useRouter();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const canFit = hasAccessByCodes(['materialization:create']);
const emptyPage = {
  has_next: false,
  items: [] as TradePolicySummaryView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: TradePolicyDetailDrawer,
  destroyOnClose: true,
});

const [FitModal, fitModalApi] = useVbenModal({
  connectedComponent: TradePolicyFitModal,
  destroyOnClose: true,
});

const columns: VxeTableGridOptions<TradePolicySummaryView>['columns'] = [
  {
    field: 'artifact_id',
    minWidth: 180,
    title: $t('page.research.tradePolicies.columns.artifactId'),
  },
  {
    field: 'status',
    width: 120,
    title: $t('page.research.tradePolicies.columns.status'),
  },
  {
    field: 'source_dataset_id',
    minWidth: 180,
    title: $t('page.research.tradePolicies.columns.dataset'),
  },
  {
    field: 'cohort_count',
    width: 100,
    title: $t('page.research.tradePolicies.columns.cohorts'),
  },
  {
    field: 'executable_coverage',
    width: 120,
    title: $t('page.research.tradePolicies.columns.coverage'),
  },
  {
    cellRender: { name: 'CellDateTime' },
    field: 'created_at',
    width: 170,
    title: $t('page.research.tradePolicies.columns.createdAt'),
  },
  {
    cellRender: {
      attrs: { nameField: 'artifact_id', onClick: onActionClick },
      name: 'CellOperation',
      options: [{ code: 'detail', text: $t('common.detail') }],
    },
    field: 'operation',
    fixed: 'right',
    title: $t('common.action'),
    width: 100,
  },
];

const [Grid] = useVbenVxeGrid<TradePolicySummaryView>({
  gridOptions: {
    columns,
    proxyConfig: {
      ajax: {
        query: async ({
          page,
        }: {
          page: { currentPage: number; pageSize: number };
        }) =>
          (await handleRequest(() =>
            listTradePolicies({
              page: page.currentPage,
              size: page.pageSize,
            }),
          )) ?? emptyPage,
      },
    },
    rowConfig: { keyField: 'artifact_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

async function onActionClick({
  row,
}: OnActionClickParams<TradePolicySummaryView>) {
  const detail = await handleRequest(() => getTradePolicy(row.artifact_id));
  if (detail) drawerApi.setData({ detail }).open();
}

useQueryOpenDrawer({
  fetch: (id) => getTradePolicy(id),
  open: (detail) => drawerApi.setData({ detail }).open(),
});

function openFit() {
  fitModalApi
    .setData({
      onSubmit: async (contract: TradePolicyFitContract) => {
        const job = await governed(
          (context) =>
            fitTradePolicy({ contract, reason: context.reason }, context),
          {
            summary: $t('page.research.tradePolicies.fit.summary'),
            title: $t('page.research.tradePolicies.fit.title'),
          },
        );
        if (!job) {
          return false;
        }
        message.success($t('page.research.tradePolicies.fit.queued'));
        void router.push(`/research/jobs?open=${job.job_id}`);
        return true;
      },
    })
    .open();
}
</script>

<template>
  <Page :title="$t('page.research.tradePolicies.title')">
    <Grid>
      <template #toolbar-tools>
        <Button v-if="canFit" type="primary" @click="openFit">
          {{ $t('page.research.tradePolicies.fit.action') }}
        </Button>
      </template>
    </Grid>
    <Drawer />
    <FitModal />
  </Page>
</template>
