<script lang="ts" setup>
import type {
  DashboardActionItemView,
  DashboardOverviewView,
  DashboardSection,
  DashboardWindow,
  QuantRecommendationView,
} from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { MotionGroup } from '@vben/plugins/motion';

import {
  useDebounceFn,
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
  message,
  Progress,
  Segmented,
  Skeleton,
  Tag,
} from 'antdv-next';

import { getDashboardOverview } from '#/api/dashboard';
import { fetchRuntimeConfigApprovals } from '#/api/runtime-config';
import { activateBootstrap, getSystemStatus } from '#/api/system';
import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import {
  formatBps,
  formatDateTimeLocal,
  formatPercent,
  formatUsd,
  parseDecimal,
  toAnimatorNumber,
} from '#/shared/components/format';
import KpiStatCard from '#/shared/components/kpi-stat-card.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpWs } from '#/shared/composables/use-qp-ws';
import { useRunReportAction } from '#/shared/composables/use-run-report-action';
import { useQuantReportStore, useSystemStore } from '#/store';

import EquityDrawdownChart from './modules/equity-drawdown-chart.vue';
import ExposureTreemap from './modules/exposure-treemap.vue';
import LifecycleSankey from './modules/lifecycle-sankey.vue';
import RecommendationOrbit from './modules/recommendation-orbit.vue';

import './modules/register-dashboard-charts';

defineOptions({ name: 'DashboardOverview' });

const router = useRouter();
const systemStore = useSystemStore();
const reportStore = useQuantReportStore();
const qpWs = useQpWs();
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
const initialLoading = ref(true);
const refreshing = ref(false);
const loadError = ref<null | string>(null);
const selectedRecommendation = ref<null | QuantRecommendationView>(null);
const activationLoading = ref(false);
const blockersOpen = ref(false);

const motionVariants = computed(() =>
  reducedMotion.value === 'reduce'
    ? { initial: { opacity: 1 }, enter: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 10 },
        enter: {
          opacity: 1,
          transition: { duration: 190, ease: 'easeOut' },
          y: 0,
        },
      },
);

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
]);

const wsColor: Record<string, string> = {
  connected: 'success',
  disconnected: 'error',
  reconnecting: 'warning',
};
const primaryActionLabel = computed(() =>
  authority.value
    ? $t(`page.dashboard.primaryAction.${authority.value.primary_action}`)
    : $t('page.dashboard.primaryAction.view_blockers'),
);

async function loadOverview() {
  const hasSnapshot = overview.value !== null;
  if (hasSnapshot) refreshing.value = true;
  else initialLoading.value = true;
  loadError.value = null;
  try {
    overview.value = await getDashboardOverview(windowValue.value);
    if (authority.value) {
      systemStore.applyControlPlaneStatus(authority.value.system);
    }
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? error.message
        : $t('page.dashboard.loadError.overview');
  } finally {
    initialLoading.value = false;
    refreshing.value = false;
  }
}

const reloadForEvent = useDebounceFn(() => void loadOverview(), 300);
watch(windowValue, () => void loadOverview());
watch(() => reportStore.revision, reloadForEvent);
watch(
  () => systemStore.status?.checked_at,
  (next, previous) => {
    if (previous && next !== previous) reloadForEvent();
  },
);
useIntervalFn(() => {
  if (visibility.value === 'visible') void loadOverview();
}, 30_000);

