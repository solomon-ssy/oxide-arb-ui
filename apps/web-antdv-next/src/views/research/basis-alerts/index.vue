<script lang="ts" setup>
import type { BasisAlertView } from '@vben/types';

import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { listBasisAlerts } from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { timeRangeFromFormValues } from '#/shared/components/query/time-range';

import {
  useBasisAlertColumns,
  useBasisAlertSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchBasisAlertsPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();

const emptyPage = {
  has_next: false,
  items: [] as BasisAlertView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<BasisAlertView>({
  formOptions: { schema: useBasisAlertSearchSchema() },
  gridOptions: {
    columns: useBasisAlertColumns(),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const { from, to } = timeRangeFromFormValues(formValues);
          const result = await handleRequest(() =>
            listBasisAlerts({
              from,
              market_id: (formValues.market_id as string) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              to,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'alert_id' },
    sortConfig: { defaultSort: { field: 'as_of', order: 'desc' } },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

/** Deep-link from linkage detail: `/research/basis-alerts?market_id=…` */
function applyRouteMarketFilter(): void {
  const raw = route.query.market_id;
  const marketId = Array.isArray(raw) ? raw[0] : raw;
  if (typeof marketId !== 'string' || marketId === '') {
    return;
  }
  void gridApi.formApi.setValues({ market_id: marketId });
  void gridApi.query();
}

onMounted(applyRouteMarketFilter);
watch(() => route.query.market_id, applyRouteMarketFilter);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.basisAlerts.listTitle')">
      <template #basisBps="{ row }">
        <span
          class="font-medium"
          :class="
            Number(row.basis_bps) > Number(row.threshold_bps)
              ? 'text-destructive'
              : ''
          "
        >
          {{ row.basis_bps }}
        </span>
      </template>
    </Grid>
  </Page>
</template>
