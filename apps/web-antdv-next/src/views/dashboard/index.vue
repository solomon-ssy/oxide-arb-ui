<script lang="ts" setup>
import type {
  DashboardActionItemView,
  DashboardOverviewView,
  DashboardSection,
  DashboardWindow,
  ExchangeHistoryQuarantineView,
  FeedbackCycleStatus,
  FeedbackOverviewView,
  FreshBootProfileProgressView,
  FreshBootProgressView,
  FreshBootRunDetailView,
  QuantRecommendationView,
} from '@vben/types';

import type { DashboardSnapshot } from './modules/dashboard-snapshot';

import type { FeedbackProfileReadinessState } from '#/views/research/learning-policy/modules/feedback/modules/feedback-profile-presentation';

import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  useDocumentVisibility,
  useIntervalFn,
  usePreferredReducedMotion,
} from '@vueuse/core';
import {
  Alert,
  Badge,
  Button,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Empty,
  Progress,
  Segmented,
  Skeleton,
  Tag,
} from 'antdv-next';

import {
  getExchangeHistoryQuarantines,
  getFreshBootRun,
  retryFreshBootRun,
  supersedeFreshBootRun,
} from '#/api/system';
import { $t } from '#/locales';
import RuntimeActivityFeed from '#/shared/components/activity/activity-feed.vue';
import {
  formatBps,
  formatDateTimeLocal,
  formatPercent,
  formatUsd,
  parseDecimal,
  toAnimatorNumber,
} from '#/shared/components/format';
import InsightPanel from '#/shared/components/insight-panel.vue';
import KpiCard from '#/shared/components/kpi-card.vue';
import { AuthoritativeReadCoordinator } from '#/shared/composables/authoritative-read-coordinator';
import { useDashboardStatusRefreshKey } from '#/shared/composables/use-dashboard-status-refresh-key';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQpWs } from '#/shared/composables/use-qp-ws';
import { useRunReportAction } from '#/shared/composables/use-run-report-action';
import { enumOption, enumOptions } from '#/shared/presentation/enum-options';
import {
  useFeedbackStore,
  useQuantReportStore,
  useSystemStore,
  useWsStore,
} from '#/store';

import {
  isFeedbackSnapshotCurrent,
  summarizeDashboardFeedback,
} from './modules/dashboard-feedback-summary';
import {
  DASHBOARD_FALLBACK_INTERVAL_MS,
  dashboardWsHealth,
  isVisibilityRecovery,
  isWsRecovery,
  latestWsActivity,
  shouldPollDashboard,
} from './modules/dashboard-refresh-policy';
import { getDashboardSnapshot } from './modules/dashboard-snapshot';
import EquityDrawdownChart from './modules/equity-drawdown-chart.vue';
import ExposureTreemap from './modules/exposure-treemap.vue';
import FreshBootPanel from './modules/fresh-boot-panel.vue';
import { reduceFreshBootRead } from './modules/fresh-boot-presentation';
import LifecycleSankey from './modules/lifecycle-sankey.vue';
import RecommendationOrbit from './modules/recommendation-orbit.vue';

import './modules/register-dashboard-charts';

defineOptions({ name: 'DashboardOverview' });

const router = useRouter();
const feedbackStore = useFeedbackStore();
const systemStore = useSystemStore();
const reportStore = useQuantReportStore();
const wsStore = useWsStore();
const qpWs = useQpWs();
const { hasAccessByCodes } = useQpAccess();
const { governed } = useGovernedAction();
const {
  canRun: canRunReport,
  openRunReport,
  RunReportModalHost,
} = useRunReportAction();
const reducedMotion = usePreferredReducedMotion();
const visibility = useDocumentVisibility();

const windowValue = ref<DashboardWindow>('7d');
const overview = ref<DashboardOverviewView | null>(null);
const feedbackOverview = ref<FeedbackOverviewView | null>(null);
const freshBoot = ref<FreshBootProgressView | null>(null);
const freshBootError = ref(false);
const freshBootDetail = ref<FreshBootRunDetailView | null>(null);
const freshBootDetailError = ref(false);
const freshBootDetailLoading = ref(false);
const freshBootDetailOpen = ref(false);
const freshBootQuarantines = ref<ExchangeHistoryQuarantineView[]>([]);
const freshBootQuarantineNextAfter = ref<null | string>(null);
const freshBootQuarantineLoading = ref(false);
const freshBootQuarantineError = ref(false);
const initialLoading = ref(true);
const refreshing = ref(false);
const refreshPending = ref(false);
const loadError = ref<null | string>(null);
const feedbackError = ref<null | string>(null);
const selectedRecommendation = ref<null | QuantRecommendationView>(null);
const blockersOpen = ref(false);
const pageActive = ref(false);

const canReadFeedback = computed(() =>
  hasAccessByCodes(['materialization:read']),
);
const feedbackSummary = computed(() =>
  feedbackOverview.value === null
    ? null
    : summarizeDashboardFeedback(feedbackOverview.value),
);
const feedbackState = computed(() => {
  if (!canReadFeedback.value) {
    return 'permission';
  }
  if (refreshPending.value && feedbackOverview.value === null) {
    return 'loading';
  }
  if (feedbackError.value !== null) {
    return feedbackOverview.value === null ? 'error' : 'stale';
  }
  if (
    feedbackSummary.value === null ||
    feedbackSummary.value.profiles.length === 0
  ) {
    return 'empty';
  }
  return feedbackSummary.value.profiles.some(
    (profile) => profile.readinessState !== 'ready',
  )
    ? 'blocked'
    : 'ready';
});
function canRetryFreshBoot(profile: FreshBootProfileProgressView) {
  return (
    hasAccessByCodes(['system:update']) &&
    (profile.run.status === 'retry_scheduled' ||
      profile.run.status === 'waiting_evidence')
  );
}

function canSupersedeFreshBoot(profile: FreshBootProfileProgressView) {
  return (
    hasAccessByCodes(['system:resolve']) &&
    profile.run.status === 'blocked_terminal'
  );
}

