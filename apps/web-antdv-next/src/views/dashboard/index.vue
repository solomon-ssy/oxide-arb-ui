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

import {
  Alert,
  Button,
  Empty,
  message,
  Tag,
  Timeline,
  TimelineItem,
} from 'antdv-next';

import { getLatestEquitySnapshotOptional, getLiveAccount } from '#/api/account';
import { getDataQualitySnapshot } from '#/api/data-quality';
import { getMostRecentCurrentReportOptional } from '#/api/quant-reports';
import { fetchRuntimeConfigApprovals } from '#/api/runtime-config';
import { activateBootstrap, getSystemStatus } from '#/api/system';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQpWs } from '#/shared/composables/use-qp-ws';
import { useRunReportAction } from '#/shared/composables/use-run-report-action';
import { useSystemStatusBootstrap } from '#/shared/composables/use-system-status';
import { useQuantReportStore, useSystemStore } from '#/store';

import BootstrapCapabilitiesPanel from './modules/widgets/bootstrap-capabilities-panel.vue';
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
const { governed } = useGovernedAction();
const qpWs = useQpWs();
useSystemStatusBootstrap();

const canReadSystem = hasAccessByCodes(['system:read']);
const canReadReports = hasAccessByCodes(['quant_report:read']);
const canReadAccount = hasAccessByCodes(['account_snapshot:read']);
const canReadEquity = hasAccessByCodes(['equity_snapshot:read']);
const canReadIntents = hasAccessByCodes(['order_intent:read']);
const canReadExecutionOrders = hasAccessByCodes(['execution_order:read']);
const canReadReconciliations = hasAccessByCodes(['reconciliation:read']);
const canActivateBootstrap =
  hasAccessByCodes(['system:bootstrap_activate']) &&
  hasAccessByCodes(['runtime_config:read']);

const activationLoading = ref(false);

async function activateColdStart() {
  const controlPlane = systemStore.controlPlane;
  if (!controlPlane || controlPlane.bootstrap.phase !== 'awaiting_activation') {
    return;
  }
  activationLoading.value = true;
  try {
    const approvals = await handleRequest(fetchRuntimeConfigApprovals, {
      silent: true,
    });
    if (!approvals?.length) {
      message.warning($t('page.dashboard.bootstrap.noConfig'));
      return;
    }
    const result = await governed(
      (ctx) => {
        const approval = approvals.find(
          (candidate) =>
            candidate.runtime_config_approval_id ===
            ctx.fields.runtime_config_approval_id,
        );
        if (!approval) {
          return Promise.reject(
            new Error('approved runtime revision is required'),
          );
        }
        return activateBootstrap(
          {
            bootstrap_contract_version:
              controlPlane.bootstrap.bootstrap_contract_version,
            expected_state_revision: controlPlane.bootstrap.state_revision,
            reason: ctx.reason,
            report_only_forced_ack:
              ctx.fields.report_only_forced_ack === 'acknowledged',
            runtime_config_approval_id: approval.runtime_config_approval_id,
            runtime_config_version_id: approval.runtime_config_version_id,
          },
          ctx,
        );
      },
      {
        confirmWord: 'ACTIVATE',
        danger: true,
        fields: [
          {
            name: 'runtime_config_approval_id',
            label: $t('page.dashboard.bootstrap.configRevision'),
            kind: 'select',
            options: approvals.map((approval) => ({
              label: `${approval.runtime_config_version_id} · ${approval.config_hash.slice(0, 18)}… · ${approval.decided_by} · ${new Date(approval.decided_at).toLocaleString()}`,
              value: approval.runtime_config_approval_id,
            })),
            required: true,
          },
          {
            name: 'report_only_forced_ack',
            label: $t('page.dashboard.bootstrap.ackLabel'),
            kind: 'checkbox',
            help: $t('page.dashboard.bootstrap.ackHelp'),
            required: true,
          },
        ],
        summary: $t('page.dashboard.bootstrap.activateSummary'),
        title: $t('page.dashboard.bootstrap.activateTitle'),
      },
    );
    if (!result) {
      return;
    }
    await handleRequest(getSystemStatus, (status) => {
      systemStore.applyControlPlaneStatus(status);
    });
    message.success($t('page.dashboard.bootstrap.activated'));
  } finally {
    activationLoading.value = false;
  }
}