async function activateColdStart() {
  const controlPlane = authority.value?.system;
  if (!controlPlane || controlPlane.bootstrap.phase !== 'awaiting_activation') {
    return;
  }
  activationLoading.value = true;
  try {
    const approvals = await fetchRuntimeConfigApprovals();
    if (approvals.length === 0) {
      message.warning($t('page.dashboard.bootstrap.noConfig'));
      return;
    }
    const result = await governed(
      (context) => {
        const approval = approvals.find(
          (candidate) =>
            candidate.runtime_config_approval_id ===
            context.fields.runtime_config_approval_id,
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
            reason: context.reason,
            report_only_forced_ack:
              context.fields.report_only_forced_ack === 'acknowledged',
            runtime_config_approval_id: approval.runtime_config_approval_id,
            runtime_config_version_id: approval.runtime_config_version_id,
          },
          context,
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
              label: `${approval.runtime_config_version_id} · ${approval.config_hash.slice(0, 18)}…`,
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
    if (!result) return;
    const status = await getSystemStatus();
    systemStore.applyControlPlaneStatus(status);
    await loadOverview();
    message.success($t('page.dashboard.bootstrap.activated'));
  } finally {
    activationLoading.value = false;
  }
}

function executePrimaryAction() {
  const action = authority.value?.primary_action;
  if (action === 'activate_bootstrap') {
    void activateColdStart();
  } else if (action === 'resolve_reconciliation') {
    void router.push('/quant/reconciliations');
  } else if (action === 'run_report' && canRunReport) {
    openRunReport();
  } else {
    blockersOpen.value = true;
  }
}

function navigate(path: string) {
  void router.push(path);
}

function severityStatus(severity: DashboardActionItemView['severity']) {
  if (severity === 'critical') return 'error';
  if (severity === 'warning') return 'warning';
  return 'processing';
}

function sectionLabel(section: DashboardSection<unknown>) {
  return $t(`page.dashboard.section.${section.state}`);
}

onMounted(() => void loadOverview());
</script>

<template>
  <Page auto-content-height data-testid="dashboard-command-center">
    <div class="flex flex-col gap-5 pb-6">
      <Alert
        v-if="loadError"
        :description="loadError"
        :message="$t('page.dashboard.loadError.overview')"
        show-icon
        type="error"
      >
        <template #action>
          <Button size="small" @click="loadOverview">
            {{ $t('page.shared.asyncState.retry') }}
          </Button>
        </template>
      </Alert>

      <Skeleton v-if="initialLoading" :paragraph="{ rows: 14 }" active />

      <template v-else-if="overview">
        <section
          class="command-rail bg-card relative overflow-hidden rounded-xl border p-4"
          aria-labelledby="dashboard-authority-title"
        >
          <div class="pointer-events-none absolute inset-0 opacity-40"></div>
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
                :options="[
                  { label: '24H', value: '24h' },
                  { label: '7D', value: '7d' },
                  { label: '30D', value: '30d' },
                ]"
              />
              <Button
                data-testid="dashboard-primary-action"
                :disabled="!authority?.primary_action_enabled"
                :loading="activationLoading"
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
              <dd>{{ authority.system.quant_runtime_mode }}</dd>
            </div>
            <div class="status-cell">
              <dt>{{ $t('page.dashboard.status.bootstrap') }}</dt>
              <dd>
                {{
                  $t(
                    `page.dashboard.bootstrap.phaseValue.${authority.system.bootstrap.phase}`,
                  )
                }}
              </dd>
            </div>
            <div class="status-cell">
              <dt>{{ $t('page.dashboard.status.killSwitch') }}</dt>
              <dd>{{ authority.system.kill_switch.state }}</dd>
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
                {{ authority.system.market_data.last_message_age_ms ?? '—' }}ms
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

        <MotionGroup
          is="div"
          class="grid grid-cols-2 gap-4 xl:grid-cols-5"
          :variants="motionVariants"
        >
          <KpiStatCard
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
            :duration="reducedMotion === 'reduce' ? 0 : 700"
            :end-val="kpi.endVal"
            :icon="kpi.icon"
            :prefix="kpi.prefix"
            :suffix="kpi.suffix"
            :title="kpi.title"
          >
            <template #footer>{{ kpi.footer }}</template>
          </KpiStatCard>
        </MotionGroup>

        <MotionGroup
          is="div"
          class="grid grid-cols-1 gap-5 xl:grid-cols-12"
          :variants="motionVariants"
        >
          <div class="xl:col-span-7">
            <EquityDrawdownChart :section="overview.equity_curve" />
          </div>
          <div class="xl:col-span-5">
            <RecommendationOrbit
              :paused="selectedRecommendation !== null"
              :recommendations="latestReport?.recommendations ?? []"
              @select="selectedRecommendation = $event"
            />
          </div>
        </MotionGroup>

        <MotionGroup
          is="div"
          class="grid grid-cols-1 gap-5 xl:grid-cols-12"
          :variants="motionVariants"
        >
          <div class="xl:col-span-7">
            <LifecycleSankey :section="overview.report_lifecycle" />
          </div>
          <div class="xl:col-span-5">
            <ExposureTreemap :section="overview.exposures" />
          </div>
        </MotionGroup>

        <MotionGroup
          is="div"
          class="grid grid-cols-1 gap-5 lg:grid-cols-3"
          :variants="motionVariants"
        >
          <DashboardPanel
            :title="$t('page.dashboard.dataQuality.title')"
            icon="lucide:gauge"
            tone="sky"
          >
            <template v-if="quality">
              <div class="flex items-center justify-center py-3">
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
            <Empty
              v-else
              :description="$t('page.dashboard.section.unavailable')"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </DashboardPanel>

          <DashboardPanel
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
              <ul class="grid gap-2">
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
            <Empty
              v-else
              :description="$t('page.dashboard.section.unavailable')"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />
          </DashboardPanel>

          <DashboardPanel
            :title="$t('page.dashboard.research.title')"
            icon="lucide:flask-conical"
            tone="violet"
          >
            <template v-if="valueOf(overview.research_readiness)">
              <Progress
                :aria-label="$t('page.dashboard.research.progressAria')"
                :percent="
                  Math.min(
                    100,
                    Math.round(
                      ((valueOf(overview.research_readiness)
                        ?.observed_history_days ?? 0) /
                        200) *
                        100,
                    ),
                  )
                "
                :success="{
                  percent: valueOf(overview.research_readiness)
                    ?.factor_gate_ready
                    ? 100
                    : 0,
                }"
                :title="$t('page.dashboard.research.progressAria')"
                type="dashboard"
              />
              <p class="mt-3 text-center text-sm">
                {{
                  valueOf(overview.research_readiness)?.observed_history_days ??
                  0
                }}
                / 200 {{ $t('page.dashboard.research.days') }}
              </p>
            </template>
            <div
              v-else
              class="flex h-full min-h-40 flex-col items-center justify-center text-center"
            >
              <IconifyIcon
                icon="lucide:shield-question"
                class="text-muted-foreground mb-3 size-8"
              />
              <p class="text-sm font-medium">
                {{ sectionLabel(overview.research_readiness) }}
              </p>
              <p class="text-muted-foreground mt-1 max-w-xs text-xs">
                {{ $t('page.dashboard.research.evidenceMissing') }}
              </p>
              <Button
                class="mt-3"
                size="small"
                @click="navigate('/research/datasets')"
              >
                {{ $t('page.dashboard.research.open') }}
              </Button>
            </div>
          </DashboardPanel>
        </MotionGroup>

        <DashboardPanel
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
        </DashboardPanel>

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
              {{ formatPercent(selectedRecommendation.confidence) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.dashboard.orbit.expectedReturn')"
            >
              {{ formatBps(selectedRecommendation.expected_return_bps) }}
            </DescriptionsItem>
            <DescriptionsItem :label="$t('page.dashboard.orbit.suggested')">
              {{
                selectedRecommendation.trade_plan.kind === 'frozen'
                  ? formatUsd(
                      selectedRecommendation.trade_plan.sizing.suggested_usd,
                    )
                  : $t('page.dashboard.section.blocked')
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
            @click="
              navigate(
                `/quant/recommendations/${selectedRecommendation.recommendation_id}`,
              )
            "
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
        <Button class="mt-4 w-full" @click="navigate('/quant/reports')">
          {{ $t('page.menu.quantReports') }}
        </Button>
      </Drawer>

      <RunReportModalHost />
    </div>
  </Page>
</template>

<style scoped>
.command-rail::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background:
    radial-gradient(
      circle at 10% 0%,
      hsl(var(--primary) / 12%),
      transparent 32%
    ),
    radial-gradient(
      circle at 92% 100%,
      hsl(270deg 80% 60% / 10%),
      transparent 30%
    );
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

@media (prefers-reduced-motion: reduce) {
  :deep(*) {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
