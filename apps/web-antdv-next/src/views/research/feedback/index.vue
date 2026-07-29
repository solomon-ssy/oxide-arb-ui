<script lang="ts" setup>
import type {
  FeedbackCycleDetailView,
  FeedbackCycleStatus,
  FeedbackCycleView,
  FeedbackOverviewView,
  IssuePromotionPermitRequest,
  Paginated,
  PromotionPermitView,
} from '@vben/types';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Fallback, Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  message,
  Pagination,
  Select,
  Skeleton,
  Statistic,
  TabPane,
  Tabs,
  Tag,
} from 'antdv-next';

import {
  cancelFeedbackCycle,
  getFeedbackCycle,
  getFeedbackOverview,
  issuePromotionPermit,
  listFeedbackCycles,
  listPromotionPermits,
  revokePromotionPermit,
  triggerFeedbackCycle,
} from '#/api/feedback';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useFeedbackStore } from '#/store';

import {
  canCancelFeedbackCycle,
  isFeedbackReasonValid,
  releaseFeedbackAction,
  tryBeginFeedbackAction,
  validateFeedbackReason,
} from './modules/feedback-action-state';
import FeedbackCycleDetailPanel from './modules/feedback-cycle-detail-panel.vue';
import { validateFeedbackCycleDetail } from './modules/feedback-cycle-detail-state';
import FeedbackPermitPanel from './modules/feedback-permit-panel.vue';
import FeedbackProfileCard from './modules/feedback-profile-card.vue';
import { feedbackWorkbenchState } from './modules/feedback-workbench-state';

defineOptions({ name: 'ResearchFeedbackPage' });

type WorkbenchView = 'cycles' | 'overview';

const PAGE_SIZE = 20;
const emptyCycles: Paginated<FeedbackCycleView> = {
  has_next: false,
  items: [],
  page: 1,
  size: PAGE_SIZE,
  total: 0,
};
const emptyPermits: Paginated<PromotionPermitView> = {
  has_next: false,
  items: [],
  page: 1,
  size: PAGE_SIZE,
  total: 0,
};

const route = useRoute();
const router = useRouter();
const feedbackStore = useFeedbackStore();
const { hasAccessByCodes } = useQpAccess();
const { governed } = useGovernedAction();

const overview = ref<FeedbackOverviewView | null>(null);
const cyclePage = ref<Paginated<FeedbackCycleView>>(emptyCycles);
const permitPage = ref<Paginated<PromotionPermitView>>(emptyPermits);
const currentPage = ref(1);
const loading = ref(true);
const refreshing = ref(false);
const loadError = ref<null | string>(null);
const cycleDetail = ref<FeedbackCycleDetailView | null>(null);
const detailLoading = ref(false);
const detailRefreshing = ref(false);
const detailError = ref<null | string>(null);
const permitLoading = ref(false);
const permitError = ref<null | string>(null);
const permitIdempotencyKey = ref(crypto.randomUUID());
const selectedTriggerProfileId = ref('');
const pendingActions = reactive(new Set<string>());
let loadGeneration = 0;
let loadController: AbortController | null = null;
let detailGeneration = 0;
let detailController: AbortController | null = null;
let permitGeneration = 0;
let permitController: AbortController | null = null;

const canRead = computed(() => hasAccessByCodes(['materialization:read']));
const canTrigger = computed(() => hasAccessByCodes(['materialization:create']));
const canReadPermits = computed(() => hasAccessByCodes(['publication:read']));
const canIssuePermit = computed(() =>
  hasAccessByCodes(['publication:publish']),
);
const canRevokePermit = computed(() =>
  hasAccessByCodes(['publication:retire']),
);
const triggerProfileOptions = computed(
  () =>
    overview.value?.profiles.map((profile) => ({
      label: `${profile.profile_ref.id}@${profile.profile_ref.version}`,
      value: profile.profile_ref.id,
    })) ?? [],
);

const activeView = computed<WorkbenchView>({
  get: () => (route.query.view === 'cycles' ? 'cycles' : 'overview'),
  set: (view) => {
    void router.replace({ query: { ...route.query, view } });
  },
});

const selectedCycleId = computed(() =>
  typeof route.query.cycle_id === 'string' ? route.query.cycle_id : undefined,
);

const selectedCycle = computed(
  () =>
    cyclePage.value.items.find(
      (cycle) => cycle.feedback_cycle_id === selectedCycleId.value,
    ) ?? cyclePage.value.items[0],
);

