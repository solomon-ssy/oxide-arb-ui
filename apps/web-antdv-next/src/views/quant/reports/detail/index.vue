<script lang="ts" setup>
import type {
  QuantRecommendationView,
  QuantReportDetailView,
  QuantReportDiagnosticsView,
} from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, TabPane, Tabs } from 'antdv-next';

import {
  getQuantReport,
  getQuantReportDiagnostics,
  listReportRecommendations,
} from '#/api/quant-reports';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import DetailBackNav from '#/shared/components/detail-back-nav.vue';
import { useOrderIntentStore, useQuantReportStore } from '#/store';
import RecommendationDetailDrawer from '#/views/quant/recommendations/modules/recommendation-detail-drawer.vue';

import { useReportActions } from '../modules/use-report-actions';
import ReportDiffPanel from '../modules/widgets/report-diff-panel.vue';
import ReportFunnelPanel from '../modules/widgets/report-funnel-panel.vue';
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
const diagnostics = ref<null | QuantReportDiagnosticsView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
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
  loadError.value = null;
  try {
    const result = await handleRequest(
      async () => {
        const [detail, recs, evidence] = await Promise.all([
          getQuantReport(reportId.value),
          listReportRecommendations(reportId.value),
          getQuantReportDiagnostics(reportId.value),
        ]);
        return { detail, evidence, recs };
      },
      {
        silent: true,
        onError: (err) => {
          if (err.httpStatus !== 404) {
            loadError.value = err.message;
          }
        },
      },
    );
    report.value = result?.detail ?? null;
    recommendations.value = result?.recs ?? [];
    diagnostics.value = result?.evidence ?? null;
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

function onRevoke() {
  if (report.value) {
    void revoke(report.value);
  }
}

watch(reportId, () => void load());
watch(
  () => quantReportStore.revision,
  () => void load(),
);
watch(
  () => orderIntentStore.revision,
  () => void load(),
);
onMounted(() => void load());
</script>

<template>
  <Page auto-content-height>
    <div class="mb-4 flex items-center justify-between">
      <DetailBackNav
        :label="$t('page.quantReports.detail.back')"
        @back="goBack"
      />
      <Button v-if="showRevoke" danger @click="onRevoke">
        {{ $t('page.quantReports.actions.revoke') }}
      </Button>
    </div>
    <AsyncState
      :error-message="loadError"
      :loading="loading"
      :not-found="!report && !loading && !loadError"
      :not-found-text="$t('page.quantReports.detail.notFound')"
      @retry="load"
    >
      <Tabs v-if="report" v-model:active-key="activeTab" destroy-on-hidden>
        <TabPane
          key="overview"
          :tab="$t('page.quantReports.detail.tabs.overview')"
        >
          <ReportOverview :diagnostics="diagnostics" :report="report" />
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
        <TabPane key="funnel" :tab="$t('page.quantReports.detail.tabs.funnel')">
          <ReportFunnelPanel
            v-if="report.fact_delivery?.status === 'verified'"
            :report-id="report.recommendation_report_id"
          />
          <Alert
            v-else
            :description="
              $t('page.quantReports.detail.factDelivery.funnelBlocked')
            "
            :message="$t('page.quantReports.detail.factDelivery.notVerified')"
            show-icon
            type="warning"
          />
        </TabPane>
        <TabPane key="diff" :tab="$t('page.quantReports.detail.tabs.diff')">
          <ReportDiffPanel :report="report" />
        </TabPane>
      </Tabs>
    </AsyncState>
    <RecDrawer />
  </Page>
</template>
