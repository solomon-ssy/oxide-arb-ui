<script lang="ts" setup>
import type {
  RuntimeActivityActionKind,
  RuntimeActivityDomain,
  RuntimeActivityPageView,
  RuntimeActivityStatus,
  RuntimeActivityView,
} from '@vben/types';

import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Button, Card, Flex, message, Statistic } from 'antdv-next';

import { retryReportRun } from '#/api/quant-reports';
import { getReconciliation } from '#/api/reconciliations';
import {
  cancelResearchJob,
  getResearchJob,
  retryResearchJob,
} from '#/api/research';
import { listRuntimeActivities } from '#/api/runtime-activities';
import { $t } from '#/locales';
import RuntimeActivityFeed from '#/shared/components/activity/activity-feed.vue';
import EnumSelect from '#/shared/components/enum/enum-select.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { enumOptions } from '#/shared/presentation/enum-options';
import { useActivityStore } from '#/store/activity';
import { useReconciliationActions } from '#/views/execution/post-trade/modules/reconciliation/modules/use-reconciliation-actions';

import ActivityTaskInspector from './modules/activity-task-inspector.vue';
import JobDetailDrawer from './modules/research-jobs/modules/job-detail-drawer.vue';

defineOptions({ name: 'RuntimeActivityPage' });

const DOMAIN_FILTERS: RuntimeActivityDomain[] = [
  'research',
  'report',
  'execution',
  'reconciliation',
  'settlement',
];
const STATUS_FILTERS: RuntimeActivityStatus[] = [
  'running',
  'pending',
  'attention',
  'failed',
  'succeeded',
  'cancelled',
  'skipped',
];
const DOMAINS = new Set(DOMAIN_FILTERS);
const STATUSES = new Set(STATUS_FILTERS);
const domainOptions = enumOptions('RuntimeActivityDomain');
const statusOptions = enumOptions('RuntimeActivityStatus');

const route = useRoute();
const router = useRouter();
const activityStore = useActivityStore();
const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();

const domain = ref<RuntimeActivityDomain | undefined>(
  readDomain(route.query.domain),
);
const status = ref<RuntimeActivityStatus | undefined>(
  readStatus(route.query.status),
);
const page = ref<null | RuntimeActivityPageView>(null);
const loading = ref(false);
const loadingMore = ref(false);
const loadError = ref<null | string>(null);
let requestGeneration = 0;
let controller: AbortController | null = null;

const items = computed(() => page.value?.items ?? []);
const hasMore = computed(() => page.value?.has_more ?? false);
const summaryByDomain = computed(() =>
  Object.fromEntries(
    (page.value?.summary.by_domain ?? []).map((item) => [
      item.domain,
      item.count,
    ]),
  ),
);
const selectedActivity = ref<null | RuntimeActivityView>(null);
const taskOpen = ref(false);

const [JobDrawer, jobDrawerApi] = useVbenDrawer({
  connectedComponent: JobDetailDrawer,
  destroyOnClose: true,
  onOpenChange(isOpen) {
    if (!isOpen && route.query.entity === 'research-job') {
      const query = { ...route.query };
      delete query.entity;
      delete query.id;
      void router.replace({ query });
    }
  },
});

const reconciliationActions = useReconciliationActions(() => {
  activityStore.invalidate();
  void load(true);
});

function queryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function readDomain(value: unknown): RuntimeActivityDomain | undefined {
  const candidate = queryValue(value);
  return DOMAINS.has(candidate as RuntimeActivityDomain)
    ? (candidate as RuntimeActivityDomain)
    : undefined;
}

function readStatus(value: unknown): RuntimeActivityStatus | undefined {
  const candidate = queryValue(value);
  return STATUSES.has(candidate as RuntimeActivityStatus)
    ? (candidate as RuntimeActivityStatus)
    : undefined;
}

async function syncFiltersToRoute() {
  const query = { ...route.query };
  if (domain.value) query.domain = domain.value;
  else delete query.domain;
  if (status.value) query.status = status.value;
  else delete query.status;
  await router.replace({ query });
}

