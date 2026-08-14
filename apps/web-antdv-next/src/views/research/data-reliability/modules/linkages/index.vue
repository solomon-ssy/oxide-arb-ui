<script lang="ts" setup>
import type {
  LinkageResolveSummaryView,
  MarketLinkageSummaryView,
} from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { onMounted, ref, watch } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Badge, Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getMarketLinkage,
  listMarketLinkages,
  resolveMarketLinkages,
} from '#/api/vertical-alpha';
import { $t } from '#/locales';
import { timeRangeFromFormValues } from '#/shared/components/query/time-range';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useWorkspaceInspectorRoute } from '#/shared/composables/use-workspace-inspector-route';
import { useResearchStore } from '#/store';

import LinkageDetailDrawer from './modules/linkage-detail-drawer.vue';
import LinkageOverrideDrawer from './modules/linkage-override-drawer.vue';
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
  onOpenChange: (open) => onInspectorOpenChange(open),
});

const [OverrideDrawer, overrideDrawerApi] = useVbenDrawer({
  connectedComponent: LinkageOverrideDrawer,
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
          const { from, to } = timeRangeFromFormValues(formValues);
          const result = await handleRequest(() =>
            listMarketLinkages({
              family: (formValues.family as string) || undefined,
              from,
              latest_only: formValues.latest_only !== false,
              market_id: (formValues.market_id as string) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              status: (formValues.status as string) || undefined,
              to,
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
  () => {
    void gridApi.query();
    void refreshUnresolvedCount();
  },
);

/** Unresolved-queue count badge — an independent lightweight page-1/size-1
 * probe so the toolbar reflects total triage backlog, not just the current
 * page/filter view. */
const unresolvedCount = ref(0);

async function refreshUnresolvedCount(): Promise<void> {
  const result = await handleRequest(
    () =>
      listMarketLinkages({
        latest_only: true,
        page: 1,
        size: 1,
        status: 'unresolved',
      }),
    { silent: true },
  );
  unresolvedCount.value = result?.total ?? 0;
}

function openUnresolvedQueue(): void {
  void gridApi.formApi.setValues({
    family: undefined,
    latest_only: true,
    market_id: undefined,
    status: 'unresolved',
  });
  void gridApi.query();
}

onMounted(refreshUnresolvedCount);

/** Every counter the resolve summary carries, not just resolved/unresolved. */
function resolveFeedback(summary: LinkageResolveSummaryView): string {
  return $t('page.research.marketLinkages.resolve.feedback', {
    appended: summary.appended,
    examined: summary.examined,
    resolved: summary.resolved,
    unchanged: summary.unchanged,
    unresolved: summary.unresolved,
  });
}

async function resolveAll() {
  const summary = await governed(
    (ctx) => resolveMarketLinkages({ market_ids: [], reason: ctx.reason }, ctx),
    {
      summary: $t('page.research.marketLinkages.resolve.summary'),
      title: $t('page.research.marketLinkages.resolve.title'),
    },
  );
  if (summary) {
    message.success(resolveFeedback(summary));
    void gridApi.query();
    void refreshUnresolvedCount();
  }
}

function openDetail(row: MarketLinkageSummaryView) {
  openInspector(row.market_id);
}

function openOverride(row: MarketLinkageSummaryView) {
  overrideDrawerApi
    .setData({
      alreadyResolved: row.status === 'resolved' || row.status === 'overridden',
      marketId: row.market_id,
    })
    .open();
}

async function resolveOne(row: MarketLinkageSummaryView) {
  const summary = await governed(
    (ctx) =>
      resolveMarketLinkages(
        { market_ids: [row.market_id], reason: ctx.reason },
        ctx,
      ),
    {
      summary: $t('page.research.marketLinkages.resolveOne.summary', {
        marketId: row.market_id,
      }),
      title: $t('page.research.marketLinkages.resolveOne.title'),
    },
  );
  if (summary) {
    message.success(resolveFeedback(summary));
    void gridApi.query();
    void refreshUnresolvedCount();
  }
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
    case 'resolve': {
      void resolveOne(row);
      break;
    }
    // No default
  }
}

const { onInspectorOpenChange, openInspector } = useWorkspaceInspectorRoute({
  close: () => drawerApi.close?.(),
  entity: 'market-linkage',
  fetch: (id) => getMarketLinkage(id),
  open: (detail) => drawerApi.setData({ detail }).open(),
});
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.research.marketLinkages.listTitle')">
      <template #toolbar-tools>
        <Badge :count="unresolvedCount" :overflow-count="999">
          <Button @click="openUnresolvedQueue">
            {{ $t('page.research.marketLinkages.actions.unresolvedQueue') }}
          </Button>
        </Badge>
        <Button v-if="canMutate" type="primary" @click="resolveAll">
          {{ $t('page.research.marketLinkages.actions.reResolveAll') }}
        </Button>
      </template>
      <template #sourceBindings="{ row }">
        <div
          v-if="row.source_bindings.length > 0"
          class="flex flex-col gap-0.5"
        >
          <span
            v-for="source in row.source_bindings"
            :key="`${source.role}:${source.source_id}:${source.instrument_key}`"
            class="break-all font-mono text-xs"
          >
            {{ source.role }} · {{ source.source_id }} ·
            {{ source.instrument_key }}
          </span>
        </div>
        <span v-else class="text-muted-foreground">
          {{ $t('page.research.marketLinkages.emptySourceBindings') }}
        </span>
      </template>
    </Grid>
    <Drawer />
    <OverrideDrawer
      @success="
        () => {
          gridApi.query();
          refreshUnresolvedCount();
        }
      "
    />
  </Page>
</template>
