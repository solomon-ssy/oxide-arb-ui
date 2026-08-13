<script lang="ts" setup>
import type {
  FeedbackCandidateReadyView,
  FeedbackCycleDetailView,
  FeedbackCycleStatus,
  FeedbackCycleView,
  FeedbackOverviewView,
  FeedbackSchedulerListView,
  FeedbackSchedulerStateView,
  IssuePromotionPermitRequest,
  ModelRouteActivationReceiptView,
  Paginated,
  PromotionPermitView,
  ResolutionProjectionAttentionItem,
  ResolutionRemediationAction,
} from '@vben/types';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import { Fallback, Page } from '@vben/common-ui';
import { normalizeApiError } from '@vben/request/qp';

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
  activateModelRoute,
  cancelFeedbackCycle,
  getFeedbackCycle,
  getFeedbackOverview,
  getModelRouteActivation,
  issuePromotionPermit,
  listFeedbackCycles,
  listFeedbackSchedulers,
  listPromotionPermits,
  pauseFeedbackScheduler,
  rejectShadowBinding,
  remediateResolutionProjection,
  resumeFeedbackScheduler,
  revokePromotionPermit,
  triggerFeedbackCycle,
} from '#/api/feedback';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { AuthoritativeReadCoordinator } from '#/shared/composables/authoritative-read-coordinator';
import {
  FEEDBACK_RECOVERED_VISIBLE_MS,
  feedbackLivenessState,
  feedbackTransportHealth,
} from '#/shared/composables/feedback-liveness';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useFeedbackStore, useWsStore } from '#/store';

import {
  canCancelFeedbackCycle,
  isFeedbackReasonValid,
  promotionRouteGenerationDiff,
  releaseFeedbackAction,
  tryBeginFeedbackAction,
  validateFeedbackReason,
} from './modules/feedback-action-state';
import FeedbackCycleDetailPanel from './modules/feedback-cycle-detail-panel.vue';
import { validateFeedbackCycleDetail } from './modules/feedback-cycle-detail-state';
import { validateFeedbackOverview } from './modules/feedback-overview-state';
import FeedbackPermitPanel from './modules/feedback-permit-panel.vue';
import FeedbackProfileCard from './modules/feedback-profile-card.vue';
import FeedbackSchedulerPanel from './modules/feedback-scheduler-panel.vue';
import FeedbackTruthOperationsPanel from './modules/feedback-truth-operations-panel.vue';
import { feedbackWorkbenchState } from './modules/feedback-workbench-state';

defineOptions({ name: 'ResearchFeedbackPage' });

type WorkbenchView = 'cycles' | 'overview';

interface FeedbackWorkbenchSnapshot {
  cycles: Paginated<FeedbackCycleView>;
  overview: FeedbackOverviewView;
  previousCycleId?: string;
}

const PAGE_SIZE = 20;
const RECOVERY_POLL_MS = 15_000;
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
const wsStore = useWsStore();
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
const detailNotFound = ref(false);
const permitLoading = ref(false);
const permitError = ref<null | string>(null);
const schedulerSnapshot = ref<FeedbackSchedulerListView | null>(null);
const schedulerLoading = ref(false);
const schedulerError = ref<null | string>(null);
const activationReceipt = ref<ModelRouteActivationReceiptView | null>(null);
const activationReceiptError = ref<null | string>(null);
const activationReceiptLoading = ref(false);
const permitIdempotencyKey = ref(crypto.randomUUID());
const selectedTriggerProfileId = ref('');
const pendingActions = reactive(new Set<string>());
let detailGeneration = 0;
let detailController: AbortController | null = null;
let detailRequest: null | Promise<void> = null;
let detailRequestCycleId: string | undefined;
let detailRefreshQueued = false;
let activationReceiptGeneration = 0;
let activationReceiptController: AbortController | null = null;
let activationReceiptRequest: null | Promise<void> = null;
let leaving = false;
let revealedActivationId: string | undefined;
let triggerSelectionCycleId: string | undefined;
let livenessTickTimer: ReturnType<typeof setInterval> | undefined;
let recoveryPollTimer: ReturnType<typeof setInterval> | undefined;
const livenessNowMs = ref(Date.now());
const pageVisible = ref(document.visibilityState === 'visible');
const recoveredUntilMs = ref<null | number>(null);
const activationIdempotencyKeys = new Map<string, string>();
const rejectionIdempotencyKeys = new Map<string, string>();
const triggerIdempotencyKeys = new Map<string, string>();
const resolutionRemediationKeys = new Map<string, string>();

watch(
  [
    () => wsStore.status,
    () => wsStore.connectingAt,
    () => wsStore.connectedAt,
    () => wsStore.lastHeartbeatAt,
  ],
  () => {
    livenessNowMs.value = Date.now();
  },
  { flush: 'sync' },
);

