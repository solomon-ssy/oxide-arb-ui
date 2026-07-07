<script lang="ts" setup>
import type { MarketLinkageSummaryView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getMarketLinkage,
  listMarketLinkages,
  resolveMarketLinkages,
} from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import LinkageDetailDrawer from './modules/linkage-detail-drawer.vue';
import LinkageOverrideModal from './modules/linkage-override-modal.vue';
import {
  useMarketLinkageColumns,
  useMarketLinkageSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchMarketLinkagesPage' });

const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const canMutate = hasAccessByCodes(['materialization:create']);

const emptyPage = {
  has_next: false,
  items: [] as MarketLinkageSummaryView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: LinkageDetailDrawer,
  destroyOnClose: true,
});

const [OverrideModal, overrideModalApi] = useVbenDrawer({
  connectedComponent: LinkageOverrideModal,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<MarketLinkageSummaryView>({
  formOptions: { schema: useMarketLinkageSearchSchema() },
  gridOptions: {
    columns: useMarketLinkageColumns(onActionClick, { canMutate }),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const result = await handleRequest(() =>
            listMarketLinkages({
              family: (formValues.family as string) || undefined,
              latest_only: formValues.latest_only !== false,
              market_id: (formValues.market_id as string) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              status: (formValues.status as string) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'linkage_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);

async function resolveAll() {
  const summary = await governed(
    (ctx) => resolveMarketLinkages({ market_ids: [], reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.marketLinkages.resolve.summary'),
      title: $t('page.research.marketLinkages.resolve.title'),
    },
  );
  if (summary) {
    message.success(
      $t('page.research.marketLinkages.resolve.feedback', {
        resolved: summary.resolved,
        unresolved: summary.unresolved,
      }),
    );
    void gridApi.query();
  }
}

function openDetail(row: MarketLinkageSummaryView) {
  void handleRequest(() => getMarketLinkage(row.market_id)).then((detail) => {
    if (detail) {
      drawerApi.setData({ detail }).open();
    }
  });
}

function openOverride(row: MarketLinkageSummaryView) {
  overrideModalApi.setData({ marketId: row.market_id }).open();
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<MarketLinkageSummaryView>) {
  switch (code) {
    case 'detail': {
      openDetail(row);
      break;
    }
    case 'override': {
      openOverride(row);
      break;
    }
    // No default
  }
}

useQueryOpenDrawer({
  fetch: (id) => getMarketLinkage(id),
  open: (detail) => drawerApi.setData({ detail }).open(),
});
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.marketLinkages.listTitle')">
      <template #toolbar-tools>
        <Button v-if="canMutate" type="primary" @click="resolveAll">
          {{ $t('page.research.marketLinkages.actions.reResolveAll') }}
        </Button>
      </template>
      <template #instrument="{ row }">
        <span class="break-all font-mono text-xs">
          {{
            row.instrument_key ??
            $t('page.research.marketLinkages.emptyInstrument')
          }}
        </span>
      </template>
    </Grid>
    <Drawer />
    <OverrideModal @success="gridApi.query()" />
  </Page>
</template>
