<script lang="ts" setup>
import type {
  QuantRecommendationView,
  QuantReportDetailView,
  QuantReportDiagnosticsView,
  ReportRouteDiagnosticsView,
} from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, TabPane, Tabs } from 'antdv-next';

import {
  getQuantReport,
  getQuantReportDiagnostics,
  listReportRecommendations,
  retryReportPublication,
} from '#/api/quant-reports';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useOrderIntentStore, useQuantReportStore } from '#/store';

import { useReportActions } from '../modules/use-report-actions';
import ReportDiffPanel from '../modules/widgets/report-diff-panel.vue';
import ReportFunnelPanel from '../modules/widgets/report-funnel-panel.vue';
import ReportOverview from '../modules/widgets/report-overview.vue';
import ReportRecommendationsTable from '../modules/widgets/report-recommendations-table.vue';
import ReportRouteLineageDrawer from '../modules/widgets/report-route-lineage-drawer.vue';
import ReportTimelinePanel from '../modules/widgets/report-timeline-panel.vue';

defineOptions({ name: 'QuantReportDetailPage' });

const props = withDefaults(defineProps<{ defaultTab?: string }>(), {
  defaultTab: 'overview',
});

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const quantReportStore = useQuantReportStore();
const orderIntentStore = useOrderIntentStore();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();

const report = ref<null | QuantReportDetailView>(null);
const recommendations = ref<QuantRecommendationView[]>([]);
const diagnostics = ref<null | QuantReportDiagnosticsView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
const activeTab = ref(props.defaultTab);

const reportId = computed(() => {
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  return entity === 'report' && typeof id === 'string' ? id : '';
});
const inspectorOpen = computed({
  get: () => reportId.value !== '',
  set: (value: boolean) => {
    if (!value) goBack();
  },
});
const [RouteLineageDrawer, routeLineageDrawerApi] = useVbenDrawer({
  connectedComponent: ReportRouteLineageDrawer,
  destroyOnClose: true,
});

const REVOCABLE = new Set(['published']);
const { canRevoke, revoke } = useReportActions(() => void load());
const showRevoke = computed(
  () => canRevoke && !!report.value && REVOCABLE.has(report.value.status),
);
const showPublicationRetry = computed(
  () =>
    hasAccessByCodes(['quant_report:enqueue']) &&
    report.value?.status === 'prepared' &&
    report.value.fact_delivery?.status === 'failed',
);

const lifecycleType = computed(() => {
  switch (report.value?.status) {
    case 'prepared': {
      return 'warning';
    }
    case 'published': {
      return 'success';
    }
    case 'revoked': {
      return 'error';
    }
    default: {
      return 'info';
    }
  }
});

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
  void router.push('/trading/recommendations?module=reports');
}

function openRecommendation(recommendation: QuantRecommendationView) {
  void router.push({
    path: '/trading/recommendations',
    query: {
      entity: 'recommendation',
      id: recommendation.recommendation_id,
      module: 'queue',
    },
  });
}

function openRouteLineage(route: ReportRouteDiagnosticsView) {
  routeLineageDrawerApi.setData({ route }).open();
}

function onRevoke() {
  if (report.value) {
    void revoke(report.value);
  }
}

function openRun() {
  const id = report.value?.run?.report_run_id;
  if (id) {
    void router.push(
      `/trading/recommendations?module=reports&entity=report-run&id=${id}`,
    );
  }
}

async function retryPublication() {
  const current = report.value;
  if (!current) return;
  const result = await governed(
    (ctx) =>
      retryReportPublication(
        current.recommendation_report_id,
        { reason: ctx.reason, request_id: crypto.randomUUID() },
        ctx,
      ),
    {
      summary: $t('page.quantReports.detail.publicationRetrySummary', {
        id: current.recommendation_report_id,
      }),
      title: $t('page.quantReports.detail.publicationRetry'),
    },
  );
  if (result) await load();
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
  <WorkspaceInspectorSurface
    v-model:open="inspectorOpen"
    test-id="report-detail-workspace"
    :title="$t('page.quantReports.listTitle')"
  >
    <div class="mb-4 flex items-center justify-end">
      <div class="flex gap-2">
        <Button v-if="report?.run" @click="openRun">
          {{ $t('page.quantReports.detail.openRun') }}
        </Button>
        <Button v-if="showPublicationRetry" danger @click="retryPublication">
          {{ $t('page.quantReports.detail.publicationRetry') }}
        </Button>
        <Button v-if="showRevoke" danger @click="onRevoke">
          {{ $t('page.quantReports.actions.revoke') }}
        </Button>
      </div>
    </div>
    <AsyncState
      :error-message="loadError"
      :loading="loading"
      :not-found="!report && !loading && !loadError"
      :not-found-text="$t('page.quantReports.detail.notFound')"
      @retry="load"
    >
      <div v-if="report" class="mb-4">
        <Alert
          data-testid="report-lifecycle-banner"
          :description="
            $t(`page.quantReports.detail.lifecycle.${report.status}`)
          "
          :message="$t(`enum.recommendationReportStatus.${report.status}`)"
          show-icon
          :type="lifecycleType"
        >
          <template #action>
            <div class="flex gap-2">
              <EntityRouteLink
                v-if="report.predecessor_report_id"
                class="!text-inherit underline"
                :label="$t('page.quantReports.detail.predecessor')"
                :to="`/trading/recommendations?module=reports&entity=report&id=${report.predecessor_report_id}`"
              />
              <EntityRouteLink
                v-if="report.successor_report_id"
                class="!text-inherit underline"
                :label="$t('page.quantReports.detail.successor')"
                :to="`/trading/recommendations?module=reports&entity=report&id=${report.successor_report_id}`"
              />
            </div>
          </template>
        </Alert>
      </div>
      <Tabs v-if="report" v-model:active-key="activeTab" destroy-on-hidden>
        <TabPane
          key="overview"
          :tab="$t('page.quantReports.detail.tabs.overview')"
        >
          <ReportOverview
            :diagnostics="diagnostics"
            :report="report"
            @select-route="openRouteLineage"
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
        <TabPane
          key="timeline"
          :tab="$t('page.quantReports.detail.tabs.timeline')"
        >
          <ReportTimelinePanel :report-id="report.recommendation_report_id" />
        </TabPane>
      </Tabs>
    </AsyncState>
    <RouteLineageDrawer />
  </WorkspaceInspectorSurface>
</template>
