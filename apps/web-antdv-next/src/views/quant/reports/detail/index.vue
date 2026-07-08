<script lang="ts" setup>
import type {
  QuantRecommendationView,
  QuantReportDetailView,
} from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, Empty, Spin, TabPane, Tabs } from 'antdv-next';

import { getQuantReport, listReportRecommendations } from '#/api/quant-reports';
import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';
import { useOrderIntentStore, useQuantReportStore } from '#/store';
import RecommendationDetailDrawer from '#/views/quant/recommendations/modules/recommendation-detail-drawer.vue';

import { useReportActions } from '../modules/use-report-actions';
import ReportDiffPanel from '../modules/widgets/report-diff-panel.vue';
import ReportOverview from '../modules/widgets/report-overview.vue';
import ReportRecommendationsTable from '../modules/widgets/report-recommendations-table.vue';

defineOptions({ name: 'QuantReportDetailPage' });

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const quantReportStore = useQuantReportStore();
const orderIntentStore = useOrderIntentStore();

const report = ref<null | QuantReportDetailView>(null);
const recommendations = ref<QuantRecommendationView[]>([]);
const maxAggregateExposurePct = ref<number | undefined>();
const loading = ref(false);
const activeTab = ref('overview');

const reportId = computed(() => route.params.id as string);

const [RecDrawer, recDrawerApi] = useVbenDrawer({
  connectedComponent: RecommendationDetailDrawer,
  destroyOnClose: true,
});

const REVOCABLE = new Set(['published', 'published_empty']);
const { canRevoke, revoke } = useReportActions(() => void load());
const showRevoke = computed(
  () => canRevoke && !!report.value && REVOCABLE.has(report.value.status),
);

async function load() {
  if (!reportId.value) {
    return;
  }
  loading.value = true;
  try {
    const result = await handleRequest(
      async () => {
        const [detail, recs] = await Promise.all([
          getQuantReport(reportId.value),
          listReportRecommendations(reportId.value),
        ]);
        return { detail, recs };
      },
      { silent: true },
    );
    report.value = result?.detail ?? null;
    recommendations.value = result?.recs ?? [];
    maxAggregateExposurePct.value = await resolveMaxAggregateExposurePct(
      result?.detail?.runtime_config_version_id,
    );
  } finally {
    loading.value = false;
  }
}

function goBack() {
  void router.push('/quant/reports');
}

function openRecommendation(recommendation: QuantRecommendationView) {
  recDrawerApi.setData({ recommendation }).open();
}

async function resolveMaxAggregateExposurePct(
  runtimeConfigVersionId?: string,
): Promise<number | undefined> {
  if (!runtimeConfigVersionId) {
    return undefined;
  }
  const versions = await handleRequest(
    () => fetchRuntimeConfigVersions({ limit: 500 }),
    { silent: true },
  );
  const match = versions?.find(
    (version) => version.runtime_config_version_id === runtimeConfigVersionId,
  );
  const raw = (
    match?.config_json as {
      portfolio?: {
        kelly_safety?: { max_aggregate_exposure_pct?: { value?: string } };
      };
    }
  )?.portfolio?.kelly_safety?.max_aggregate_exposure_pct?.value;
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function onRevoke() {
  if (report.value) {
    void revoke(report.value);
  }
}

watch(reportId, () => void load());
// Report lifecycle (revoke/expire/publish) arrives on `quant.report`.
watch(
  () => quantReportStore.revision,
  () => void load(),
);
// Intent lifecycle updates recommendation status / blocking intent on this report.
watch(
  () => orderIntentStore.revision,
  () => void load(),
);
onMounted(() => void load());
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 flex items-center justify-between">
      <Button type="link" @click="goBack">
        {{ $t('page.quantReports.detail.back') }}
      </Button>
      <Button v-if="showRevoke" danger @click="onRevoke">
        {{ $t('page.quantReports.actions.revoke') }}
      </Button>
    </div>
    <Spin :spinning="loading">
      <template v-if="report">
        <Tabs v-model:active-key="activeTab" destroy-inactive-tab-pane>
          <TabPane
            key="overview"
            :tab="$t('page.quantReports.detail.tabs.overview')"
          >
            <ReportOverview
              :max-aggregate-exposure-pct="maxAggregateExposurePct"
              :report="report"
            />
          </TabPane>
          <TabPane
            key="recommendations"
            :tab="$t('page.quantReports.detail.tabs.recommendations')"
          >
            <ReportRecommendationsTable
              :recommendations="recommendations"
              @select="openRecommendation"
            />
          </TabPane>
          <TabPane key="diff" :tab="$t('page.quantReports.detail.tabs.diff')">
            <ReportDiffPanel :report="report" />
          </TabPane>
        </Tabs>
      </template>
      <Empty
        v-else-if="!loading"
        :description="$t('page.quantReports.detail.notFound')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </Spin>
    <RecDrawer />
  </Page>
</template>
