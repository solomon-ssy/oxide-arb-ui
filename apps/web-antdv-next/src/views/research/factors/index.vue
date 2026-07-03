<script lang="ts" setup>
import type { FactorDefinitionView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getFactor,
  listFactors,
  publishFactor,
  retireFactor,
} from '#/api/research';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQueryOpenDrawer } from '#/shared/composables/use-route-query-sync';
import { useResearchStore } from '#/store';

import FactorDetailDrawer from './modules/factor-detail-drawer.vue';
import {
  useFactorDefinitionColumns,
  useFactorDefinitionSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchFactorsPage' });

const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const researchStore = useResearchStore();

const access = {
  canPublish: hasAccessByCodes(['factor_definition:publish']),
  canRetire: hasAccessByCodes(['factor_definition:retire']),
};

const emptyPage = {
  has_next: false,
  items: [] as FactorDefinitionView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: FactorDetailDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<FactorDefinitionView>({
  formOptions: { schema: useFactorDefinitionSearchSchema() },
  gridOptions: {
    columns: useFactorDefinitionColumns(onActionClick, access),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const result = await handleRequest(() =>
            listFactors({
              factor_family: (formValues.factor_family as any) || undefined,
              page: page.currentPage,
              scope: (formValues.scope as any) || undefined,
              size: page.pageSize,
              status: (formValues.status as any) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'factor_definition_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

async function publish(factor: FactorDefinitionView) {
  const id = factor.factor_definition_id;
  const result = await governed(
    (ctx) => publishFactor(id, { reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.factors.publish.summary', {
        name: factor.name,
      }),
      title: $t('page.research.factors.publish.title'),
    },
  );
  if (result) {
    message.success($t('page.research.factors.publish.feedback'));
    void gridApi.query();
  }
}

async function retire(factor: FactorDefinitionView) {
  const id = factor.factor_definition_id;
  const result = await governed(
    (ctx) => retireFactor(id, { reason: ctx.reason }, ctx),
    {
      confirmWord: 'RETIRE',
      danger: true,
      summary: $t('page.research.factors.retire.summary', {
        name: factor.name,
      }),
      title: $t('page.research.factors.retire.title'),
    },
  );
  if (result) {
    message.success($t('page.research.factors.retire.feedback'));
    void gridApi.query();
  }
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<FactorDefinitionView>) {
  switch (code) {
    case 'detail': {
      drawerApi.setData({ factor: row }).open();
      break;
    }
    case 'publish': {
      void publish(row);
      break;
    }
    case 'retire': {
      void retire(row);
      break;
    }
    // No default
  }
}

useQueryOpenDrawer({
  fetch: (id) => getFactor(id),
  open: (factor) => drawerApi.setData({ factor }).open(),
});

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.factors.listTitle')" />
    <Drawer />
  </Page>
</template>