const selectedCycleDetail = computed(() => {
  const selectedId = selectedCycle.value?.feedback_cycle_id;
  return cycleDetail.value?.cycle.feedback_cycle_id === selectedId
    ? cycleDetail.value
    : null;
});

const workbenchState = computed(() =>
  feedbackWorkbenchState({
    canRead: canRead.value,
    cycleCount: cyclePage.value.total,
    hasOverview: overview.value !== null,
    hasReadiness:
      overview.value?.readiness !== null &&
      overview.value?.readiness !== undefined,
    loadError: loadError.value !== null,
    loading: loading.value,
  }),
);

function statusColor(status: FeedbackCycleStatus) {
  switch (status) {
    case 'cancelled':
    case 'failed': {
      return 'error';
    }
    case 'queued': {
      return 'default';
    }
    case 'running': {
      return 'processing';
    }
    case 'succeeded': {
      return 'success';
    }
  }
}

function selectCycle(cycle: FeedbackCycleView) {
  void router.replace({
    query: {
      ...route.query,
      cycle_id: cycle.feedback_cycle_id,
      view: 'cycles',
    },
  });
}

function applyCycleMutation(cycle: FeedbackCycleView) {
  const existingIndex = cyclePage.value.items.findIndex(
    (item) => item.feedback_cycle_id === cycle.feedback_cycle_id,
  );
  const items = [...cyclePage.value.items];
  if (existingIndex === -1) {
    items.unshift(cycle);
  } else {
    items[existingIndex] = cycle;
  }
  cyclePage.value = {
    ...cyclePage.value,
    items: items.slice(0, PAGE_SIZE),
    total:
      existingIndex === -1 ? cyclePage.value.total + 1 : cyclePage.value.total,
  };
}

function applyPermitMutation(permit: PromotionPermitView) {
  const existingIndex = permitPage.value.items.findIndex(
    (item) => item.promotion_permit_id === permit.promotion_permit_id,
  );
  const items = [...permitPage.value.items];
  if (existingIndex === -1) {
    items.unshift(permit);
  } else {
    items[existingIndex] = permit;
  }
  permitPage.value = {
    ...permitPage.value,
    items: items.slice(0, PAGE_SIZE),
    total:
      existingIndex === -1
        ? permitPage.value.total + 1
        : permitPage.value.total,
  };
}

function validateOverview(snapshot: FeedbackOverviewView) {
  if (
    !Number.isSafeInteger(snapshot.revision) ||
    snapshot.revision < feedbackStore.revision
  ) {
    throw new TypeError('feedback overview revision is invalid or regressed');
  }
}

function resetCycleDetail() {
  detailGeneration += 1;
  detailController?.abort();
  cycleDetail.value = null;
  detailLoading.value = false;
  detailRefreshing.value = false;
  detailError.value = null;
}

async function refreshCycleDetail(cycleId: string) {
  if (!canRead.value) {
    resetCycleDetail();
    return;
  }

  const generation = ++detailGeneration;
  detailController?.abort();
  const controller = new AbortController();
  detailController = controller;
  detailError.value = null;
  if (cycleDetail.value?.cycle.feedback_cycle_id === cycleId) {
    detailRefreshing.value = true;
  } else {
    cycleDetail.value = null;
    detailLoading.value = true;
  }

  try {
    const snapshot = await getFeedbackCycle(cycleId, {
      signal: controller.signal,
    });
    if (generation !== detailGeneration) {
      return;
    }
    validateFeedbackCycleDetail(snapshot, cycleId);
    cycleDetail.value = snapshot;
  } catch {
    if (generation === detailGeneration) {
      detailError.value = $t('page.research.feedback.detail.loadError');
    }
  } finally {
    if (generation === detailGeneration) {
      detailLoading.value = false;
      detailRefreshing.value = false;
    }
  }
}

async function refreshPermits() {
  if (!canRead.value || !canReadPermits.value) {
    permitGeneration += 1;
    permitController?.abort();
    permitPage.value = emptyPermits;
    permitLoading.value = false;
    permitError.value = null;
    return;
  }

  const generation = ++permitGeneration;
  permitController?.abort();
  const controller = new AbortController();
  permitController = controller;
  permitLoading.value = true;
  permitError.value = null;
  try {
    const page = await listPromotionPermits(
      { page: 1, size: PAGE_SIZE },
      { signal: controller.signal },
    );
    if (generation === permitGeneration) {
      permitPage.value = page;
    }
  } catch {
    if (generation === permitGeneration) {
      permitError.value = $t('page.research.feedback.actions.permit.loadError');
    }
  } finally {
    if (generation === permitGeneration) {
      permitLoading.value = false;
    }
  }
}

