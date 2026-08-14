<script lang="ts" setup>
import type { FactorDefinitionView } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { ref, watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getFactor, listFactors } from '#/api/research';
import { $t } from '#/locales';
import { useWorkspaceInspectorRoute } from '#/shared/composables/use-workspace-inspector-route';
import { useResearchStore } from '#/store';

import FactorCollinearityDrawer from './modules/factor-collinearity-drawer.vue';
import FactorDetailDrawer from './modules/factor-detail-drawer.vue';
import {
  useFactorDefinitionColumns,
  useFactorDefinitionSearchSchema,
} from './modules/schemas';

defineOptions({ name: 'ResearchFactorsPage' });

const { handleRequest } = useRequestHandler();
const researchStore = useResearchStore();

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
  onOpenChange: (open) => onInspectorOpenChange(open),
});

const collinearityRef = ref<InstanceType<typeof FactorCollinearityDrawer>>();

const [Grid, gridApi] = useVbenVxeGrid<FactorDefinitionView>({
  formOptions: { schema: useFactorDefinitionSearchSchema() },
  gridOptions: {
    columns: useFactorDefinitionColumns(onActionClick),
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

function onActionClick({
  code,
  row,
}: OnActionClickParams<FactorDefinitionView>) {
  switch (code) {
    case 'detail': {
      openInspector(row.factor_definition_id);
      break;
    }
    // No default
  }
}

const { onInspectorOpenChange, openInspector } = useWorkspaceInspectorRoute({
  close: () => drawerApi.close?.(),
  entity: 'factor',
  fetch: async (id) => {
    const detail = await getFactor(id);
    return detail.definition;
  },
  open: (factor) => drawerApi.setData({ factor }).open(),
});

watch(
  () => researchStore.revision,
  () => void gridApi.query(),
);
</script>

<template>
  <Page auto-content-height data-testid="factors-page">
    <Grid :table-title="$t('page.research.factors.listTitle')">
      <template #toolbar-tools>
        <Button
          class="min-h-11"
          type="primary"
          @click="collinearityRef?.open()"
        >
          {{ $t('page.research.factors.collinearity.action') }}
        </Button>
      </template>
    </Grid>
    <Drawer />
    <FactorCollinearityDrawer ref="collinearityRef" />
  </Page>
</template>