const canRead = computed(() => hasAccessByCodes(['materialization:read']));
const canTrigger = computed(() => hasAccessByCodes(['materialization:create']));
const canReadPermits = computed(() => hasAccessByCodes(['publication:read']));
const canIssuePermit = computed(() =>
  hasAccessByCodes(['publication:authorize']),
);
const canRevokePermit = computed(() =>
  hasAccessByCodes(['publication:retire']),
);
const canActivateRoute = computed(() =>
  hasAccessByCodes(['publication:activate']),
);
const canRejectRoute = computed(() => hasAccessByCodes(['publication:reject']));
const canControlScheduler = computed(() =>
  hasAccessByCodes(['materialization:update']),
);
const canRemediateResolution = computed(() =>
  hasAccessByCodes(['reconciliation:resolve']),
);
const triggerProfileOptions = computed(
  () =>
    overview.value?.profiles.map((profile) => ({
      label: `${profile.profile_ref.id}@${profile.profile_ref.version}`,
      value: profile.profile_ref.id,
    })) ?? [],
);
const triggerPending = computed(
  () =>
    selectedTriggerProfileId.value !== '' &&
    pendingActions.has(`trigger:${selectedTriggerProfileId.value}`),
);

const activeView = computed<WorkbenchView>({
  get: () =>
    routeCycleId.value !== undefined || route.query.view === 'cycles'
      ? 'cycles'
      : 'overview',
  set: (view) => {
    if (view === 'overview') {
      const {
        activation_id: _activationId,
        cycle_id: _cycleId,
        ...query
      } = route.query;
      void router.replace({ query: { ...query, view } });
      return;
    }
    void router.replace({ query: { ...route.query, view } });
  },
});

const routeCycleId = computed(() =>
  typeof route.query.cycle_id === 'string' && route.query.cycle_id !== ''
    ? route.query.cycle_id
    : undefined,
);
const routeActivationId = computed(() =>
  typeof route.query.activation_id === 'string' &&
  route.query.activation_id !== ''
    ? route.query.activation_id
    : undefined,
);

const effectiveCycleId = computed(
  () => routeCycleId.value ?? cyclePage.value.items[0]?.feedback_cycle_id,
);

const selectedCycle = computed(() => {
  const cycleId = effectiveCycleId.value;
  if (cycleId === undefined) {
    return undefined;
  }
  return (
    cyclePage.value.items.find(
      (cycle) => cycle.feedback_cycle_id === cycleId,
    ) ??
    (cycleDetail.value?.cycle.feedback_cycle_id === cycleId
      ? cycleDetail.value.cycle
      : undefined)
  );
});

const feedbackHealth = computed(() =>
  feedbackTransportHealth({
    connectedAt: wsStore.connectedAt,
    connectingAt: wsStore.connectingAt,
    lastHeartbeatAt: wsStore.lastHeartbeatAt,
    nowMs: livenessNowMs.value,
    recoveryRequired: feedbackStore.recoveryRequired,
    status: wsStore.status,
  }),
);
const feedbackLivenessDegraded = computed(
  () => feedbackHealth.value === 'degraded',
);
const feedbackLiveness = computed(() =>
  feedbackLivenessState({
    health: feedbackHealth.value,
    nowMs: livenessNowMs.value,
    recoveredUntilMs: recoveredUntilMs.value,
    visible: pageVisible.value,
  }),
);
const feedbackLivenessColor = computed(() => {
  switch (feedbackLiveness.value) {
    case 'connected': {
      return 'success';
    }
    case 'connecting': {
      return 'processing';
    }
    case 'polling': {
      return 'processing';
    }
    case 'recovered': {
      return 'cyan';
    }
    case 'stale': {
      return 'warning';
    }
    default: {
      return 'default';
    }
  }
});