async function openFreshBootTimeline(profile: FreshBootProfileProgressView) {
  freshBootDetailOpen.value = true;
  freshBootDetailLoading.value = true;
  freshBootDetailError.value = false;
  freshBootDetail.value = null;
  try {
    freshBootDetail.value = await getFreshBootRun(profile.run.run_id);
  } catch {
    freshBootDetailError.value = true;
  } finally {
    freshBootDetailLoading.value = false;
  }
}

async function loadFreshBootQuarantines(reset = false) {
  if (freshBootQuarantineLoading.value) return;
  freshBootQuarantineLoading.value = true;
  freshBootQuarantineError.value = false;
  try {
    const page = await getExchangeHistoryQuarantines({
      after: reset
        ? undefined
        : (freshBootQuarantineNextAfter.value ?? undefined),
      limit: 50,
      status: 'active',
    });
    freshBootQuarantines.value = reset
      ? page.items
      : [...freshBootQuarantines.value, ...page.items];
    freshBootQuarantineNextAfter.value = page.next_after;
  } catch {
    freshBootQuarantineError.value = true;
  } finally {
    freshBootQuarantineLoading.value = false;
  }
}

async function retryFreshBoot(profile: FreshBootProfileProgressView) {
  const result = await governed(
    (ctx) =>
      retryFreshBootRun(
        profile.run.run_id,
        {
          expected_revision: profile.run.revision,
          reason: ctx.reason,
        },
        ctx,
      ),
    {
      details: [
        {
          label: $t('page.dashboard.bootstrap.routeLabel'),
          value: $t(`page.dashboard.bootstrap.route.${profile.run.route}`),
        },
        {
          label: $t('page.dashboard.bootstrap.runId'),
          mono: true,
          value: profile.run.run_id,
        },
      ],
      summary: $t('page.dashboard.bootstrap.retrySummary'),
      title: $t('page.dashboard.bootstrap.retryNow'),
    },
  );
  if (result) refreshCoordinator.invalidate();
}

async function supersedeFreshBoot(profile: FreshBootProfileProgressView) {
  const result = await governed(
    (ctx) =>
      supersedeFreshBootRun(
        profile.run.run_id,
        {
          expected_revision: profile.run.revision,
          reason: ctx.reason,
        },
        ctx,
      ),
    {
      danger: true,
      details: [
        {
          label: $t('page.dashboard.bootstrap.routeLabel'),
          value: $t(`page.dashboard.bootstrap.route.${profile.run.route}`),
        },
        {
          label: $t('page.dashboard.bootstrap.runId'),
          mono: true,
          value: profile.run.run_id,
        },
      ],
      summary: $t('page.dashboard.bootstrap.supersedeSummary'),
      title: $t('page.dashboard.bootstrap.supersede'),
    },
  );
  if (result) refreshCoordinator.invalidate();
}

function valueOf<T>(section: DashboardSection<T> | undefined): null | T {
  if (section?.state === 'ready' || section?.state === 'stale') {
    return section.value;
  }
  return null;
}

const authority = computed(() => valueOf(overview.value?.authority));
const account = computed(() => valueOf(overview.value?.account));
const quality = computed(() => valueOf(overview.value?.data_quality));
const health = computed(() => valueOf(overview.value?.subsystem_health));
const latestReport = computed(() => valueOf(overview.value?.latest_report));
const runtimeActivity = computed(() =>
  valueOf(overview.value?.runtime_activity),
);
const reportRuntime = computed(() => valueOf(overview.value?.report_runtime));
const executionRuntime = computed(() =>
  valueOf(overview.value?.execution_runtime),
);

const runtimeModeTag = computed(() =>
  enumOption(
    enumOptions('QuantRuntimeMode'),
    authority.value?.system.quant_runtime_mode,
  ),
);
const killSwitchTag = computed(() =>
  enumOption(
    enumOptions('KillSwitchState'),
    authority.value?.system.kill_switch.state,
  ),
);
const actions = computed(() => {
  const values = valueOf(overview.value?.action_inbox) ?? [];
  const order: Record<DashboardActionItemView['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return values.toSorted(
    (left, right) =>
      order[left.severity] - order[right.severity] ||
      Date.parse(left.observed_at) - Date.parse(right.observed_at) ||
      left.owner.localeCompare(right.owner),
  );
});

const blockerReasons = computed(() => {
  const capabilities = authority.value?.system.capabilities;
  if (!capabilities) return [];
  return [
    capabilities.control_plane_ready,
    capabilities.catalog_baseline_ready,
    capabilities.report_generation_eligible,
  ]
    .flatMap((capability) => capability.reasons)
    .filter((reason, index, reasons) => reasons.indexOf(reason) === index);
});

const partialSections = computed(() => {
  if (!overview.value) return [];
  return Object.entries(overview.value)
    .filter(([, value]) => {
      if (!value || typeof value !== 'object' || !('state' in value)) {
        return false;
      }
      return ['stale', 'unavailable'].includes(
        (value as { state: string }).state,
      );
    })
    .map(([name]) => name);
});

const usableBooks = computed(() => {
  const snapshot = quality.value;
  return snapshot ? snapshot.fresh + snapshot.acceptable : null;
});
const usableRatio = computed(() => {
  const snapshot = quality.value;
  return snapshot && snapshot.total_tokens > 0
    ? (snapshot.fresh + snapshot.acceptable) / snapshot.total_tokens
    : null;
});
const equityRows = computed(() => valueOf(overview.value?.equity_curve) ?? []);
const equityTrend = computed(() => {
  const first = equityRows.value.at(0);
  const last = equityRows.value.at(-1);
  const start = parseDecimal(first?.venue_net_liquidation_usd);
  const end = parseDecimal(last?.venue_net_liquidation_usd);
  if (!start || !end || start.isZero()) return null;
  return end.minus(start).div(start).toString();
});

