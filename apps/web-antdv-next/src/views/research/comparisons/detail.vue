<script lang="ts" setup>
import type { ModelComparisonReportView } from '@vben/types';

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Card, Descriptions, DescriptionsItem, Empty, Spin } from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { getComparisonReport } from '#/api/research';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

defineOptions({ name: 'ResearchComparisonDetailPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();

const report = ref<ModelComparisonReportView | null>(null);
const loading = ref(false);

const categoryDiff = computed(
  () => report.value?.category_breakdown_diff ?? [],
);

onMounted(async () => {
  const id = route.params.id;
  if (typeof id !== 'string' || !id) {
    return;
  }
  loading.value = true;
  try {
    report.value = await handleRequest(() => getComparisonReport(id), {
      silent: true,
    });
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <div v-if="report" class="flex flex-col gap-4">
        <Card
          size="small"
          :title="$t('page.research.comparisons.detail.summary')"
        >
          <Descriptions :column="2" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.candidate')"
            >
              <EntityRouteLink
                mono
                :label="report.candidate_model_version_id"
                :to="`/research/models?open=${report.candidate_model_version_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.baseline')"
            >
              <EntityRouteLink
                mono
                :label="report.baseline_model_version_id"
                :to="`/research/models?open=${report.baseline_model_version_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.rankIcDelta')"
            >
              {{ report.rank_ic_delta }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.hitRateDelta')"
            >
              {{ report.hit_rate_delta }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.realizedPnlDelta')"
            >
              {{ report.realized_pnl_delta }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.scoreCorrelation')"
            >
              {{ report.score_correlation }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.sideDisagreement')"
            >
              {{ report.side_disagreement_rate }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.commonSamples')"
            >
              {{ report.common_samples }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.candidateReport')"
            >
              <EntityRouteLink
                mono
                :label="report.candidate_report_id"
                :to="`/research/backtests?open=${report.candidate_report_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.baselineReport')"
            >
              <EntityRouteLink
                mono
                :label="report.baseline_report_id"
                :to="`/research/backtests?open=${report.baseline_report_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.comparisons.detail.createdAt')"
            >
              {{ formatDateTimeLocal(report.created_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.comparisons.detail.categoryDiff')"
        >
          <JsonEditorShell
            :model-value="categoryDiff"
            :mode="Mode.tree"
            read-only
          />
        </Card>
      </div>
      <Empty
        v-else-if="!loading"
        :description="$t('page.research.comparisons.detail.notFound')"
      />
    </Spin>
  </Page>
</template>
