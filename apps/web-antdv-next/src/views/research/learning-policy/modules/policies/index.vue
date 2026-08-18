<script lang="ts" setup>
import type { TradePolicySummaryView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listTradePolicies } from '#/api/trade-policies';
import { $t } from '#/locales';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { tradePolicyOpenPath } from '#/shared/routes/research-plane';

import { useTradePolicyColumns } from './modules/schemas/table-columns';

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

const [Grid] = useVbenVxeGrid<TradePolicySummaryView>({
  gridOptions: {
    columns: useTradePolicyColumns(onActionClick),
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
  await router.push(tradePolicyOpenPath(row.artifact_id));
}

function openFit() {
  void router.push('/research/learning-policy?module=fits');
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
