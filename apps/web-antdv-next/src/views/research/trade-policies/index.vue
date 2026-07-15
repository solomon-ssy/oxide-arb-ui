<script lang="ts" setup>
import type { TradePolicySummaryView } from '@vben/types';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listTradePolicies } from '#/api/trade-policies';
import { $t } from '#/locales';
import { useQpAccess } from '#/shared/composables/use-qp-access';

defineOptions({ name: 'ResearchTradePoliciesPage' });

const { handleRequest } = useRequestHandler();
const router = useRouter();
const { hasAccessByCodes } = useQpAccess();
const canFit = hasAccessByCodes(['materialization:create']);
const emptyPage = {
  has_next: false,
  items: [] as TradePolicySummaryView[],
  page: 1,
  size: 0,
  total: 0,
};

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
    title: $t('page.research.tradePolicies.columns.operation'),
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
  await router.push(`/research/trade-policies/${row.artifact_id}`);
}

function openFit() {
  void router.push('/research/trade-policy-fits/new');
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
  </Page>
</template>