async function triggerCycle() {
  const profileId = selectedTriggerProfileId.value;
  if (!canTrigger.value || profileId === '') {
    return;
  }
  const actionKey = `trigger:${profileId}`;
  if (!tryBeginFeedbackAction(pendingActions, actionKey)) {
    return;
  }
  try {
    const result = await governed(
      (context) =>
        triggerFeedbackCycle(
          {
            profile_id: profileId,
            reason: validateFeedbackReason(context.reason),
          },
          context,
        ),
      {
        details: [
          {
            label: $t('page.research.feedback.actions.trigger.profile'),
            value: profileId,
          },
        ],
        reasonRule: {
          help: $t('page.research.feedback.actions.reasonRule'),
          maxLength: 128,
          validate: isFeedbackReasonValid,
        },
        summary: $t('page.research.feedback.actions.trigger.summary'),
        title: $t('page.research.feedback.actions.trigger.title'),
      },
    );
    if (result === null) {
      return;
    }
    applyCycleMutation(result.cycle);
    selectCycle(result.cycle);
    message.success(
      $t(
        result.replayed
          ? 'page.research.feedback.actions.trigger.replayed'
          : 'page.research.feedback.actions.trigger.success',
      ),
    );
    await refresh();
  } finally {
    releaseFeedbackAction(pendingActions, actionKey);
  }
}

async function cancelCycle(cycle: FeedbackCycleView) {
  if (!canTrigger.value || !canCancelFeedbackCycle(cycle)) {
    return;
  }
  const actionKey = `cancel:${cycle.feedback_cycle_id}`;
  if (!tryBeginFeedbackAction(pendingActions, actionKey)) {
    return;
  }
  try {
    const result = await governed(
      (context) =>
        cancelFeedbackCycle(
          cycle.feedback_cycle_id,
          { reason: validateFeedbackReason(context.reason) },
          context,
        ),
      {
        danger: true,
        details: [
          {
            label: $t('page.research.feedback.actions.cancel.cycle'),
            mono: true,
            value: cycle.feedback_cycle_id,
          },
        ],
        reasonRule: {
          help: $t('page.research.feedback.actions.reasonRule'),
          maxLength: 128,
          validate: isFeedbackReasonValid,
        },
        summary: $t('page.research.feedback.actions.cancel.summary'),
        title: $t('page.research.feedback.actions.cancel.title'),
      },
    );
    if (result === null) {
      return;
    }
    applyCycleMutation(result.cycle);
    message.success(
      $t(
        result.replayed
          ? 'page.research.feedback.actions.cancel.replayed'
          : 'page.research.feedback.actions.cancel.success',
      ),
    );
    await refresh();
  } finally {
    releaseFeedbackAction(pendingActions, actionKey);
  }
}

async function issuePermit(
  request: Omit<IssuePromotionPermitRequest, 'reason'>,
) {
  if (!canIssuePermit.value) {
    return;
  }
  const actionKey = `issue:${request.feedback_cycle_id}`;
  if (!tryBeginFeedbackAction(pendingActions, actionKey)) {
    return;
  }
  try {
    const result = await governed(
      (context) =>
        issuePromotionPermit({ ...request, reason: context.reason }, context),
      {
        details: [
          {
            label: $t('page.research.feedback.actions.permit.selectedCycle'),
            mono: true,
            value: request.feedback_cycle_id,
          },
          {
            label: $t('page.research.feedback.actions.permit.expiresAt'),
            value: formatDateTimeLocal(request.expires_at),
          },
        ],
        summary: $t('page.research.feedback.actions.permit.issueSummary'),
        title: $t('page.research.feedback.actions.permit.issueTitle'),
      },
    );
    if (result === null) {
      return;
    }
    applyPermitMutation(result.permit);
    permitIdempotencyKey.value = crypto.randomUUID();
    message.success(
      $t(
        result.replayed
          ? 'page.research.feedback.actions.permit.issueReplayed'
          : 'page.research.feedback.actions.permit.issueSuccess',
      ),
    );
    await refreshPermits();
  } finally {
    releaseFeedbackAction(pendingActions, actionKey);
  }
}