async function load(reset: boolean) {
  if (!reset && (!page.value?.has_more || !page.value.next_cursor)) {
    return;
  }
  const generation = ++requestGeneration;
  controller?.abort();
  controller = new AbortController();
  if (reset) loading.value = true;
  else loadingMore.value = true;
  loadError.value = null;
  const result = await handleRequest(
    () =>
      listRuntimeActivities(
        {
          cursor: reset ? undefined : (page.value?.next_cursor ?? undefined),
          domain: domain.value,
          limit: 50,
          status: status.value,
        },
        controller?.signal,
      ),
    {
      onError: (error) => {
        loadError.value = error.message;
      },
      silent: true,
    },
  );
  if (generation === requestGeneration && result !== null) {
    page.value = reset
      ? result
      : {
          ...result,
          items: deduplicate([...(page.value?.items ?? []), ...result.items]),
        };
  }
  if (generation === requestGeneration) {
    loading.value = false;
    loadingMore.value = false;
  }
}

function deduplicate(values: RuntimeActivityView[]) {
  return [...new Map(values.map((item) => [item.activity_id, item])).values()];
}

async function refresh() {
  await load(true);
}

async function runAction(
  kind: RuntimeActivityActionKind,
  item: RuntimeActivityView,
) {
  const id = item.entity.id;
  let changed: boolean;
  switch (kind) {
    case 'cancel_research_job': {
      changed =
        (await governed((ctx) => cancelResearchJob(id, ctx), {
          confirmWord: 'CANCEL',
          danger: true,
          summary: $t('page.runtimeActivity.actionSummary.cancel', { id }),
          title: $t(`page.runtimeActivity.action.${kind}`),
        })) !== null;

      break;
    }
    case 'retry_report_run': {
      changed =
        (await governed(
          (ctx) =>
            retryReportRun(
              id,
              { reason: ctx.reason, request_id: crypto.randomUUID() },
              ctx,
            ),
          {
            summary: $t('page.runtimeActivity.actionSummary.retryReport', {
              id,
            }),
            title: $t(`page.runtimeActivity.action.${kind}`),
          },
        )) !== null;

      break;
    }
    case 'retry_research_job': {
      changed =
        (await governed((ctx) => retryResearchJob(id, ctx), {
          summary: $t('page.runtimeActivity.actionSummary.retryResearch', {
            id,
          }),
          title: $t(`page.runtimeActivity.action.${kind}`),
        })) !== null;

      break;
    }
    default: {
      const reconciliation = await handleRequest(() => getReconciliation(id));
      changed = reconciliation
        ? (await reconciliationActions.resolve(reconciliation)) !== null
        : false;
    }
  }
  if (changed) {
    message.success($t('page.runtimeActivity.actionAccepted'));
    activityStore.invalidate();
    await refresh();
  }
}

async function openEntity() {
  const entity = queryValue(route.query.entity);
  const id = queryValue(route.query.id);
  if (typeof entity !== 'string' || typeof id !== 'string' || id === '') {
    selectedActivity.value = null;
    taskOpen.value = false;
    jobDrawerApi.close();
    return;
  }
  selectedActivity.value =
    items.value.find(
      (item) => item.entity.kind === entity && item.entity.id === id,
    ) ?? stubActivity(entity, id);
  if (entity === 'research-job') {
    const job = await handleRequest(() => getResearchJob(id));
    if (queryValue(route.query.id) !== id) {
      return;
    }
    if (job) {
      taskOpen.value = false;
      jobDrawerApi.setData({ job }).open();
      return;
    }
  }
  jobDrawerApi.close();
  taskOpen.value = true;
}

function selectActivity(item: RuntimeActivityView) {
  void router.replace({
    query: {
      ...route.query,
      entity: item.entity.kind,
      id: item.entity.id,
    },
  });
}