const kpis = computed(() => [
  {
    accent: 'emerald' as const,
    decimals: 2,
    endVal: toAnimatorNumber(account.value?.live.venue_net_liquidation_usd),
    footer: equityTrend.value
      ? $t('page.dashboard.kpi.windowTrend', {
          value: formatPercent(equityTrend.value),
          window: windowValue.value,
        })
      : $t('page.dashboard.section.noTrend'),
    icon: 'lucide:landmark',
    prefix: '$',
    title: $t('page.dashboard.kpi.netLiq'),
  },
  {
    accent: 'sky' as const,
    decimals: 2,
    endVal: toAnimatorNumber(account.value?.live.available_usd),
    footer: $t('page.dashboard.kpi.reservedValue', {
      value: formatUsd(account.value?.live.reserved_usd),
    }),
    icon: 'lucide:wallet-cards',
    prefix: '$',
    title: $t('page.dashboard.kpi.available'),
  },
  {
    accent: 'amber' as const,
    decimals: 1,
    endVal: account.value?.latest_equity
      ? (toAnimatorNumber(account.value.latest_equity.drawdown_pct) ?? 0) * 100
      : null,
    footer: account.value?.latest_equity
      ? $t('page.dashboard.kpi.highWaterValue', {
          value: formatUsd(account.value.latest_equity.high_water_mark_usd),
        })
      : $t('page.dashboard.kpi.noEquitySnapshot'),
    icon: 'lucide:trending-down',
    suffix: '%',
    title: $t('page.dashboard.kpi.drawdown'),
  },
  {
    accent: 'violet' as const,
    endVal: authority.value?.system.active_markets ?? null,
    footer: authority.value
      ? $t(
          `page.system.phase.${authority.value.system.operational_phase.phase}`,
        )
      : $t('page.dashboard.section.unavailable'),
    icon: 'lucide:radio-tower',
    title: $t('page.dashboard.kpi.activeMarkets'),
  },
  {
    accent: 'emerald' as const,
    decimals: 1,
    endVal: usableRatio.value === null ? null : usableRatio.value * 100,
    footer: quality.value
      ? $t('page.dashboard.kpi.usableBooks', {
          total: quality.value.total_tokens,
          usable: usableBooks.value,
        })
      : $t('page.dashboard.section.unavailable'),
    icon: 'lucide:database-zap',
    suffix: '%',
    title: $t('page.dashboard.kpi.dataUsableTitle'),
  },
  {
    accent: 'sky' as const,
    endVal: runtimeActivity.value?.indicator.running ?? null,
    footer: runtimeActivity.value
      ? $t('page.dashboard.kpi.runtimeAttentionValue', {
          count: runtimeActivity.value.indicator.attention,
        })
      : $t('page.dashboard.section.unavailable'),
    icon: 'lucide:activity',
    title: $t('page.dashboard.kpi.runtimeRunning'),
  },
]);

const wsColor: Record<string, string> = {
  connected: 'success',
  connecting: 'processing',
  disconnected: 'error',
  reconnecting: 'warning',
};
const primaryActionLabel = computed(() =>
  authority.value
    ? $t(`page.dashboard.primaryAction.${authority.value.primary_action}`)
    : $t('page.dashboard.primaryAction.view_blockers'),
);

const refreshCoordinator = new AuthoritativeReadCoordinator<
  DashboardWindow,
  DashboardSnapshot
>({
  fetchSnapshot: (window, signal) =>
    getDashboardSnapshot(window, signal, canReadFeedback.value),
  initialKey: windowValue.value,
  onError: () => {
    loadError.value = $t('page.dashboard.loadError.overview');
  },
  onPendingChange: (pending) => {
    refreshPending.value = pending;
    initialLoading.value = pending && overview.value === null;
    refreshing.value = pending && overview.value !== null;
  },
  onSnapshot: (snapshot) => {
    if (snapshot.overview.state === 'ready') {
      overview.value = snapshot.overview.value;
      loadError.value = null;
      const nextAuthority = valueOf(snapshot.overview.value.authority);
      if (
        nextAuthority &&
        (qpWs.status.value !== 'connected' || systemStore.status === null)
      ) {
        systemStore.applyControlPlaneStatus(nextAuthority.system);
      }
    } else {
      loadError.value = $t('page.dashboard.loadError.overview');
    }

    if (snapshot.feedback.state === 'forbidden') {
      feedbackOverview.value = null;
      feedbackError.value = null;
    } else if (snapshot.feedback.state === 'error') {
      feedbackError.value = $t('page.dashboard.feedback.loadError');
    } else if (
      isFeedbackSnapshotCurrent(snapshot.feedback.value, feedbackStore.revision)
    ) {
      feedbackOverview.value = snapshot.feedback.value;
      feedbackError.value = null;
    } else {
      feedbackError.value = $t('page.dashboard.feedback.invalidRevision');
    }

    const nextFreshBoot = reduceFreshBootRead(
      freshBoot.value,
      snapshot.freshBoot,
    );
    freshBoot.value = nextFreshBoot.value;
    freshBootError.value = nextFreshBoot.stale || nextFreshBoot.value === null;
  },
});

function refreshOverview() {
  if (pageActive.value) {
    void refreshCoordinator.refresh();
  }
}

const { overviewRefreshKey } = useDashboardStatusRefreshKey();
watch(windowValue, (window) => {
  if (pageActive.value) {
    refreshCoordinator.changeKey(window);
  }
});
watch(
  () => reportStore.lastEvent,
  (event) => {
    if (pageActive.value && event !== null) {
      refreshCoordinator.invalidate();
    }
  },
);
watch(
  () => feedbackStore.refreshGeneration,
  () => {
    if (pageActive.value) {
      refreshCoordinator.invalidate();
    }
  },
);
// Never watch `checked_at`: every overview response / WS status frame mints a
// new timestamp, which re-entered this path and flickered the whole page.
watch(overviewRefreshKey, (next, previous) => {
  if (pageActive.value && previous && next !== previous) {
    refreshCoordinator.invalidate();
  }
});
watch(canReadFeedback, (allowed) => {
  if (!allowed) {
    feedbackOverview.value = null;
    feedbackError.value = null;
    refreshCoordinator.cancel();
  } else if (pageActive.value) {
    void refreshCoordinator.refresh();
  }
});
watch(
  () => qpWs.status.value,
  (next, previous) => {
    if (pageActive.value && isWsRecovery(next, previous)) {
      void refreshCoordinator.refresh();
    }
  },
);
watch(visibility, (next, previous) => {
  if (pageActive.value && isVisibilityRecovery(next, previous)) {
    void refreshCoordinator.refresh();
  }
});
const { pause: pauseFallback, resume: resumeFallback } = useIntervalFn(
  () => {
    const health = dashboardWsHealth(
      qpWs.status.value,
      latestWsActivity(wsStore.lastHeartbeatAt, wsStore.lastSyncAt),
      Date.now(),
    );
    if (pageActive.value && shouldPollDashboard(health, visibility.value)) {
      void refreshCoordinator.refresh();
    }
  },
  DASHBOARD_FALLBACK_INTERVAL_MS,
  { immediate: false },
);