const selectedCycleDetail = computed(() => {
  const selectedId = effectiveCycleId.value;
  return cycleDetail.value?.cycle.feedback_cycle_id === selectedId
    ? cycleDetail.value
    : null;
});
const selectedShadowBindingActive = computed(
  () =>
    selectedCycleDetail.value?.candidate_ready?.route_diff
      .shadow_binding_status === 'active',
);

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
    case 'failed':
    case 'quarantined': {
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

const permitReadCoordinator = new AuthoritativeReadCoordinator<
  number,
  Paginated<PromotionPermitView>
>({
  async fetchSnapshot(_key, signal) {
    return listPromotionPermits({ page: 1, size: PAGE_SIZE }, { signal });
  },
  initialKey: 0,
  onError() {
    permitError.value = $t('page.research.feedback.actions.permit.loadError');
  },
  onPendingChange(pending) {
    permitLoading.value = pending;
  },
  onSnapshot(snapshot) {
    permitError.value = null;
    permitPage.value = snapshot;
  },
});

const schedulerReadCoordinator = new AuthoritativeReadCoordinator<
  number,
  FeedbackSchedulerListView
>({
  async fetchSnapshot(_key, signal) {
    return listFeedbackSchedulers({ signal });
  },
  initialKey: 0,
  onError() {
    schedulerError.value = $t('page.research.feedback.scheduler.loadError');
  },
  onPendingChange(pending) {
    schedulerLoading.value = pending;
  },
  onSnapshot(snapshot) {
    schedulerError.value = null;
    schedulerSnapshot.value = snapshot;
  },
});

function resetCycleDetail() {
  detailGeneration += 1;
  detailController?.abort();
  detailRefreshQueued = false;
  cycleDetail.value = null;
  detailLoading.value = false;
  detailRefreshing.value = false;
  detailError.value = null;
  detailNotFound.value = false;
}

async function loadCycleDetail(cycleId: string) {
  if (!canRead.value) {
    resetCycleDetail();
    return;
  }

  const generation = ++detailGeneration;
  detailController?.abort();
  const controller = new AbortController();
  detailController = controller;
  detailError.value = null;
  detailNotFound.value = false;
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
    if (triggerSelectionCycleId !== cycleId) {
      selectedTriggerProfileId.value = snapshot.cycle.profile_ref.id;
      triggerSelectionCycleId = cycleId;
    }
    if (
      snapshot.activation_receipt !== null &&
      (routeActivationId.value === undefined ||
        routeActivationId.value ===
          snapshot.activation_receipt.policy_activation_id)
    ) {
      activationReceipt.value = snapshot.activation_receipt;
      activationReceiptError.value = null;
    }
  } catch (error) {
    if (generation === detailGeneration) {
      const apiError = normalizeApiError(error);
      detailNotFound.value =
        apiError.httpStatus === 404 || apiError.code === 404;
      detailError.value = $t(
        detailNotFound.value
          ? 'page.research.feedback.detail.notFound'
          : 'page.research.feedback.detail.loadError',
      );
    }
  } finally {
    if (generation === detailGeneration) {
      detailLoading.value = false;
      detailRefreshing.value = false;
    }
  }
}

function refreshCycleDetail(cycleId: string): Promise<void> {
  if (leaving) {
    return Promise.resolve();
  }
  if (detailRequest !== null && detailRequestCycleId === cycleId) {
    detailRefreshQueued = true;
    return detailRequest;
  }
  const request = loadCycleDetail(cycleId);
  detailRequest = request;
  detailRequestCycleId = cycleId;
  void request.finally(() => {
    if (detailRequest === request) {
      detailRequest = null;
      detailRequestCycleId = undefined;
      const refreshQueued = detailRefreshQueued;
      detailRefreshQueued = false;
      if (refreshQueued && !leaving) {
        void refreshCycleDetail(cycleId);
      }
    }
  });
  return request;
}

function resetActivationReceipt() {
  activationReceiptGeneration += 1;
  activationReceiptController?.abort();
  activationReceiptController = null;
  activationReceipt.value = null;
  activationReceiptError.value = null;
  activationReceiptLoading.value = false;
}

async function loadActivationReceipt(activationId: string) {
  if (!canRead.value || !canReadPermits.value) {
    resetActivationReceipt();
    return;
  }

  const generation = ++activationReceiptGeneration;
  activationReceiptController?.abort();
  const controller = new AbortController();
  activationReceiptController = controller;
  activationReceiptLoading.value = true;
  activationReceiptError.value = null;
  try {
    const receipt = await getModelRouteActivation(activationId, {
      signal: controller.signal,
    });
    if (generation !== activationReceiptGeneration) {
      return;
    }
    if (receipt.policy_activation_id !== activationId) {
      throw new Error('activation receipt identity mismatch');
    }
    activationReceipt.value = receipt;
    if (
      !leaving &&
      (routeCycleId.value !== receipt.feedback_cycle_id ||
        route.query.view !== 'cycles')
    ) {
      await router.replace({
        query: {
          ...route.query,
          activation_id: activationId,
          cycle_id: receipt.feedback_cycle_id,
          view: 'cycles',
        },
      });
    }
  } catch (error) {
    if (generation === activationReceiptGeneration) {
      const apiError = normalizeApiError(error);
      activationReceipt.value = null;
      activationReceiptError.value = $t(
        apiError.httpStatus === 404 || apiError.code === 404
          ? 'page.research.feedback.actions.permit.receipt.notFound'
          : 'page.research.feedback.actions.permit.receipt.loadError',
        { activationId },
      );
    }
  } finally {
    if (generation === activationReceiptGeneration) {
      activationReceiptLoading.value = false;
    }
  }
}

