<script lang="ts" setup>
import type {
  DataQualitySnapshot,
  EquitySnapshotView,
  LiveAccountView,
  QuantReportDetailView,
} from '@vben/types';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, Empty, Tag } from 'antdv-next';

import { getLatestEquitySnapshotOptional, getLiveAccount } from '#/api/account';
import { getDataQualitySnapshot } from '#/api/data-quality';
import { getLatestQuantReportOptional } from '#/api/quant-reports';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQpWs } from '#/shared/composables/use-qp-ws';
import { useRunReportAction } from '#/shared/composables/use-run-report-action';
import { useSystemStatusBootstrap } from '#/shared/composables/use-system-status';
import { useQuantReportStore, useSystemStore } from '#/store';

import DataQualityChart from './modules/widgets/data-quality-chart.vue';
import ExecutionPipelineCard from './modules/widgets/execution-pipeline-card.vue';
import ExecutionRecoveryCard from './modules/widgets/execution-recovery-card.vue';
import ExposureTopNCard from './modules/widgets/exposure-topn-card.vue';
import KpiCards from './modules/widgets/kpi-cards.vue';
import LatestReportCard from './modules/widgets/latest-report-card.vue';
import LiveAccountCard from './modules/widgets/live-account-card.vue';
import ReportLifecycleCard from './modules/widgets/report-lifecycle-card.vue';
import SubsystemHealthCard from './modules/widgets/subsystem-health-card.vue';

defineOptions({ name: 'DashboardOverview' });

const router = useRouter();
const systemStore = useSystemStore();
const quantReportStore = useQuantReportStore();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();
const qpWs = useQpWs();
useSystemStatusBootstrap();

const canReadSystem = hasAccessByCodes(['system:read']);
const canReadReports = hasAccessByCodes(['quant_report:read']);
const canReadAccount = hasAccessByCodes(['account_snapshot:read']);
const canReadEquity = hasAccessByCodes(['equity_snapshot:read']);
const canReadIntents = hasAccessByCodes(['order_intent:read']);
const canReadExecutionOrders = hasAccessByCodes(['execution_order:read']);
const canReadReconciliations = hasAccessByCodes(['reconciliation:read']);

const showKpi = computed(
  () => canReadAccount || canReadEquity || canReadSystem,
);

const {
  canRun: canRunReport,
  openRunReport,
  RunReportModalHost,
} = useRunReportAction();

const wsStatusColor: Record<string, string> = {
  connected: 'success',
  disconnected: 'error',
  reconnecting: 'warning',
};

const latestReport = ref<null | QuantReportDetailView>(null);
const reportLoading = ref(false);

async function loadLatestReport() {
  if (!canReadReports) {
    return;
  }
  reportLoading.value = true;
  latestReport.value = await handleRequest(getLatestQuantReportOptional, {
    silent: true,
  });
  reportLoading.value = false;
}

const dataQuality = ref<DataQualitySnapshot | null>(null);
const dataQualityLoading = ref(false);
let dataQualityTimer: ReturnType<typeof setInterval> | undefined;

async function loadDataQuality() {
  if (!canReadSystem) {
    return;
  }
  dataQualityLoading.value = true;
  await handleRequest(getDataQualitySnapshot, (snapshot) => {
    dataQuality.value = snapshot;
  });
  dataQualityLoading.value = false;
}

function syncDataQualityPolling() {
  if (dataQualityTimer) {
    clearInterval(dataQualityTimer);
    dataQualityTimer = undefined;
  }
  const phase = systemStore.status?.operational_phase.phase;
  if (phase && phase !== 'operational' && canReadSystem) {
    dataQualityTimer = setInterval(() => {
      void loadDataQuality();
    }, 30_000);
  }
}

const liveAccount = ref<LiveAccountView | null>(null);
const latestEquity = ref<EquitySnapshotView | null>(null);
const accountLoading = ref(false);