async function revokePermit(permit: PromotionPermitView) {
  if (
    !canRevokePermit.value ||
    permit.status !== 'active' ||
    permit.revision !== 0
  ) {
    return;
  }
  const actionKey = `revoke:${permit.promotion_permit_id}`;
  if (!tryBeginFeedbackAction(pendingActions, actionKey)) {
    return;
  }
  try {
    const result = await governed(
      (context) =>
        revokePromotionPermit(
          permit.promotion_permit_id,
          { expected_revision: permit.revision, reason: context.reason },
          context,
        ),
      {
        confirmWord: $t('page.research.feedback.actions.permit.revokeConfirm'),
        danger: true,
        details: [
          {
            label: $t('page.research.feedback.actions.permit.permitId'),
            mono: true,
            value: permit.promotion_permit_id,
          },
        ],
        summary: $t('page.research.feedback.actions.permit.revokeSummary'),
        title: $t('page.research.feedback.actions.permit.revokeTitle'),
      },
    );
    if (result === null) {
      return;
    }
    applyPermitMutation(result.permit);
    message.success(
      $t(
        result.replayed
          ? 'page.research.feedback.actions.permit.revokeReplayed'
          : 'page.research.feedback.actions.permit.revokeSuccess',
      ),
    );
    await refreshPermits();
  } finally {
    releaseFeedbackAction(pendingActions, actionKey);
  }
}

async function refresh() {
  if (!canRead.value) {
    loading.value = false;
    refreshing.value = false;
    return;
  }

  const previousCycleId = selectedCycle.value?.feedback_cycle_id;
  const generation = ++loadGeneration;
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  loadError.value = null;
  if (overview.value === null) {
    loading.value = true;
  } else {
    refreshing.value = true;
  }

  try {
    const [nextOverview, nextCycles] = await Promise.all([
      getFeedbackOverview({ signal: controller.signal }),
      listFeedbackCycles(
        { page: currentPage.value, size: PAGE_SIZE },
        { signal: controller.signal },
      ),
    ]);
    if (generation !== loadGeneration) {
      return;
    }
    validateOverview(nextOverview);
    overview.value = nextOverview;
    if (
      selectedTriggerProfileId.value === '' &&
      nextOverview.profiles.length > 0
    ) {
      selectedTriggerProfileId.value =
        nextOverview.profiles[0]?.profile_ref.id ?? '';
    }
    cyclePage.value = nextCycles;
    const nextCycleId = selectedCycle.value?.feedback_cycle_id;
    if (nextCycleId !== undefined && nextCycleId === previousCycleId) {
      void refreshCycleDetail(nextCycleId);
    }
    void refreshPermits();
  } catch {
    if (generation === loadGeneration) {
      loadError.value = $t('page.research.feedback.loadError');
    }
  } finally {
    if (generation === loadGeneration) {
      loading.value = false;
      refreshing.value = false;
    }
  }
}

watch(currentPage, () => {
  void refresh();
});
watch(
  () => selectedCycle.value?.feedback_cycle_id,
  (cycleId, previousCycleId) => {
    if (cycleId === undefined) {
      resetCycleDetail();
    } else if (cycleId !== previousCycleId) {
      void refreshCycleDetail(cycleId);
    }
  },
  { immediate: true },
);
watch(
  () => feedbackStore.refreshGeneration,
  () => {
    void refresh();
  },
);
watch(canRead, (allowed, wasAllowed) => {
  if (allowed && !wasAllowed) {
    void refresh();
  } else if (!allowed) {
    resetCycleDetail();
  }
});
watch(canReadPermits, () => {
  void refreshPermits();
});

onMounted(() => {
  void refresh();
});
onBeforeUnmount(() => {
  loadGeneration += 1;
  loadController?.abort();
  detailGeneration += 1;
  detailController?.abort();
  permitGeneration += 1;
  permitController?.abort();
});
</script>