function refreshActivationReceipt(activationId: string): Promise<void> {
  if (leaving) {
    return Promise.resolve();
  }
  const request = loadActivationReceipt(activationId);
  activationReceiptRequest = request;
  void request.finally(() => {
    if (activationReceiptRequest === request) {
      activationReceiptRequest = null;
    }
  });
  return request;
}

async function refreshSchedulers() {
  if (!canRead.value) {
    schedulerReadCoordinator.cancel();
    schedulerSnapshot.value = null;
    schedulerLoading.value = false;
    schedulerError.value = null;
    return;
  }
  await schedulerReadCoordinator.refresh();
}

async function refreshPermits() {
  if (!canRead.value || !canReadPermits.value) {
    permitReadCoordinator.cancel();
    permitPage.value = emptyPermits;
    permitLoading.value = false;
    permitError.value = null;
    return;
  }
  await permitReadCoordinator.refresh();
}

async function refreshPermitEvidence() {
  const activationId = routeActivationId.value;
  await Promise.all([
    refreshPermits(),
    activationId === undefined
      ? Promise.resolve()
      : refreshActivationReceipt(activationId),
  ]);
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
    const idempotencyKey =
      triggerIdempotencyKeys.get(profileId) ?? crypto.randomUUID();
    triggerIdempotencyKeys.set(profileId, idempotencyKey);
    const result = await governed(
      (context) =>
        triggerFeedbackCycle(
          {
            evaluation_mode: 'conditional',
            idempotency_key: idempotencyKey,
            parent_cycle_id: null,
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
    triggerIdempotencyKeys.delete(profileId);
    selectCycle(result.cycle);
    let messageKey = 'page.research.feedback.actions.trigger.success';
    if (result.trigger_replayed) {
      messageKey = 'page.research.feedback.actions.trigger.replayed';
    } else if (result.cycle_reused) {
      messageKey = 'page.research.feedback.actions.trigger.converged';
    }
    message.success($t(messageKey));
    await refresh();
  } finally {
    releaseFeedbackAction(pendingActions, actionKey);
  }
}

async function rejectCandidate(candidate: FeedbackCandidateReadyView) {
  const route = candidate.route_diff;
  if (!canRejectRoute.value || route.shadow_binding_status !== 'active') {
    return;
  }
  const actionKey = `reject-shadow:${route.shadow_binding_id}`;
  if (!tryBeginFeedbackAction(pendingActions, actionKey)) {
    return;
  }
  const idempotencyKey =
    rejectionIdempotencyKeys.get(route.shadow_binding_id) ??
    crypto.randomUUID();
  rejectionIdempotencyKeys.set(route.shadow_binding_id, idempotencyKey);
  try {
    const result = await governed(
      (context) =>
        rejectShadowBinding(
          route.shadow_binding_id,
          {
            expected_binding_generation: route.shadow_binding_generation,
            expected_policy_generation: route.current_policy_generation,
            idempotency_key: idempotencyKey,
            note: context.reason,
            reason_code: 'operator_rejected',
          },
          context,
        ),
      {
        confirmWord: $t(
          'page.research.feedback.actions.shadowReject.confirmWord',
        ),
        danger: true,
        details: [
          {
            label: $t('page.research.feedback.actions.shadowReject.bindingId'),
            mono: true,
            value: route.shadow_binding_id,
          },
          {
            label: $t('page.research.feedback.actions.shadowReject.route'),
            value: route.route,
          },
          {
            label: $t('page.research.feedback.actions.shadowReject.candidate'),
            mono: true,
            value: route.candidate_model_version_id,
          },
        ],
        summary: $t('page.research.feedback.actions.shadowReject.summary'),
        title: $t('page.research.feedback.actions.shadowReject.title'),
      },
    );
    if (result === null) {
      return;
    }
    rejectionIdempotencyKeys.delete(route.shadow_binding_id);
    message.success(
      $t(
        result.replayed
          ? 'page.research.feedback.actions.shadowReject.replayed'
          : 'page.research.feedback.actions.shadowReject.success',
      ),
    );
    await refresh();
  } finally {
    releaseFeedbackAction(pendingActions, actionKey);
  }
}

async function remediateResolution(
  item: ResolutionProjectionAttentionItem,
  action: ResolutionRemediationAction,
) {
  if (
    !canRemediateResolution.value ||
    !['mapping_blocked', 'quarantined'].includes(item.projection.status)
  ) {
    return;
  }
  const observationId = item.observation.resolution_observation_id;
  const actionKey = `resolution-remediation:${observationId}:${action}`;
  if (!tryBeginFeedbackAction(pendingActions, actionKey)) {
    return;
  }
  const key = `${observationId}:${action}`;
  const idempotencyKey =
    resolutionRemediationKeys.get(key) ?? crypto.randomUUID();
  resolutionRemediationKeys.set(key, idempotencyKey);
  try {
    const result = await governed(
      (context) =>
        remediateResolutionProjection(
          observationId,
          {
            action,
            expected_revision: item.projection.revision,
            idempotency_key: idempotencyKey,
            operator_note: context.reason,
            reason_code:
              action === 'exclude' ? 'operator_excluded' : 'operator_requeued',
          },
          context,
        ),
      {
        confirmWord:
          action === 'exclude'
            ? $t('page.research.feedback.truthOps.actions.excludeConfirmWord')
            : undefined,
        danger: action === 'exclude',
        details: [
          {
            label: $t('page.research.feedback.truthOps.actions.observationId'),
            mono: true,
            value: observationId,
          },
          {
            label: $t('page.research.feedback.truthOps.actions.source'),
            mono: true,
            value: item.observation.raw_payload_hash,
          },
          {
            label: $t('page.research.feedback.truthOps.actions.currentState'),
            value: `${item.projection.status}@${item.projection.revision}`,
          },
        ],
        summary: $t(`page.research.feedback.truthOps.actions.${action}Summary`),
        title: $t(`page.research.feedback.truthOps.actions.${action}Title`),
      },
    );
    if (result === null) {
      return;
    }
    resolutionRemediationKeys.delete(key);
    message.success(
      $t(
        result.replayed
          ? 'page.research.feedback.truthOps.actions.replayed'
          : `page.research.feedback.truthOps.actions.${action}Success`,
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

async function issuePermit(request: Omit<IssuePromotionPermitRequest, 'note'>) {
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
        issuePromotionPermit({ ...request, note: context.reason }, context),
      {
        details: [
          {
            label: $t('page.research.feedback.actions.permit.selectedCycle'),
            mono: true,
            value: request.feedback_cycle_id,
          },
          {
            label: $t('page.research.feedback.actions.permit.ttl'),
            value: $t('page.research.feedback.actions.permit.ttlMinutes', {
              minutes: request.ttl_secs / 60,
            }),
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
          {
            expected_revision: permit.revision,
            note: context.reason,
            reason_code: 'operator_revoked',
          },
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

async function activatePermit(permit: PromotionPermitView) {
  if (!canActivateRoute.value || permit.status !== 'active') {
    return;
  }
  const actionKey = `activate:${permit.promotion_permit_id}`;
  if (!tryBeginFeedbackAction(pendingActions, actionKey)) {
    return;
  }
  const idempotencyKey =
    activationIdempotencyKeys.get(permit.promotion_permit_id) ??
    crypto.randomUUID();
  activationIdempotencyKeys.set(permit.promotion_permit_id, idempotencyKey);
  try {
    const result = await governed(
      (context) =>
        activateModelRoute(
          {
            expected_policy_generation: permit.expected_policy_generation,
            expected_runtime_control_revision:
              permit.expected_runtime_control_revision,
            feedback_cycle_id: permit.feedback_cycle_id,
            idempotency_key: idempotencyKey,
            note: context.reason,
            promotion_permit_id: permit.promotion_permit_id,
            reason_code: 'operator_activated',
          },
          context,
        ),
      {
        confirmWord: $t(
          'page.research.feedback.actions.permit.activateConfirm',
        ),
        danger: true,
        details: [
          {
            label: $t('page.research.feedback.actions.permit.permitId'),
            mono: true,
            value: permit.promotion_permit_id,
          },
          {
            label: $t('page.research.feedback.actions.permit.routeDiff'),
            value: promotionRouteGenerationDiff(permit),
          },
          {
            label: $t('page.research.feedback.actions.permit.targetModel'),
            mono: true,
            value: `${permit.champion_model_version_id} → ${permit.candidate_model_version_id}`,
          },
          {
            label: $t(
              'page.research.feedback.actions.permit.authorityInvariant',
            ),
            value: $t(
              'page.research.feedback.actions.permit.executionUnchanged',
            ),
          },
        ],
        summary: $t('page.research.feedback.actions.permit.activateSummary'),
        title: $t('page.research.feedback.actions.permit.activateTitle'),
      },
    );
    if (result === null) {
      return;
    }
    activationReceipt.value = result.receipt;
    activationReceiptError.value = null;
    activationIdempotencyKeys.delete(permit.promotion_permit_id);
    await router.replace({
      query: {
        ...route.query,
        activation_id: result.receipt.policy_activation_id,
        cycle_id: result.receipt.feedback_cycle_id,
        view: 'cycles',
      },
    });
    message.success(
      $t(
        result.replayed
          ? 'page.research.feedback.actions.permit.activateReplayed'
          : 'page.research.feedback.actions.permit.activateSuccess',
      ),
    );
    await refresh();
  } finally {
    releaseFeedbackAction(pendingActions, actionKey);
  }
}

async function controlScheduler(
  state: FeedbackSchedulerStateView,
  paused: boolean,
) {
  if (!canControlScheduler.value || state.paused === paused) {
    return;
  }
  const verb = paused ? 'pause' : 'resume';
  const actionKey = `scheduler:${state.research_profile_id}:${verb}`;
  if (!tryBeginFeedbackAction(pendingActions, actionKey)) {
    return;
  }
  try {
    const result = await governed(
      (context) => {
        const request = {
          expected_pause_revision: state.pause_revision,
          note: context.reason,
          reason_code: `operator_${verb}`,
        };
        return paused
          ? pauseFeedbackScheduler(state.research_profile_id, request, context)
          : resumeFeedbackScheduler(
              state.research_profile_id,
              request,
              context,
            );
      },
      {
        danger: paused,
        details: [
          {
            label: $t('page.research.feedback.scheduler.profile'),
            mono: true,
            value: state.research_profile_id,
          },
          {
            label: $t('page.research.feedback.scheduler.pauseRevision'),
            value: state.pause_revision.toString(),
          },
        ],
        summary: $t(
          paused
            ? 'page.research.feedback.scheduler.pauseSummary'
            : 'page.research.feedback.scheduler.resumeSummary',
        ),
        title: $t(
          paused
            ? 'page.research.feedback.scheduler.pauseTitle'
            : 'page.research.feedback.scheduler.resumeTitle',
        ),
      },
    );
    if (result === null) {
      return;
    }
    const current = schedulerSnapshot.value;
    if (current !== null) {
      const existing = current.items.findIndex(
        (item) => item.research_profile_id === result.state.research_profile_id,
      );
      const items = [...current.items];
      if (existing === -1) {
        items.push(result.state);
      } else {
        items[existing] = result.state;
      }
      schedulerSnapshot.value = {
        items,
        observed_at: result.observed_at,
      };
    }
    message.success(
      $t(
        paused
          ? 'page.research.feedback.scheduler.pauseSuccess'
          : 'page.research.feedback.scheduler.resumeSuccess',
      ),
    );
    await refreshSchedulers();
  } finally {
    releaseFeedbackAction(pendingActions, actionKey);
  }
}

const refreshCoordinator = new AuthoritativeReadCoordinator<
  number,
  FeedbackWorkbenchSnapshot
>({
  async fetchSnapshot(page, signal) {
    const previousCycleId = effectiveCycleId.value;
    const [nextOverview, nextCycles] = await Promise.all([
      getFeedbackOverview({ signal }),
      listFeedbackCycles({ page, size: PAGE_SIZE }, { signal }),
    ]);
    return {
      cycles: nextCycles,
      overview: nextOverview,
      previousCycleId,
    };
  },
  initialKey: currentPage.value,
  onError() {
    loadError.value = $t('page.research.feedback.loadError');
  },
  onPendingChange(pending) {
    loading.value = pending && overview.value === null;
    refreshing.value = pending && overview.value !== null;
  },
  onSnapshot(snapshot) {
    validateFeedbackOverview(snapshot.overview, feedbackStore.revision);
    loadError.value = null;
    overview.value = snapshot.overview;
    if (
      selectedTriggerProfileId.value === '' &&
      snapshot.overview.profiles.length > 0
    ) {
      selectedTriggerProfileId.value =
        snapshot.overview.profiles[0]?.profile_ref.id ?? '';
    }
    cyclePage.value = snapshot.cycles;
    const nextCycleId = effectiveCycleId.value;
    if (nextCycleId !== undefined && nextCycleId === snapshot.previousCycleId) {
      void refreshCycleDetail(nextCycleId);
    }
  },
});

async function refresh(): Promise<void> {
  if (leaving || !canRead.value) {
    loading.value = false;
    refreshing.value = false;
    return;
  }
  refreshCoordinator.setKey(currentPage.value);
  await Promise.all([
    refreshCoordinator.refresh(),
    refreshPermits(),
    refreshSchedulers(),
  ]);
}

function stopRecoveryPolling() {
  if (recoveryPollTimer !== undefined) {
    clearInterval(recoveryPollTimer);
    recoveryPollTimer = undefined;
  }
}

function syncRecoveryPolling() {
  if (
    leaving ||
    !canRead.value ||
    !pageVisible.value ||
    !feedbackLivenessDegraded.value
  ) {
    stopRecoveryPolling();
    return;
  }
  recoveryPollTimer ??= setInterval(() => {
    void refresh();
  }, RECOVERY_POLL_MS);
}

function refreshOnVisibility() {
  pageVisible.value = document.visibilityState === 'visible';
  syncRecoveryPolling();
  if (pageVisible.value && canRead.value) {
    void refresh();
  }
}

watch(currentPage, (page) => {
  if (canRead.value) {
    refreshCoordinator.changeKey(page);
  }
});
watch(
  routeCycleId,
  (cycleId) => {
    if (cycleId !== undefined && route.query.view !== 'cycles') {
      void router.replace({
        query: { ...route.query, view: 'cycles' },
      });
    }
  },
  { immediate: true },
);
watch(
  routeActivationId,
  (activationId) => {
    if (activationId === undefined) {
      resetActivationReceipt();
    } else {
      void refreshActivationReceipt(activationId);
    }
  },
  { immediate: true },
);
watch(
  [
    routeActivationId,
    () => activationReceipt.value?.policy_activation_id,
    () => selectedCycle.value?.feedback_cycle_id,
    loading,
    detailLoading,
    activationReceiptLoading,
  ],
  async ([
    activationId,
    receiptId,
    cycleId,
    pageIsLoading,
    detailIsLoading,
    receiptIsLoading,
  ]) => {
    if (activationId === undefined) {
      revealedActivationId = undefined;
      return;
    }
    if (
      activationId !== receiptId ||
      cycleId !== activationReceipt.value?.feedback_cycle_id ||
      pageIsLoading ||
      detailIsLoading ||
      receiptIsLoading ||
      revealedActivationId === activationId
    ) {
      return;
    }
    await nextTick();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    const receipt = document.querySelector<HTMLElement>(
      '#feedback-activation-receipt',
    );
    const receiptTitle = document.querySelector<HTMLElement>(
      '#feedback-activation-receipt-title',
    );
    if (receipt === null || receiptTitle === null) {
      return;
    }
    receipt.scrollIntoView({ behavior: 'instant', block: 'center' });
    receiptTitle.focus({ preventScroll: true });
    revealedActivationId = activationId;
  },
  { flush: 'post' },
);
watch(
  effectiveCycleId,
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
    if (!leaving && canRead.value) {
      refreshCoordinator.invalidate();
      schedulerReadCoordinator.invalidate();
      if (canReadPermits.value) {
        permitReadCoordinator.invalidate();
      }
    }
  },
);
watch(
  feedbackLivenessDegraded,
  (degraded, wasDegraded) => {
    if (!degraded && wasDegraded) {
      recoveredUntilMs.value =
        livenessNowMs.value + FEEDBACK_RECOVERED_VISIBLE_MS;
      if (canRead.value) {
        void refresh();
      }
    } else if (degraded) {
      recoveredUntilMs.value = null;
      if (wasDegraded === false && canRead.value && pageVisible.value) {
        void refresh();
      }
    }
    syncRecoveryPolling();
  },
  { immediate: true },
);
watch(canRead, (allowed, wasAllowed) => {
  if (allowed && !wasAllowed) {
    void refresh();
  } else if (!allowed) {
    refreshCoordinator.cancel();
    permitReadCoordinator.cancel();
    schedulerReadCoordinator.cancel();
    loading.value = false;
    refreshing.value = false;
    permitPage.value = emptyPermits;
    permitLoading.value = false;
    permitError.value = null;
    schedulerSnapshot.value = null;
    schedulerLoading.value = false;
    schedulerError.value = null;
    resetActivationReceipt();
    resetCycleDetail();
  }
  syncRecoveryPolling();
});
watch(canReadPermits, () => {
  void refreshPermitEvidence();
});

onMounted(() => {
  document.addEventListener('visibilitychange', refreshOnVisibility);
  livenessNowMs.value = Date.now();
  pageVisible.value = document.visibilityState === 'visible';
  livenessTickTimer = setInterval(() => {
    livenessNowMs.value = Date.now();
  }, 1000);
  void refresh();
});
onBeforeRouteLeave(async () => {
  leaving = true;
  stopRecoveryPolling();
  await Promise.all([
    detailRequest ?? Promise.resolve(),
    activationReceiptRequest ?? Promise.resolve(),
    refreshCoordinator.drain(),
    permitReadCoordinator.drain(),
    schedulerReadCoordinator.drain(),
  ]);
});
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', refreshOnVisibility);
  if (livenessTickTimer !== undefined) {
    clearInterval(livenessTickTimer);
    livenessTickTimer = undefined;
  }
  stopRecoveryPolling();
  refreshCoordinator.dispose();
  permitReadCoordinator.dispose();
  schedulerReadCoordinator.dispose();
  detailGeneration += 1;
  detailController?.abort();
  activationReceiptGeneration += 1;
  activationReceiptController?.abort();
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
          <Tag
            :aria-label="
              $t(`page.research.feedback.recovery.liveness.${feedbackLiveness}`)
            "
            :color="feedbackLivenessColor"
            class="flex min-h-11 items-center"
            :data-recovery-reason="feedbackStore.recoveryReason ?? undefined"
            data-testid="feedback-liveness"
            :data-transport-health="feedbackHealth"
            :data-transport-status="wsStore.status"
          >
            {{
              $t(`page.research.feedback.recovery.liveness.${feedbackLiveness}`)
            }}
          </Tag>
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
            data-testid="feedback-trigger-profile"
            :options="triggerProfileOptions"
          />
          <Button
            v-if="canTrigger"
            class="min-h-11 shrink-0"
            :disabled="selectedTriggerProfileId === '' || triggerPending"
            :loading="triggerPending"
            type="primary"
            @click="triggerCycle"
          >
            {{ $t('page.research.feedback.actions.trigger.button') }}
          </Button>
          <Button
            class="min-h-11 shrink-0"
            data-testid="feedback-refresh"
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
          v-if="feedbackLivenessDegraded"
          :description="
            feedbackStore.recoveryRequired
              ? $t(
                  feedbackLiveness === 'polling'
                    ? 'page.research.feedback.recovery.requiredDescription'
                    : 'page.research.feedback.recovery.requiredStaleDescription',
                  {
                    reason:
                      feedbackStore.recoveryReason ??
                      $t('page.research.feedback.detail.notObserved'),
                  },
                )
              : $t(
                  feedbackLiveness === 'polling'
                    ? 'page.research.feedback.recovery.degradedDescription'
                    : 'page.research.feedback.recovery.staleDescription',
                )
          "
          :message="
            $t(
              feedbackStore.recoveryRequired
                ? 'page.research.feedback.recovery.requiredTitle'
                : feedbackLiveness === 'polling'
                  ? 'page.research.feedback.recovery.degradedTitle'
                  : 'page.research.feedback.recovery.staleTitle',
            )
          "
          show-icon
          type="warning"
        >
          <template #action>
            <Button class="min-h-11" @click="refresh">
              {{ $t('page.research.feedback.retry') }}
            </Button>
          </template>
        </Alert>
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

        <Tabs
          id="feedback-workbench-tabs"
          v-model:active-key="activeView"
          class="[&_.ant-tabs-tab-btn]:flex [&_.ant-tabs-tab-btn]:min-h-11 [&_.ant-tabs-tab-btn]:items-center"
        >
          <TabPane
            key="overview"
            :tab="$t('page.research.feedback.tabs.overview')"
            :force-render="true"
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
                <span
                  class="font-mono tabular-nums"
                  data-testid="feedback-overview-revision"
                >
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

            <FeedbackSchedulerPanel
              :can-control="canControlScheduler"
              :error="schedulerError"
              :loading="schedulerLoading"
              :pending-actions="pendingActions"
              :snapshot="schedulerSnapshot"
              @control="controlScheduler"
              @retry="refreshSchedulers"
            />

            <FeedbackTruthOperationsPanel
              v-if="overview"
              :can-remediate="canRemediateResolution"
              :pending-actions="pendingActions"
              :snapshot="overview.truth_operations"
              @remediate="remediateResolution"
            />
          </TabPane>

          <TabPane
            key="cycles"
            :tab="$t('page.research.feedback.tabs.cycles')"
            :force-render="true"
          >
            <Empty
              v-if="
                cyclePage.items.length === 0 && effectiveCycleId === undefined
              "
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
                    effectiveCycleId === cycle.feedback_cycle_id
                      ? 'true'
                      : undefined
                  "
                  class="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :class="{
                    'border-primary bg-accent':
                      effectiveCycleId === cycle.feedback_cycle_id,
                  }"
                  type="button"
                  @click="selectCycle(cycle)"
                >
                  <span class="min-w-0 flex-1" data-screenshot-volatile="true">
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

              <div v-if="effectiveCycleId" class="min-w-0">
                <div
                  v-if="
                    canTrigger &&
                    selectedCycle &&
                    canCancelFeedbackCycle(selectedCycle)
                  "
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
                  :type="detailNotFound ? 'error' : 'warning'"
                >
                  <template #action>
                    <Button
                      class="min-h-11"
                      @click="refreshCycleDetail(effectiveCycleId)"
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
                  <FeedbackCycleDetailPanel
                    :can-reject="canRejectRoute"
                    :detail="selectedCycleDetail"
                    :reject-pending="
                      selectedCycleDetail.candidate_ready !== null &&
                      pendingActions.has(
                        `reject-shadow:${selectedCycleDetail.candidate_ready.route_diff.shadow_binding_id}`,
                      )
                    "
                    @reject="rejectCandidate"
                  />
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
              :can-issue="canIssuePermit && selectedShadowBindingActive"
              :can-activate="canActivateRoute"
              :can-read="canReadPermits"
              :can-revoke="canRevokePermit"
              :activation-receipt="activationReceipt"
              :activation-id="routeActivationId"
              :activation-receipt-error="activationReceiptError"
              :activation-receipt-loading="activationReceiptLoading"
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
              @activate="activatePermit"
              @issue="issuePermit"
              @retry="refreshPermitEvidence"
              @revoke="revokePermit"
            />
          </TabPane>
        </Tabs>
      </template>
    </div>
  </Page>
</template>