const showKpi = computed(
  () => canReadAccount || canReadEquity || canReadSystem,
);
const reportCapabilityEnabled = computed(
  () => systemStore.actionEligibility?.report_generation.enabled === true,
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
const reportLoadError = ref<null | string>(null);

async function loadLatestReport() {
  if (!canReadReports) {
    return;
  }
  reportLoading.value = true;
  reportLoadError.value = null;
  try {
    await handleRequest(getMostRecentCurrentReportOptional, {
      onError: (error) => {
        reportLoadError.value = error.message;
      },
      onSuccess: (report) => {
        latestReport.value = report;
      },
      silent: true,
    });
  } finally {
    reportLoading.value = false;
  }
}

const dataQuality = ref<DataQualitySnapshot | null>(null);
const dataQualityLoading = ref(false);
const dataQualityLoadError = ref<null | string>(null);
let dataQualityTimer: ReturnType<typeof setInterval> | undefined;

async function loadDataQuality() {
  if (!canReadSystem) {
    return;
  }
  dataQualityLoading.value = true;
  dataQualityLoadError.value = null;
  try {
    await handleRequest(getDataQualitySnapshot, {
      onError: (error) => {
        dataQualityLoadError.value = error.message;
      },
      onSuccess: (snapshot) => {
        dataQuality.value = snapshot;
      },
      silent: true,
    });
  } finally {
    dataQualityLoading.value = false;
  }
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
const liveAccountLoading = ref(false);
const equityLoading = ref(false);
const liveAccountLoadError = ref<null | string>(null);
const equityLoadError = ref<null | string>(null);
const accountLoading = computed(
  () => liveAccountLoading.value || equityLoading.value,
);

async function loadAccount() {
  if (!canReadAccount) {
    return;
  }
  liveAccountLoading.value = true;
  liveAccountLoadError.value = null;
  try {
    await handleRequest(getLiveAccount, {
      onError: (error) => {
        liveAccountLoadError.value = error.message;
      },
      onSuccess: (account) => {
        liveAccount.value = account;
      },
      silent: true,
    });
  } finally {
    liveAccountLoading.value = false;
  }
}

async function loadEquity() {
  if (!canReadEquity) {
    return;
  }
  equityLoading.value = true;
  equityLoadError.value = null;
  try {
    await handleRequest(getLatestEquitySnapshotOptional, {
      onError: (error) => {
        equityLoadError.value = error.message;
      },
      onSuccess: (equity) => {
        latestEquity.value = equity;
      },
      silent: true,
    });
  } finally {
    equityLoading.value = false;
  }
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
  void loadEquity();
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
          <Button
            v-if="canRunReport"
            :disabled="!reportCapabilityEnabled"
            :title="
              reportCapabilityEnabled
                ? undefined
                : $t('page.dashboard.bootstrap.reportBlocked')
            "
            type="primary"
            @click="openRunReport"
          >
            {{ $t('page.dashboard.actions.runReport') }}
          </Button>
        </div>
      </div>

      <BootstrapCapabilitiesPanel
        v-if="canReadSystem && systemStore.controlPlane"
        :activating="activationLoading"
        :can-activate="canActivateBootstrap"
        :status="systemStore.controlPlane"
        @activate="activateColdStart"
      />

      <div
        v-if="
          reportLoadError ||
          dataQualityLoadError ||
          liveAccountLoadError ||
          equityLoadError
        "
        class="grid grid-cols-1 gap-3 lg:grid-cols-2"
        aria-live="polite"
      >
        <Alert
          v-if="reportLoadError"
          :description="reportLoadError"
          :message="$t('page.dashboard.loadError.report')"
          show-icon
          type="error"
        >
          <template #action>
            <Button size="small" @click="loadLatestReport">
              {{ $t('page.shared.asyncState.retry') }}
            </Button>
          </template>
        </Alert>
        <Alert
          v-if="dataQualityLoadError"
          :description="dataQualityLoadError"
          :message="$t('page.dashboard.loadError.dataQuality')"
          show-icon
          type="error"
        >
          <template #action>
            <Button size="small" @click="loadDataQuality">
              {{ $t('page.shared.asyncState.retry') }}
            </Button>
          </template>
        </Alert>
        <Alert
          v-if="liveAccountLoadError"
          :description="liveAccountLoadError"
          :message="$t('page.dashboard.loadError.account')"
          show-icon
          type="error"
        >
          <template #action>
            <Button size="small" @click="loadAccount">
              {{ $t('page.shared.asyncState.retry') }}
            </Button>
          </template>
        </Alert>
        <Alert
          v-if="equityLoadError"
          :description="equityLoadError"
          :message="$t('page.dashboard.loadError.equity')"
          show-icon
          type="error"
        >
          <template #action>
            <Button size="small" @click="loadEquity">
              {{ $t('page.shared.asyncState.retry') }}
            </Button>
          </template>
        </Alert>
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
        <Timeline v-if="recentAlerts.length > 0">
          <TimelineItem v-for="alert in recentAlerts" :key="alert.id">
            <div class="flex flex-col gap-0.5">
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
          </TimelineItem>
        </Timeline>
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