async function loadAccount() {
  if (!canReadAccount) {
    return;
  }
  accountLoading.value = true;
  liveAccount.value = await handleRequest(getLiveAccount, { silent: true });
  if (canReadEquity) {
    latestEquity.value = await handleRequest(getLatestEquitySnapshotOptional, {
      silent: true,
    });
  }
  accountLoading.value = false;
}

const recentAlerts = computed(() => qpWs.notifications.value.slice(0, 5));

watch(() => quantReportStore.revision, loadLatestReport);

watch(
  () => systemStore.status?.operational_phase.phase,
  () => {
    void loadDataQuality();
    syncDataQualityPolling();
  },
);

function go(path: string) {
  void router.push(path);
}

onMounted(() => {
  void loadLatestReport();
  void loadDataQuality();
  void loadAccount();
  syncDataQualityPolling();
});

onUnmounted(() => {
  if (dataQualityTimer) {
    clearInterval(dataQualityTimer);
  }
});
</script>

<template>
  <Page auto-content-height>
    <div class="flex flex-col gap-5 pb-4">
      <div
        class="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
      >
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div class="flex items-center gap-2">
            <span class="text-muted-foreground text-sm">
              {{ $t('page.dashboard.cards.ws') }}
            </span>
            <Tag :color="wsStatusColor[qpWs.status.value] ?? 'default'">
              {{ $t(`page.ws.status.${qpWs.status.value}`) }}
            </Tag>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button v-if="canRunReport" type="primary" @click="openRunReport">
            {{ $t('page.dashboard.actions.runReport') }}
          </Button>
        </div>
      </div>

      <KpiCards
        v-if="showKpi"
        :account-loading="accountLoading"
        :data-quality="dataQuality"
        :equity="latestEquity"
        :live-account="liveAccount"
      />

      <ReportLifecycleCard
        v-if="canReadReports"
        @navigate="go('/quant/reports')"
      />

      <div
        class="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-3"
      >
        <LatestReportCard
          v-if="canReadReports"
          fill
          :loading="reportLoading"
          :report="latestReport"
          @navigate-detail="(id: string) => go(`/quant/reports/${id}`)"
        />

        <LiveAccountCard
          v-if="canReadAccount"
          :account="liveAccount"
          :equity="latestEquity"
          :loading="accountLoading"
          @navigate="go('/quant/account')"
        />

        <ExecutionPipelineCard
          v-if="
            canReadIntents || canReadExecutionOrders || canReadReconciliations
          "
          :can-read-execution-orders="canReadExecutionOrders"
          :can-read-intents="canReadIntents"
          :can-read-reconciliations="canReadReconciliations"
          @navigate-execution-orders="go('/quant/execution-orders')"
          @navigate-intents="go('/quant/intents')"
          @navigate-reconciliations="go('/quant/reconciliations')"
        />

        <DataQualityChart
          v-if="canReadSystem"
          :loading="dataQualityLoading"
          :snapshot="dataQuality"
        />

        <ExposureTopNCard
          v-if="canReadAccount"
          :exposures="liveAccount?.exposures ?? null"
          @navigate="go('/quant/account')"
        />
      </div>

      <div
        v-if="canReadSystem"
        class="grid grid-cols-1 items-start gap-5 xl:grid-cols-2"
      >
        <SubsystemHealthCard />
        <ExecutionRecoveryCard />
      </div>

      <DashboardPanel
        :title="$t('page.dashboard.alerts.title')"
        icon="lucide:bell-ring"
        tone="violet"
      >
        <div v-if="recentAlerts.length > 0" class="flex flex-col gap-2">
          <div
            v-for="alert in recentAlerts"
            :key="alert.id"
            class="flex flex-col gap-0.5 border-b pb-1.5 last:border-b-0"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-medium">{{
                alert.title
              }}</span>
              <span class="text-muted-foreground shrink-0 text-xs">
                {{ alert.date }}
              </span>
            </div>
            <span class="text-muted-foreground truncate text-xs">
              {{ alert.message }}
            </span>
          </div>
        </div>
        <Empty
          v-else
          :description="$t('page.dashboard.alerts.none')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
      </DashboardPanel>

      <RunReportModalHost />
    </div>
  </Page>
</template>