function clearEntityQuery() {
  const query = { ...route.query };
  delete query.entity;
  delete query.id;
  void router.replace({ query });
}

function stubActivity(kind: string, id: string): RuntimeActivityView {
  return {
    activity_id: id,
    available_actions: [],
    detail: null,
    domain: activityDomain(kind),
    entity: { id, kind },
    finished_at: null,
    kind,
    progress_pct: null,
    related_entity: null,
    source_status: '',
    started_at: null,
    status: 'pending',
    target_route: workspacePath(kind, id),
    updated_at: '',
  };
}

function activityDomain(kind: string): RuntimeActivityDomain {
  switch (kind) {
    case 'execution-order': {
      return 'execution';
    }
    case 'reconciliation': {
      return 'reconciliation';
    }
    case 'report-run': {
      return 'report';
    }
    case 'settlement-redeem': {
      return 'settlement';
    }
    default: {
      return 'research';
    }
  }
}

function workspacePath(kind: string, id: string) {
  switch (kind) {
    case 'execution-order': {
      return `/execution/orders?module=orders&entity=execution-order&id=${id}`;
    }
    case 'reconciliation': {
      return `/execution/post-trade?module=reconciliation&entity=reconciliation&id=${id}`;
    }
    case 'report-run': {
      return `/trading/recommendations?module=reports&entity=report-run&id=${id}`;
    }
    case 'settlement-redeem': {
      return `/execution/post-trade?module=settlement&entity=settlement-redeem&id=${id}`;
    }
    default: {
      return `/runtime/activity?entity=${kind}&id=${id}`;
    }
  }
}

watch([domain, status], async () => {
  await syncFiltersToRoute();
  await refresh();
});
watch(
  () => [route.query.domain, route.query.status],
  () => {
    const nextDomain = readDomain(route.query.domain);
    const nextStatus = readStatus(route.query.status);
    if (domain.value !== nextDomain) domain.value = nextDomain;
    if (status.value !== nextStatus) status.value = nextStatus;
  },
);
watch(
  () => [route.query.entity, route.query.id],
  () => void openEntity(),
);
watch(items, () => {
  const entity = queryValue(route.query.entity);
  const id = queryValue(route.query.id);
  if (typeof entity !== 'string' || typeof id !== 'string' || id === '') {
    return;
  }
  const found = items.value.find(
    (item) => item.entity.kind === entity && item.entity.id === id,
  );
  if (found) {
    selectedActivity.value = found;
  }
});
watch(
  () => activityStore.refreshGeneration,
  () => void refresh(),
);

onMounted(() => {
  void refresh();
  void openEntity();
});
onScopeDispose(() => {
  requestGeneration += 1;
  controller?.abort();
});
</script>