<template>
  <Page data-testid="feedback-workbench">
    <div aria-live="polite" class="sr-only" role="status">
      {{ $t(`page.research.feedback.state.${workbenchState}`) }}
    </div>

    <Fallback v-if="workbenchState === 'permission'" status="403" />

    <div v-else class="space-y-4">
      <header
        class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0">
          <h1 class="text-xl font-semibold">
            {{ $t('page.research.feedback.title') }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ $t('page.research.feedback.description') }}
          </p>
        </div>
        <div v-if="canRead" class="flex w-full flex-wrap gap-2 sm:w-auto">
          <label
            v-if="canTrigger"
            class="sr-only"
            for="feedback-trigger-profile"
          >
            {{ $t('page.research.feedback.actions.trigger.profile') }}
          </label>
          <Select
            v-if="canTrigger"
            id="feedback-trigger-profile"
            v-model:value="selectedTriggerProfileId"
            :aria-label="$t('page.research.feedback.actions.trigger.profile')"
            class="min-h-11 min-w-48 flex-1 sm:flex-none"
            :options="triggerProfileOptions"
          />
          <Button
            v-if="canTrigger"
            class="min-h-11 shrink-0"
            :disabled="selectedTriggerProfileId === ''"
            :loading="pendingActions.has(`trigger:${selectedTriggerProfileId}`)"
            type="primary"
            @click="triggerCycle"
          >
            {{ $t('page.research.feedback.actions.trigger.button') }}
          </Button>
          <Button
            class="min-h-11 shrink-0"
            :loading="refreshing"
            @click="refresh"
          >
            {{ $t('page.research.feedback.refresh') }}
          </Button>
        </div>
      </header>

      <Skeleton
        v-if="workbenchState === 'loading'"
        active
        :paragraph="{ rows: 9 }"
      />

      <Alert
        v-else-if="workbenchState === 'error'"
        :description="$t('page.research.feedback.loadErrorDescription')"
        :message="loadError ?? $t('page.research.feedback.loadError')"
        show-icon
        type="error"
      >
        <template #action>
          <Button class="min-h-11" @click="refresh">
            {{ $t('page.research.feedback.retry') }}
          </Button>
        </template>
      </Alert>

      <template v-else>
        <Alert
          v-if="loadError"
          :description="$t('page.research.feedback.staleDescription')"
          :message="loadError"
          show-icon
          type="warning"
        />
        <Alert
          v-if="workbenchState === 'blocked'"
          :description="$t('page.research.feedback.blockedDescription')"
          :message="$t('page.research.feedback.blockedTitle')"
          show-icon
          type="warning"
        />

        <Tabs v-model:active-key="activeView" destroy-on-hidden>
          <TabPane
            key="overview"
            :tab="$t('page.research.feedback.tabs.overview')"
          >
            <div
              v-if="overview"
              class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <Card size="small">
                <Statistic
                  :title="$t('page.research.feedback.queue.queued')"
                  :value="overview.queue.queued"
                />
              </Card>
              <Card size="small">
                <Statistic
                  :title="$t('page.research.feedback.queue.running')"
                  :value="overview.queue.running"
                />
              </Card>
              <Card size="small">
                <Statistic
                  :title="$t('page.research.feedback.queue.pendingOutbox')"
                  :value="overview.queue.pending_outbox"
                />
              </Card>
              <Card size="small">
                <Statistic
                  :title="$t('page.research.feedback.overview.profileCount')"
                  :value="overview.profiles.length"
                />
              </Card>
            </div>

            <Descriptions
              v-if="overview"
              :column="{ lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 }"
              bordered
              class="mt-4"
              size="small"
            >
              <DescriptionsItem
                :label="$t('page.research.feedback.overview.revision')"
              >
                <span class="font-mono tabular-nums">
                  {{ overview.revision }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem
                :label="$t('page.research.feedback.overview.generatedAt')"
              >
                {{ formatDateTimeLocal(overview.generated_at) }}
              </DescriptionsItem>
            </Descriptions>

            <section
              v-if="overview"
              aria-labelledby="feedback-profile-overview-title"
              class="mt-6"
            >
              <div class="mb-3">
                <h2
                  id="feedback-profile-overview-title"
                  class="text-base font-semibold"
                >
                  {{ $t('page.research.feedback.profile.sectionTitle') }}
                </h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ $t('page.research.feedback.profile.sectionDescription') }}
                </p>
              </div>

              <Empty
                v-if="overview.profiles.length === 0"
                :description="$t('page.research.feedback.profile.empty')"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
              <div
                v-else
                class="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3"
              >
                <FeedbackProfileCard
                  v-for="profile in overview.profiles"
                  :key="`${profile.profile_ref.id}:${profile.profile_ref.version}:${profile.profile_ref.content_hash}`"
                  :profile="profile"
                  :readiness="overview.readiness"
                />
              </div>
            </section>
          </TabPane>

          <TabPane key="cycles" :tab="$t('page.research.feedback.tabs.cycles')">
            <Empty
              v-if="cyclePage.items.length === 0"
              :description="$t('page.research.feedback.cycles.empty')"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
            />

            <div
              v-else
              class="grid min-w-0 gap-4 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.4fr)]"
            >
              <nav
                :aria-label="$t('page.research.feedback.cycles.listAria')"
                class="min-w-0 space-y-2"
              >
                <button
                  v-for="cycle in cyclePage.items"
                  :key="cycle.feedback_cycle_id"
                  :aria-current="
                    selectedCycle?.feedback_cycle_id === cycle.feedback_cycle_id
                      ? 'true'
                      : undefined
                  "
                  class="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :class="{
                    'border-primary bg-accent':
                      selectedCycle?.feedback_cycle_id ===
                      cycle.feedback_cycle_id,
                  }"
                  type="button"
                  @click="selectCycle(cycle)"
                >
                  <span class="min-w-0">
                    <span class="block truncate font-mono text-xs">
                      {{ cycle.feedback_cycle_id }}
                    </span>
                    <span class="mt-1 block text-xs text-muted-foreground">
                      {{ cycle.profile_ref.id }} ·
                      {{ formatDateTimeLocal(cycle.created_at) }}
                    </span>
                  </span>
                  <Tag :color="statusColor(cycle.status)">
                    {{ $t(`page.research.feedback.status.${cycle.status}`) }}
                  </Tag>
                </button>
              </nav>

              <div v-if="selectedCycle" class="min-w-0">
                <div
                  v-if="canTrigger && canCancelFeedbackCycle(selectedCycle)"
                  class="mb-3 flex justify-end"
                >
                  <Button
                    class="min-h-11"
                    danger
                    :loading="
                      pendingActions.has(
                        `cancel:${selectedCycle.feedback_cycle_id}`,
                      )
                    "
                    @click="cancelCycle(selectedCycle)"
                  >
                    {{ $t('page.research.feedback.actions.cancel.button') }}
                  </Button>
                </div>

                <Alert
                  v-if="detailError"
                  :description="
                    $t('page.research.feedback.detail.loadErrorDescription')
                  "
                  :message="detailError"
                  show-icon
                  type="warning"
                >
                  <template #action>
                    <Button
                      class="min-h-11"
                      @click="
                        refreshCycleDetail(selectedCycle.feedback_cycle_id)
                      "
                    >
                      {{ $t('page.research.feedback.retry') }}
                    </Button>
                  </template>
                </Alert>

                <Skeleton
                  v-if="detailLoading && selectedCycleDetail === null"
                  active
                  :paragraph="{ rows: 12 }"
                />

                <div
                  v-if="selectedCycleDetail"
                  :aria-busy="detailRefreshing"
                  :class="{ 'mt-4': detailError }"
                >
                  <span
                    v-if="detailRefreshing"
                    aria-live="polite"
                    class="sr-only"
                  >
                    {{ $t('page.research.feedback.detail.refreshing') }}
                  </span>
                  <FeedbackCycleDetailPanel :detail="selectedCycleDetail" />
                </div>

                <Empty
                  v-else-if="!detailLoading && !detailError"
                  :description="$t('page.research.feedback.detail.empty')"
                  :image="Empty.PRESENTED_IMAGE_SIMPLE"
                />
              </div>
            </div>

            <div
              v-if="cyclePage.total > PAGE_SIZE"
              class="mt-4 flex justify-end"
            >
              <Pagination
                v-model:current="currentPage"
                :page-size="PAGE_SIZE"
                :show-size-changer="false"
                :total="cyclePage.total"
              />
            </div>

            <FeedbackPermitPanel
              :can-issue="canIssuePermit"
              :can-read="canReadPermits"
              :can-revoke="canRevokePermit"
              :error="permitError"
              :idempotency-key="permitIdempotencyKey"
              :issue-pending="
                selectedCycle !== undefined &&
                pendingActions.has(`issue:${selectedCycle.feedback_cycle_id}`)
              "
              :loading="permitLoading"
              :page="permitPage"
              :pending-actions="pendingActions"
              :selected-cycle="selectedCycle"
              @issue="issuePermit"
              @retry="refreshPermits"
              @revoke="revokePermit"
            />
          </TabPane>
        </Tabs>
      </template>
    </div>
  </Page>
</template>
