<script lang="ts" setup>
import type { BacktestReportView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Card, Descriptions, DescriptionsItem, Spin } from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { getBacktestReport } from '#/api/research';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

defineOptions({ name: 'BacktestDetailDrawer' });

interface BacktestDrawerData {
  report: BacktestReportView;
}

const { handleRequest } = useRequestHandler();

const report = ref<BacktestReportView | null>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const expectedVsRealized = computed(
  () => report.value?.expected_vs_realized ?? {},
);
const categoryBreakdown = computed(
  () => report.value?.category_breakdown ?? [],
);
const pnlSimulation = computed(() => report.value?.report_pnl_simulation ?? {});

async function refresh(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getBacktestReport(id), {
      silent: true,
    });
    if (openId.value === id) {
      report.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<BacktestDrawerData>();
      openId.value = data.report.backtest_report_id;
      report.value = data.report;
      void refresh(data.report.backtest_report_id);
    } else {
      openId.value = null;
      report.value = null;
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.research.backtests.detail.title')"
    class="w-full max-w-3xl"
  >
    <Spin :spinning="loading">
      <div v-if="report" class="flex flex-col gap-4">
        <Card
          size="small"
          :title="$t('page.research.backtests.detail.summary')"
        >
          <Descriptions :column="2" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.backtests.columns.modelVersionId')"
            >
              <EntityRouteLink
                mono
                :label="report.model_version_id"
                :to="`/research/models?open=${report.model_version_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.detail.modelRunId')"
            >
              <span class="font-mono text-xs break-all">
                {{ report.model_run_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.columns.rankIc')"
            >
              {{ report.rank_ic }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.columns.hitRate')"
            >
              {{ report.hit_rate }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.columns.coverage')"
            >
              {{ report.coverage }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.detail.maxDrawdown')"
            >
              {{ report.max_drawdown }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.detail.turnover')"
            >
              {{ report.turnover }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.detail.tailLoss')"
            >
              {{ report.tail_loss }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.columns.sampleCount')"
            >
              {{ report.sample_count }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.backtests.columns.createdAt')"
            >
              {{ formatDateTimeLocal(report.created_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="report.comparison_report_id"
              :label="$t('page.research.backtests.detail.comparison')"
            >
              <EntityRouteLink
                mono
                :label="report.comparison_report_id"
                :to="`/research/comparisons/${report.comparison_report_id}`"
              />
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.backtests.detail.expectedVsRealized')"
        >
          <JsonEditorShell
            :model-value="expectedVsRealized"
            :mode="Mode.tree"
            read-only
          />
        </Card>

        <Card
          size="small"
          :title="$t('page.research.backtests.detail.categoryBreakdown')"
        >
          <JsonEditorShell
            :model-value="categoryBreakdown"
            :mode="Mode.tree"
            read-only
          />
        </Card>

        <Card
          size="small"
          :title="$t('page.research.backtests.detail.pnlSimulation')"
        >
          <JsonEditorShell
            :model-value="pnlSimulation"
            :mode="Mode.tree"
            read-only
          />
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