<template>
  <Page
    auto-content-height
    :data-ui-ready="!loading && page ? 'true' : 'false'"
    data-testid="runtime-activity-page"
  >
    <Flex class="activity-page" gap="middle" vertical>
      <section
        class="activity-hero qp-page-hero"
        aria-labelledby="activity-title"
      >
        <Flex align="start" gap="middle" justify="space-between" wrap="wrap">
          <div>
            <p class="activity-eyebrow">
              {{ $t('page.runtimeActivity.eyebrow') }}
            </p>
            <h1 id="activity-title">{{ $t('page.runtimeActivity.title') }}</h1>
            <p class="activity-description">
              {{ $t('page.runtimeActivity.description') }}
            </p>
          </div>
          <Button :loading="loading" @click="refresh">
            <IconifyIcon icon="lucide:refresh-cw" />
            {{ $t('page.runtimeActivity.refresh') }}
          </Button>
        </Flex>
      </section>

      <Flex gap="small" wrap="wrap">
        <Card class="summary-card" size="small">
          <Statistic
            :title="$t('page.runtimeActivity.totalLabel')"
            :value="page?.summary.total ?? 0"
          />
        </Card>
        <button
          v-for="value in DOMAIN_FILTERS"
          :key="value"
          class="summary-card summary-button"
          :class="{ active: domain === value }"
          type="button"
          @click="domain = domain === value ? undefined : value"
        >
          <span>{{ $t(`page.runtimeActivity.domain.${value}`) }}</span>
          <strong>{{ summaryByDomain[value] ?? 0 }}</strong>
        </button>
      </Flex>

      <Card class="activity-surface">
        <Flex
          class="activity-toolbar"
          gap="small"
          justify="space-between"
          wrap="wrap"
        >
          <Flex gap="small" wrap="wrap">
            <EnumSelect
              v-model:value="domain"
              allow-clear
              :aria-label="$t('page.runtimeActivity.filter.domain')"
              :options="domainOptions"
              :placeholder="$t('page.runtimeActivity.filter.allDomains')"
            />
            <EnumSelect
              v-model:value="status"
              allow-clear
              :aria-label="$t('page.runtimeActivity.filter.status')"
              :options="statusOptions"
              :placeholder="$t('page.runtimeActivity.filter.allStatuses')"
            />
          </Flex>
          <span class="activity-authority">
            <IconifyIcon icon="lucide:shield-check" />
            {{ $t('page.runtimeActivity.permissionScoped') }}
          </span>
        </Flex>

        <Alert
          v-if="loadError"
          class="activity-error"
          :description="loadError"
          :message="$t('page.runtimeActivity.loadError')"
          show-icon
          type="error"
        >
          <template #action>
            <Button size="small" @click="refresh">
              {{ $t('page.shared.asyncState.retry') }}
            </Button>
          </template>
        </Alert>

        <RuntimeActivityFeed
          :height="620"
          :items="items"
          :loading="loading"
          show-actions
          @action="runAction"
          @select="selectActivity"
        />

        <Flex v-if="hasMore" class="load-more" justify="center">
          <Button :loading="loadingMore" @click="load(false)">
            {{ $t('page.runtimeActivity.loadMore') }}
          </Button>
        </Flex>
      </Card>
    </Flex>
    <JobDrawer />
    <ActivityTaskInspector
      v-model:open="taskOpen"
      :item="selectedActivity"
      @action="runAction"
      @close="clearEntityQuery"
    />
  </Page>
</template>

<style scoped>
.activity-page {
  max-width: 1320px;
  padding-bottom: 24px;
  margin-inline: auto;
}

.activity-eyebrow {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 750;
  color: hsl(var(--qp-accent-realtime));
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.activity-hero h1 {
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 720;
  letter-spacing: -0.025em;
}

.activity-description {
  max-width: 760px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.65;
  color: hsl(var(--qp-text-secondary));
}

.summary-card {
  flex: 1;
  min-width: 150px;
  background: hsl(var(--qp-surface-raised));
  border-color: hsl(var(--qp-border-subtle));
}

.summary-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  color: hsl(var(--qp-text-secondary));
  text-align: start;
  cursor: pointer;
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
  transition:
    border-color var(--qp-motion-instant) var(--qp-motion-ease-out),
    background-color var(--qp-motion-instant) var(--qp-motion-ease-out);
}

.summary-button:hover,
.summary-button.active {
  background: hsl(var(--qp-surface-overlay));
  border-color: hsl(var(--qp-border-active));
}

.summary-button strong {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--qp-text-primary));
}

.activity-surface {
  overflow: hidden;
  background: hsl(var(--qp-surface-overlay) / 84%);
  border-color: hsl(var(--qp-border-subtle));
  box-shadow: var(--qp-shadow-low);
  backdrop-filter: blur(18px);
}

.activity-surface :deep(.ant-card-body) {
  padding: 0;
}

.activity-toolbar {
  padding: 14px;
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.activity-toolbar :deep(.ant-select) {
  min-width: 190px;
}

.activity-authority {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 11px;
  color: hsl(var(--qp-text-muted));
}

.activity-error {
  margin: 14px;
}

.load-more {
  padding: 14px;
  border-top: 1px solid hsl(var(--qp-border-subtle));
}
</style>