function executePrimaryAction() {
  const action = authority.value?.primary_action;
  if (action === 'resolve_reconciliation') {
    void router.push('/execution/post-trade?module=reconciliation');
  } else if (action === 'run_report' && canRunReport) {
    openRunReport();
  } else {
    blockersOpen.value = true;
  }
}

function navigate(path: string) {
  void router.push(path);
}

function openFeedbackCycle(cycleId: null | string) {
  if (cycleId === null) {
    navigate('/research/learning-policy?module=feedback');
    return;
  }
  void router.push({
    path: '/research/learning-policy',
    query: { entity: 'feedback-cycle', id: cycleId, module: 'feedback' },
  });
}

function openSelectedRecommendation() {
  const recommendation = selectedRecommendation.value;
  if (!recommendation) return;
  void router.push({
    path: '/trading/recommendations',
    query: {
      entity: 'recommendation',
      id: recommendation.recommendation_id,
      module: 'reports',
    },
  });
}

function severityStatus(severity: DashboardActionItemView['severity']) {
  if (severity === 'critical') return 'error';
  if (severity === 'warning') return 'warning';
  return 'processing';
}

function readinessColor(state: FeedbackProfileReadinessState) {
  if (state === 'ready') return 'success';
  if (state === 'blocked') return 'error';
  return 'warning';
}

function feedbackStatusColor(status: FeedbackCycleStatus | null) {
  if (status === 'cancelled' || status === 'failed') return 'error';
  if (status === 'running') return 'processing';
  if (status === 'succeeded') return 'success';
  return status === 'queued' ? 'default' : 'warning';
}

function activateDashboard() {
  if (pageActive.value) {
    return;
  }
  pageActive.value = true;
  resumeFallback();
  refreshCoordinator.setKey(windowValue.value);
  void refreshCoordinator.refresh();
}

function deactivateDashboard() {
  if (!pageActive.value) {
    return;
  }
  pageActive.value = false;
  pauseFallback();
  refreshCoordinator.cancel();
}

onMounted(activateDashboard);
onActivated(activateDashboard);
onDeactivated(deactivateDashboard);
onBeforeRouteLeave(() => {
  deactivateDashboard();
});
onBeforeUnmount(() => {
  pageActive.value = false;
  pauseFallback();
  refreshCoordinator.dispose();
});
</script>

