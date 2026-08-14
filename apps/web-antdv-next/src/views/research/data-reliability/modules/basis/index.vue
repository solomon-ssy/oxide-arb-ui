<script lang="ts" setup>
import type { BasisAlertView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { acknowledgeBasisAlert, listBasisAlerts } from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { timeRangeFromFormValues } from '#/shared/components/query/time-range';
import SignedValue from '#/shared/components/signed-value.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

import {
  useBasisAlertColumns,
  useBasisAlertSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchBasisAlertsPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();

const canMutate = hasAccessByCodes(['materialization:create']);

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
    columns: useBasisAlertColumns(onActionClick, { canMutate }),
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
              open_only: formValues.open_only !== false,
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

/** Apply the canonical workspace link's market filter. */
function applyRouteMarketFilter(): void {
  const raw = route.query.market_id;
  const marketId = Array.isArray(raw) ? raw[0] : raw;
  if (typeof marketId !== 'string' || marketId === '') {
    return;
  }
  void gridApi.formApi.setValues({ market_id: marketId });
  void gridApi.query();
}

async function acknowledgeOne(row: BasisAlertView) {
  const result = await governed(
    (ctx) => acknowledgeBasisAlert(row.alert_id, { reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.basisAlerts.acknowledge.summary', {
        marketId: row.market_id,
      }),
      title: $t('page.research.basisAlerts.acknowledge.title'),
    },
  );
  if (result) {
    void gridApi.query();
  }
}

function onActionClick({ code, row }: OnActionClickParams<BasisAlertView>) {
  switch (code) {
    case 'acknowledge': {
      void acknowledgeOne(row);
      break;
    }
    // No default
  }
}

onMounted(applyRouteMarketFilter);
watch(() => route.query.market_id, applyRouteMarketFilter);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.basisAlerts.listTitle')">
      <template #basisBps="{ row }">
        <SignedValue
          :sign="Number(row.basis_bps) > Number(row.threshold_bps) ? -1 : null"
          :value="row.basis_bps"
        />
      </template>
      <template #thresholdBps="{ row }">
        <SignedValue :sign="null" :value="row.threshold_bps" />
      </template>
      <template #acknowledged="{ row }">
        <Tag v-if="row.acknowledged && row.acknowledged_by" color="success">
          {{
            $t('page.research.basisAlerts.acknowledged.yesBy', {
              actor: row.acknowledged_by,
            })
          }}
        </Tag>
        <Tag v-else-if="row.acknowledged" color="success">
          {{ $t('page.research.basisAlerts.acknowledged.yes') }}
        </Tag>
        <Tag v-else color="warning">
          {{ $t('page.research.basisAlerts.acknowledged.no') }}
        </Tag>
      </template>
    </Grid>
  </Page>
</template>