<template>
  <Page
    auto-content-height
    :data-ui-ready="!initialLoading && overview ? 'true' : 'false'"
    data-testid="dashboard-command-center"
  >
    <div class="flex flex-col gap-5 pb-6">
      <Alert
        v-if="loadError"
        :description="loadError"
        :message="$t('page.dashboard.loadError.overview')"
        show-icon
        type="error"
      >
        <template #action>
          <Button size="small" @click="refreshOverview">
            {{ $t('page.shared.asyncState.retry') }}
          </Button>
        </template>
      </Alert>

      <Skeleton v-if="initialLoading" :paragraph="{ rows: 14 }" active />

      <template v-else>
        <template v-if="overview">
          <section
            class="command-rail qp-page-hero"
            aria-labelledby="dashboard-authority-title"
          >
            <div
              class="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
            >
              <div>
                <div class="flex items-center gap-2">
                  <IconifyIcon
                    icon="lucide:scan-line"
                    class="text-primary size-5"
                  />
                  <h1
                    id="dashboard-authority-title"
                    class="text-lg font-semibold"
                  >
                    {{ $t('page.dashboard.commandCenter.title') }}
                  </h1>
                  <Tag v-if="refreshing" color="processing">
                    {{ $t('page.dashboard.commandCenter.refreshing') }}
                  </Tag>
                  <Tag v-else-if="partialSections.length > 0" color="warning">
                    {{
                      $t('page.dashboard.commandCenter.partial', {
                        count: partialSections.length,
                      })
                    }}
                  </Tag>
                </div>
                <p class="text-muted-foreground mt-1 text-sm">
                  {{ $t('page.dashboard.commandCenter.subtitle') }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <Segmented
                  v-model:value="windowValue"
                  class="window-segmented"
                  shape="round"
                  :options="[
                    { label: '24H', value: '24h' },
                    { label: '7D', value: '7d' },
                    { label: '30D', value: '30d' },
                  ]"
                />
                <Button
                  class="command-primary"
                  data-testid="dashboard-primary-action"
                  :disabled="!authority?.primary_action_enabled"
                  :loading="refreshing"
                  type="primary"
                  @click="executePrimaryAction"
                >
                  <IconifyIcon icon="lucide:crosshair" />
                  {{ primaryActionLabel }}
                </Button>
              </div>
            </div>
            <dl
              v-if="authority"
              class="relative mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-3 xl:grid-cols-6"
            >
              <div class="status-cell">
                <dt>{{ $t('page.dashboard.status.runtimeMode') }}</dt>
                <dd>
                  <Tag :color="runtimeModeTag?.color ?? 'default'">
                    {{ runtimeModeTag?.label ?? '—' }}
                  </Tag>
                </dd>
              </div>
              <div class="status-cell">
                <dt>{{ $t('page.dashboard.status.killSwitch') }}</dt>
                <dd>
                  <Tag :color="killSwitchTag?.color ?? 'default'">
                    {{ killSwitchTag?.label ?? '—' }}
                  </Tag>
                </dd>
              </div>
              <div class="status-cell">
                <dt>{{ $t('page.dashboard.status.ws') }}</dt>
                <dd>
                  <Tag :color="wsColor[qpWs.status.value]">
                    {{ $t(`page.ws.status.${qpWs.status.value}`) }}
                  </Tag>
                </dd>
              </div>
              <div class="status-cell" data-screenshot-volatile="true">
                <dt>{{ $t('page.dashboard.status.bookFreshness') }}</dt>
                <dd>
                  {{
                    authority.system.market_data.last_message_age_ms ?? '—'
                  }}ms
                </dd>
              </div>
              <div class="status-cell">
                <dt>{{ $t('page.dashboard.status.latestReport') }}</dt>
                <dd>
                  {{ formatDateTimeLocal(latestReport?.report.decision_at) }}
                </dd>
              </div>
            </dl>
          </section>

          <div class="grid grid-cols-2 gap-4 xl:grid-cols-6">
            <KpiCard
              v-for="(kpi, index) in kpis"
              :key="kpi.title"
              :accent="kpi.accent"
              :class="
                index === kpis.length - 1 && kpis.length % 2 === 1
                  ? 'col-span-2 xl:col-span-1'
                  : undefined
              "
              :decimals="kpi.decimals"
              :delay="index * 35"
              :duration="reducedMotion === 'reduce' ? 0 : 180"
              :end-val="kpi.endVal"
              :featured="index === 0"
              :icon="kpi.icon"
              :prefix="kpi.prefix"
              :suffix="kpi.suffix"
              :title="kpi.title"
            >
              <template #footer>{{ kpi.footer }}</template>
            </KpiCard>
          </div>

          <FreshBootPanel
            :can-retry="canRetryFreshBoot"
            :can-supersede="canSupersedeFreshBoot"
            :fresh-boot="freshBoot"
            :quarantine-error="freshBootQuarantineError"
            :quarantine-loading="freshBootQuarantineLoading"
            :quarantine-next-after="freshBootQuarantineNextAfter"
            :quarantines="freshBootQuarantines"
            :stale="freshBootError"
            @load-more-quarantines="loadFreshBootQuarantines(false)"
            @open-quarantines="loadFreshBootQuarantines(true)"
            @open-report="navigate('/trading/recommendations?module=reports')"
            @retry="retryFreshBoot"
            @supersede="supersedeFreshBoot"
            @timeline="openFreshBootTimeline"
          />

          <div class="dashboard-equal-row">
            <div class="dashboard-equal-lead">
              <EquityDrawdownChart :section="overview.equity_curve" />
            </div>
            <div class="dashboard-equal-follow">
              <RecommendationOrbit
                :recommendations="latestReport?.recommendations ?? []"
                @open-reports="
                  navigate('/trading/recommendations?module=reports')
                "
                @select="selectedRecommendation = $event"
              />
            </div>
          </div>

          <div class="dashboard-equal-row">
            <div class="dashboard-equal-lead">
              <LifecycleSankey :section="overview.report_lifecycle" />
            </div>
            <div class="dashboard-equal-follow">
              <ExposureTreemap :section="overview.exposures" />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div class="xl:col-span-7">
              <InsightPanel
                :title="$t('page.dashboard.runtimeActivity.title')"
                icon="lucide:activity"
                tone="sky"
              >
                <template #extra>
                  <Button
                    size="small"
                    type="text"
                    @click="navigate('/runtime/activity')"
                  >
                    {{ $t('page.dashboard.runtimeActivity.open') }}
                  </Button>
                </template>
                <RuntimeActivityFeed
                  v-if="runtimeActivity"
                  :height="360"
                  :items="runtimeActivity.items"
                />
                <Empty
                  v-else
                  :description="$t('page.dashboard.runtimeActivity.empty')"
                  :image="Empty.PRESENTED_IMAGE_SIMPLE"
                />
              </InsightPanel>
            </div>
            <div class="grid gap-5 xl:col-span-5">
              <InsightPanel
                :title="$t('page.dashboard.reportRuntime.title')"
                icon="lucide:file-chart-column"
                tone="violet"
              >
                <dl v-if="reportRuntime" class="runtime-metrics">
                  <div>
                    <dt>{{ $t('page.dashboard.reportRuntime.queued') }}</dt>
                    <dd>{{ reportRuntime.queued }}</dd>
                  </div>
                  <div>
                    <dt>{{ $t('page.dashboard.reportRuntime.running') }}</dt>
                    <dd>{{ reportRuntime.running }}</dd>
                  </div>
                  <div>
                    <dt>{{ $t('page.dashboard.reportRuntime.failed') }}</dt>
                    <dd>
                      {{ reportRuntime.failed + reportRuntime.abandoned }}
                    </dd>
                  </div>
                </dl>
                <Empty
                  v-else
                  :description="$t('page.dashboard.reportRuntime.empty')"
                  :image="Empty.PRESENTED_IMAGE_SIMPLE"
                />
              </InsightPanel>
              <InsightPanel
                :title="$t('page.dashboard.executionRuntime.title')"
                icon="lucide:route"
                tone="teal"
              >
                <dl v-if="executionRuntime" class="runtime-metrics">
                  <div>
                    <dt>{{ $t('page.dashboard.executionRuntime.pending') }}</dt>
                    <dd>{{ executionRuntime.pending_intents }}</dd>
                  </div>
                  <div>
                    <dt>{{ $t('page.dashboard.executionRuntime.active') }}</dt>
                    <dd>{{ executionRuntime.active_orders }}</dd>
                  </div>
                  <div>
                    <dt>
                      {{ $t('page.dashboard.executionRuntime.attention') }}
                    </dt>
                    <dd>
                      {{
                        executionRuntime.ambiguous_orders +
                        executionRuntime.unresolved_reconciliations
                      }}
                    </dd>
                  </div>
                </dl>
                <Empty
                  v-else
                  :description="$t('page.dashboard.executionRuntime.empty')"
                  :image="Empty.PRESENTED_IMAGE_SIMPLE"
                />
              </InsightPanel>
            </div>
          </div>
        </template>

        <div v-if="overview" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <InsightPanel
            fill
            :title="$t('page.dashboard.dataQuality.title')"
            icon="lucide:gauge"
            tone="sky"
          >
            <template v-if="quality">
              <div class="data-quality-gauge">
                <Progress
                  :aria-label="$t('page.dashboard.dataQuality.progressAria')"
                  :percent="Math.round((usableRatio ?? 0) * 100)"
                  :status="quality.ingest_lag_exceeded ? 'exception' : 'normal'"
                  :title="$t('page.dashboard.dataQuality.progressAria')"
                  type="dashboard"
                />
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <Tag color="success">
                  {{ $t('page.dashboard.dataQuality.fresh') }} ·
                  {{ quality.fresh }}
                </Tag>
                <Tag color="processing">
                  {{ $t('page.dashboard.dataQuality.acceptable') }} ·
                  {{ quality.acceptable }}
                </Tag>
                <Tag color="warning">
                  {{ $t('page.dashboard.dataQuality.degraded') }} ·
                  {{ quality.degraded }}
                </Tag>
                <Tag color="error">
                  {{ $t('page.dashboard.dataQuality.stale') }} ·
                  {{ quality.stale }}
                </Tag>
              </div>
              <p class="text-muted-foreground mt-3 text-xs">
                {{ quality.worst_book_age_ms }}ms /
                {{ quality.max_book_age_ms }}ms ·
                {{ quality.worst_ingest_lag_ms }}ms /
                {{ quality.max_ingest_lag_ms }}ms
              </p>
            </template>
            <div v-else class="panel-empty">
              <Empty
                :description="$t('page.dashboard.section.unavailable')"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </div>
          </InsightPanel>

          <InsightPanel
            fill
            :title="$t('page.dashboard.health.title')"
            icon="lucide:heart-pulse"
            tone="teal"
          >
            <template v-if="health">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-sm font-medium">{{
                  health.ready
                    ? $t('page.dashboard.health.ready')
                    : $t('page.dashboard.health.degraded')
                }}</span>
                <Badge :status="health.ready ? 'success' : 'error'" />
              </div>
              <ul class="health-check-list grid gap-2">
                <li
                  v-for="check in health.checks"
                  :key="check.name"
                  class="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs"
                >
                  <span class="truncate">{{ check.name }}</span>
                  <Tag :color="check.ok ? 'success' : 'error'">
                    {{
                      check.ok
                        ? $t('page.dashboard.health.ok')
                        : $t('page.dashboard.health.failed')
                    }}
                  </Tag>
                </li>
              </ul>
            </template>
            <div v-else class="panel-empty">
              <Empty
                :description="$t('page.dashboard.section.unavailable')"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </div>
          </InsightPanel>
        </div>

        <InsightPanel
          class="dashboard-feedback-panel"
          :title="$t('page.dashboard.feedback.title')"
          icon="lucide:refresh-cw"
          tone="violet"
        >
          <template #extra>
            <Button
              v-if="canReadFeedback"
              class="min-h-11"
              size="small"
              type="text"
              @click="navigate('/research/learning-policy?module=feedback')"
            >
              {{ $t('page.dashboard.feedback.open') }}
            </Button>
          </template>

          <div class="dashboard-feedback-scroll">
            <div aria-live="polite" class="sr-only" role="status">
              {{ $t(`page.dashboard.feedback.state.${feedbackState}`) }}
            </div>

            <Skeleton
              v-if="feedbackState === 'loading'"
              active
              :paragraph="{ rows: 5 }"
            />
            <Alert
              v-else-if="feedbackState === 'permission'"
              :message="$t('page.dashboard.feedback.permission')"
              show-icon
              type="warning"
            />
            <Alert
              v-else-if="feedbackState === 'error'"
              :description="$t('page.dashboard.feedback.errorDescription')"
              :message="
                feedbackError ?? $t('page.dashboard.feedback.loadError')
              "
              show-icon
              type="error"
            />
            <template v-else>
              <Alert
                v-if="feedbackError"
                class="mb-3"
                :description="$t('page.dashboard.feedback.staleDescription')"
                :message="feedbackError"
                show-icon
                type="warning"
              />
              <Alert
                v-if="feedbackState === 'blocked'"
                class="mb-3"
                :message="$t('page.dashboard.feedback.blocked')"
                show-icon
                type="warning"
              />
              <ul v-if="feedbackSummary?.profiles.length" class="grid gap-3">
                <li
                  v-for="profile in feedbackSummary.profiles"
                  :key="profile.profileId"
                  class="min-w-0 rounded-lg border p-3"
                >
                  <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <span class="min-w-0 flex-1 truncate font-mono text-xs">
                      {{ profile.profileId }}
                    </span>
                    <Tag>
                      {{
                        profile.category
                          ? $t(`enum.marketCategory.${profile.category}`)
                          : $t(
                              'page.research.feedback.profile.category.control',
                            )
                      }}
                    </Tag>
                    <Tag :color="readinessColor(profile.readinessState)">
                      {{
                        $t(
                          `page.research.feedback.profile.readiness.${profile.readinessState}`,
                        )
                      }}
                    </Tag>
                  </div>
                  <dl class="mt-3 grid gap-2 text-xs">
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">
                        {{ $t('page.dashboard.feedback.history') }}
                      </dt>
                      <dd class="text-right font-mono tabular-nums">
                        <template v-if="profile.observedHistoryDays !== null">
                          {{ profile.observedHistoryDays }} /
                          {{
                            profile.requiredHistoryDays ??
                            $t('page.research.feedback.profile.notObserved')
                          }}
                        </template>
                        <template v-else>
                          {{ $t('page.research.feedback.profile.notObserved') }}
                        </template>
                      </dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">
                        {{ $t('page.dashboard.feedback.latest') }}
                      </dt>
                      <dd class="flex flex-wrap justify-end gap-1 text-right">
                        <Tag
                          :color="
                            feedbackStatusColor(profile.latestCycleStatus)
                          "
                        >
                          {{
                            profile.latestCycleStatus
                              ? $t(
                                  `page.research.feedback.status.${profile.latestCycleStatus}`,
                                )
                              : $t('page.research.feedback.profile.notObserved')
                          }}
                        </Tag>
                        <span v-if="profile.latestDecision">
                          {{
                            $t(
                              `page.research.feedback.decision.${profile.latestDecision}`,
                            )
                          }}
                        </span>
                      </dd>
                    </div>
                    <div class="flex items-start justify-between gap-3">
                      <dt class="text-muted-foreground">
                        {{ $t('page.dashboard.feedback.updatedAt') }}
                      </dt>
                      <dd class="text-right">
                        {{
                          profile.latestUpdatedAt
                            ? formatDateTimeLocal(profile.latestUpdatedAt)
                            : $t('page.research.feedback.profile.notObserved')
                        }}
                      </dd>
                    </div>
                  </dl>
                  <Button
                    v-if="profile.latestCycleId"
                    class="mt-2 w-full"
                    size="small"
                    type="text"
                    @click="openFeedbackCycle(profile.latestCycleId)"
                  >
                    {{ $t('page.dashboard.feedback.openCycle') }}
                  </Button>
                </li>
              </ul>
              <Empty
                v-else
                :description="$t('page.dashboard.feedback.empty')"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
              <p
                v-if="feedbackSummary"
                class="text-muted-foreground mt-3 text-right text-xs"
                data-screenshot-volatile="true"
              >
                {{
                  $t('page.dashboard.feedback.revision', {
                    revision: feedbackSummary.revision,
                    time: formatDateTimeLocal(feedbackSummary.generatedAt),
                  })
                }}
              </p>
            </template>
          </div>
        </InsightPanel>

        <template v-if="overview">
          <InsightPanel
            :title="$t('page.dashboard.inbox.title')"
            icon="lucide:inbox"
            tone="amber"
          >
            <div v-if="actions.length > 0" class="grid gap-2">
              <button
                v-for="action in actions"
                :key="action.id"
                class="hover:bg-accent focus-visible:ring-primary grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-3 text-left focus-visible:ring-2 focus-visible:outline-none"
                type="button"
                @click="navigate(action.target_route)"
              >
                <Badge :status="severityStatus(action.severity)" />
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium">{{
                    $t(`page.dashboard.inbox.reason.${action.reason_code}`)
                  }}</span>
                  <span class="text-muted-foreground block text-xs">{{
                    $t('page.dashboard.inbox.owner', { owner: action.owner })
                  }}</span>
                  <span class="text-muted-foreground block text-xs">{{
                    formatDateTimeLocal(action.observed_at)
                  }}</span>
                </span>
                <IconifyIcon
                  icon="lucide:arrow-up-right"
                  class="text-muted-foreground size-4"
                />
              </button>
            </div>
            <Empty
              v-else
              :description="$t('page.dashboard.inbox.clear')"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </InsightPanel>

          <p
            class="text-muted-foreground text-right text-xs"
            data-screenshot-volatile="true"
          >
            {{
              $t('page.dashboard.commandCenter.revision', {
                revision: overview.revision.slice(0, 8),
                time: formatDateTimeLocal(overview.generated_at),
              })
            }}
          </p>
        </template>
      </template>

      <Drawer
        :open="freshBootDetailOpen"
        :title="$t('page.dashboard.bootstrap.timelineTitle')"
        root-class-name="fresh-boot-timeline-drawer"
        size="large"
        @close="freshBootDetailOpen = false"
      >
        <Skeleton v-if="freshBootDetailLoading" active />
        <Alert
          v-else-if="freshBootDetailError"
          :message="$t('page.dashboard.bootstrap.timelineError')"
          show-icon
          type="error"
        />
        <template v-else-if="freshBootDetail">
          <div class="mb-4 grid gap-1">
            <span class="text-muted-foreground text-xs">
              {{ $t('page.dashboard.bootstrap.runId') }}
            </span>
            <strong class="fresh-boot-id">
              {{ freshBootDetail.run.run_id }}
            </strong>
          </div>
          <ol
            v-if="freshBootDetail.events.length > 0"
            aria-live="polite"
            class="grid gap-3"
          >
            <li
              v-for="event in freshBootDetail.events"
              :key="event.event_id"
              class="rounded-lg border p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <strong>
                  {{ $t(`page.dashboard.bootstrap.event.${event.event}`) }}
                </strong>
                <span class="text-muted-foreground text-xs">
                  {{ formatDateTimeLocal(event.occurred_at) }}
                </span>
              </div>
              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>#{{ event.sequence }}</span>
                <span>
                  {{
                    $t('page.dashboard.bootstrap.attempt', {
                      value: event.attempt,
                    })
                  }}
                </span>
                <span>{{ event.actor }}</span>
              </div>
              <dl class="mt-2 grid gap-2 text-xs">
                <div v-if="event.research_job_id">
                  <dt class="text-muted-foreground">
                    {{ $t('page.dashboard.bootstrap.job') }}
                  </dt>
                  <dd class="fresh-boot-id">{{ event.research_job_id }}</dd>
                </div>
                <div v-if="event.result_ref">
                  <dt class="text-muted-foreground">
                    {{ $t('page.dashboard.bootstrap.resultRef') }}
                  </dt>
                  <dd class="fresh-boot-id">{{ event.result_ref }}</dd>
                </div>
                <div v-if="event.evidence_ref">
                  <dt class="text-muted-foreground">
                    {{ $t('page.dashboard.bootstrap.evidenceRef') }}
                  </dt>
                  <dd class="fresh-boot-id">{{ event.evidence_ref }}</dd>
                </div>
              </dl>
              <p v-if="event.detail" class="mt-2 text-sm">
                {{ event.detail }}
              </p>
            </li>
          </ol>
          <Empty
            v-else
            :description="$t('page.dashboard.bootstrap.timelineEmpty')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </template>
      </Drawer>

      <Drawer
        :open="selectedRecommendation !== null"
        :size="520"
        :title="$t('page.dashboard.orbit.drawerTitle')"
        @close="selectedRecommendation = null"
      >
        <template v-if="selectedRecommendation">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem :label="$t('page.dashboard.orbit.rank')">
              #{{ selectedRecommendation.rank }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.dashboard.orbit.market')">
              {{ selectedRecommendation.identity.question }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.dashboard.orbit.outcome')">
              {{ selectedRecommendation.identity.outcome_name }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.dashboard.orbit.confidence')">
              {{
                formatBps(
                  selectedRecommendation.economics.profit_probability_bps,
                )
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.dashboard.orbit.expectedReturn')"
            >
              {{
                formatUsd(
                  selectedRecommendation.economics.robust_expected_net_usd,
                )
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.dashboard.orbit.hardReservedCash')"
            >
              {{
                formatUsd(
                  selectedRecommendation.trade_plan.sizing
                    .hard_reserved_cash_usd,
                )
              }}
            </DescriptionsItem>
          </Descriptions>
          <div class="mt-4 rounded-lg border p-3">
            <h3 class="text-sm font-semibold">
              {{ $t('page.dashboard.orbit.evidence') }}
            </h3>
            <ul class="mt-2 grid gap-2 text-xs">
              <li
                v-for="factor in selectedRecommendation.factor_breakdown.slice(
                  0,
                  5,
                )"
                :key="factor.factor_name"
                class="flex justify-between gap-3"
              >
                <span>{{ factor.factor_name }}</span>
                <span class="text-muted-foreground">{{
                  formatPercent(factor.confidence)
                }}</span>
              </li>
            </ul>
          </div>
          <Button
            class="mt-4 w-full"
            type="primary"
            @click="openSelectedRecommendation"
          >
            {{ $t('page.dashboard.orbit.openDetail') }}
          </Button>
        </template>
      </Drawer>

      <Drawer
        :open="blockersOpen"
        :size="480"
        :title="$t('page.dashboard.bootstrap.reportBlocked')"
        @close="blockersOpen = false"
      >
        <Alert
          :description="$t('page.dashboard.commandCenter.subtitle')"
          :message="$t('page.dashboard.primaryAction.view_blockers')"
          show-icon
          type="warning"
        />
        <ul class="mt-4 grid gap-2">
          <li
            v-for="reason in blockerReasons"
            :key="reason"
            class="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <IconifyIcon
              icon="lucide:circle-alert"
              class="text-warning mt-0.5 size-4 shrink-0"
            />
            <span>{{ $t(`page.dashboard.bootstrap.reason.${reason}`) }}</span>
          </li>
        </ul>
        <Empty
          v-if="blockerReasons.length === 0"
          :description="$t('page.dashboard.section.unavailable')"
          :image="Empty.PRESENTED_IMAGE_SIMPLE"
        />
        <Button
          class="mt-4 w-full"
          @click="navigate('/trading/recommendations?module=reports')"
        >
          {{ $t('page.menu.recommendations') }}
        </Button>
      </Drawer>

      <RunReportModalHost />
    </div>
  </Page>
</template>

<style scoped>
.command-rail :deep(.ant-btn-primary:not(.ant-btn-dangerous)) {
  color: white;
  background: var(--qp-gradient-control);
  background-clip: border-box;
  background-origin: border-box;
  border-color: transparent;
  box-shadow: var(--qp-shadow-subtle);
}

.command-rail :deep(.command-primary.ant-btn) {
  height: 2rem;
  min-height: 2rem;
  padding-inline: 0.75rem;
  font-size: 0.8125rem;
}

.command-rail :deep(.window-segmented.ant-segmented) {
  padding: 0.125rem;
  font-size: 0.75rem;
  background: hsl(var(--qp-surface-inset) / 92%);
  border: 1px solid hsl(var(--qp-border-subtle));
}

.command-rail :deep(.window-segmented .ant-segmented-item) {
  min-width: 2.75rem;
  font-weight: 600;
  color: hsl(var(--qp-text-muted));
}

.command-rail :deep(.window-segmented .ant-segmented-item-label) {
  min-height: 1.75rem;
  padding-inline: 0.65rem;
  line-height: 1.75rem;
}

.command-rail :deep(.window-segmented .ant-segmented-item-selected) {
  font-weight: 700;
  color: hsl(var(--qp-text-on-accent)) !important;
  background: linear-gradient(
    90deg,
    hsl(var(--qp-accent-sky)),
    hsl(var(--qp-accent-violet))
  ) !important;
  box-shadow:
    0 0 0 1px hsl(var(--qp-accent-sky) / 50%),
    0 6px 14px -6px hsl(var(--qp-accent-sky) / 75%);
}

.command-rail
  :deep(
    .window-segmented .ant-segmented-item-selected .ant-segmented-item-label
  ) {
  color: inherit;
}

.command-rail :deep(.window-segmented .ant-segmented-thumb) {
  background: linear-gradient(
    90deg,
    hsl(var(--qp-accent-sky)),
    hsl(var(--qp-accent-violet))
  );
  box-shadow:
    0 0 0 1px hsl(var(--qp-accent-sky) / 50%),
    0 6px 14px -6px hsl(var(--qp-accent-sky) / 75%);
}

.status-cell {
  min-width: 0;
  padding: 0.65rem 0.75rem;
  background: hsl(var(--muted) / 48%);
  border: 1px solid hsl(var(--border) / 72%);
  border-radius: 0.5rem;
}

.status-cell dt {
  margin-bottom: 0.25rem;
  color: hsl(var(--muted-foreground));
}

.status-cell dd {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-family-mono);
  font-weight: 600;
  white-space: nowrap;
}

.runtime-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.runtime-metrics > div {
  min-width: 0;
  padding: 12px;
  background: hsl(var(--qp-surface-inset));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.runtime-metrics dt {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: hsl(var(--qp-text-muted));
  white-space: nowrap;
}

.runtime-metrics dd {
  margin-top: 4px;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--qp-text-primary));
}

.dashboard-equal-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.25rem;
  align-items: stretch;
}

.dashboard-equal-lead,
.dashboard-equal-follow {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.dashboard-equal-lead > :deep(.insight-panel),
.dashboard-equal-follow > :deep(.insight-panel) {
  flex: 1 1 auto;
  min-height: 0;
}

.data-quality-gauge {
  display: grid;
  flex: 1 1 auto;
  place-items: center;
}

.health-check-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.dashboard-feedback-panel {
  height: 22.5rem;
  overflow: hidden;
}

.dashboard-feedback-panel :deep(.panel-body) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dashboard-feedback-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.dashboard-feedback-scroll :deep(.ant-empty) {
  display: grid;
  place-items: center;
  min-height: 12rem;
}

@media (min-width: 1280px) {
  .dashboard-equal-row {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }

  .dashboard-equal-follow {
    position: relative;
    overflow: hidden;
  }

  .dashboard-equal-follow > :deep(.insight-panel) {
    position: absolute;
    inset: 0;
    flex: none;
  }
}

:global(.fresh-boot-timeline-drawer .ant-drawer-content-wrapper) {
  width: min(45rem, 100vw) !important;
}

@media (prefers-reduced-motion: reduce) {
  :deep(*) {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
