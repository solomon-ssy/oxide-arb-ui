<script lang="ts" setup>
import type {
  FeedbackCycleView,
  IssuePromotionPermitRequest,
  ModelRouteActivationReceiptView,
  Paginated,
  PromotionPermitView,
} from '@vben/types';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Select,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

import {
  canIssuePromotionPermit,
  PERMIT_TTL_PRESETS,
  promotionPermitRemaining,
  promotionPermitStatus,
  validatePermitTtl,
} from './feedback-action-state';

const props = defineProps<{
  activationId?: string;
  activationReceipt: ModelRouteActivationReceiptView | null;
  activationReceiptError: null | string;
  activationReceiptLoading: boolean;
  canActivate: boolean;
  canIssue: boolean;
  canRead: boolean;
  canRevoke: boolean;
  error: null | string;
  idempotencyKey: string;
  issuePending: boolean;
  loading: boolean;
  page: Paginated<PromotionPermitView>;
  pendingActions: Set<string>;
  selectedCycle?: FeedbackCycleView;
}>();

const emit = defineEmits<{
  activate: [permit: PromotionPermitView];
  issue: [request: Omit<IssuePromotionPermitRequest, 'note'>];
  retry: [];
  revoke: [permit: PromotionPermitView];
}>();

const ttlSecs = ref<number>(1800);
const inputError = ref<null | string>(null);
const clockNow = ref(performance.now());
const observedLocallyAt = new Map<string, number>();
let clockTimer: ReturnType<typeof setInterval> | undefined;

const ttlOptions = computed(() =>
  PERMIT_TTL_PRESETS.map((seconds) => ({
    label: $t('page.research.feedback.actions.permit.ttlMinutes', {
      minutes: seconds / 60,
    }),
    value: seconds,
  })),
);

const issueEligible = computed(
  () =>
    props.canIssue &&
    props.selectedCycle !== undefined &&
    canIssuePromotionPermit(props.selectedCycle),
);
const visibleActivationReceipt = computed(() => {
  const receipt = props.activationReceipt;
  return receipt !== null &&
    receipt.feedback_cycle_id === props.selectedCycle?.feedback_cycle_id
    ? receipt
    : null;
});

watch(
  () =>
    props.page.items
      .map(
        (permit) =>
          `${permit.promotion_permit_id}:${permit.observed_at}:${permit.status}`,
      )
      .join('|'),
  () => {
    const receivedAt = performance.now();
    const currentKeys = new Set(
      props.page.items.map((permit) => observationKey(permit)),
    );
    for (const key of observedLocallyAt.keys()) {
      if (!currentKeys.has(key)) {
        observedLocallyAt.delete(key);
      }
    }
    for (const permit of props.page.items) {
      observedLocallyAt.set(observationKey(permit), receivedAt);
    }
  },
  { immediate: true },
);

onMounted(() => {
  clockTimer = setInterval(() => {
    clockNow.value = performance.now();
  }, 1000);
});

onBeforeUnmount(() => {
  if (clockTimer !== undefined) {
    clearInterval(clockTimer);
  }
});

function observationKey(permit: PromotionPermitView) {
  return `${permit.promotion_permit_id}:${permit.observed_at}`;
}

function statusColor(status: ReturnType<typeof promotionPermitStatus>) {
  switch (status) {
    case 'active': {
      return 'success';
    }
    case 'expired': {
      return 'warning';
    }
    case 'invalid': {
      return 'error';
    }
    case 'revoked': {
      return 'error';
    }
  }
}

function receivedAt(permit: PromotionPermitView) {
  const localObservation =
    observedLocallyAt.get(observationKey(permit)) ?? clockNow.value;
  return localObservation;
}

function presentationStatus(permit: PromotionPermitView) {
  return promotionPermitStatus(permit, receivedAt(permit), clockNow.value);
}

function countdown(permit: PromotionPermitView) {
  const remaining = promotionPermitRemaining(
    permit,
    receivedAt(permit),
    clockNow.value,
  );
  if (remaining === null) {
    return $t('page.research.feedback.actions.permit.invalidClock');
  }
  if (presentationStatus(permit) !== 'active') {
    return $t('page.research.feedback.detail.notObserved');
  }
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

function formatUtc(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : $t('page.research.feedback.actions.permit.invalidClock');
}

function submitIssue() {
  const cycle = props.selectedCycle;
  if (!cycle || !issueEligible.value || props.issuePending) {
    return;
  }
  try {
    inputError.value = null;
    emit('issue', {
      feedback_cycle_id: cycle.feedback_cycle_id,
      idempotency_key: props.idempotencyKey,
      reason_code: 'operator_authorized',
      ttl_secs: validatePermitTtl(ttlSecs.value),
    });
  } catch {
    inputError.value = $t('page.research.feedback.actions.permit.invalidInput');
  }
}
</script>

<template>
  <section
    aria-labelledby="feedback-promotion-permits-title"
    class="mt-6 space-y-4"
    data-testid="feedback-permit-panel"
  >
    <div>
      <h2 id="feedback-promotion-permits-title" class="text-base font-semibold">
        {{ $t('page.research.feedback.actions.permit.title') }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ $t('page.research.feedback.actions.permit.description') }}
      </p>
    </div>

    <Alert
      v-if="!canRead"
      :message="$t('page.research.feedback.actions.permit.readDenied')"
      show-icon
      type="warning"
    />
    <Alert
      v-else-if="activationReceiptError"
      :message="activationReceiptError"
      show-icon
      type="error"
    >
      <template #action>
        <Button class="min-h-11" @click="emit('retry')">
          {{ $t('page.research.feedback.retry') }}
        </Button>
      </template>
    </Alert>
    <Alert
      v-else-if="activationId && activationReceiptLoading"
      :message="$t('page.research.feedback.actions.permit.receipt.loading')"
      show-icon
      type="info"
    />

    <Card
      v-if="visibleActivationReceipt"
      id="feedback-activation-receipt"
      aria-labelledby="feedback-activation-receipt-title"
      class="scroll-mt-24 focus-within:ring-2 focus-within:ring-ring"
      data-testid="feedback-activation-receipt"
      size="small"
    >
      <template #title>
        <span
          id="feedback-activation-receipt-title"
          class="focus-visible:outline-none"
          tabindex="-1"
        >
          {{ $t('page.research.feedback.actions.permit.receipt.title') }}
        </span>
      </template>
      <template #extra>
        <Tag color="success">
          {{ $t('page.research.feedback.actions.permit.receipt.activated') }}
        </Tag>
      </template>
      <Descriptions
        :column="{ lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 }"
        bordered
        class="feedback-receipt-descriptions"
        size="small"
      >
        <DescriptionsItem
          :label="
            $t('page.research.feedback.actions.permit.receipt.activationId')
          "
          span="filled"
        >
          <span class="break-all font-mono text-xs">
            {{ visibleActivationReceipt.policy_activation_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.actions.permit.receipt.route')"
        >
          {{ visibleActivationReceipt.route }} ·
          {{ visibleActivationReceipt.previous_route_generation }} →
          {{ visibleActivationReceipt.activated_route_generation }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t(
              'page.research.feedback.actions.permit.receipt.activatedRevision',
            )
          "
        >
          <span class="break-all font-mono text-xs">
            {{ visibleActivationReceipt.activated_model_routing_revision_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.research.feedback.actions.permit.receipt.rollbackRevision')
          "
        >
          <span class="break-all font-mono text-xs">
            {{
              visibleActivationReceipt.rollback_target
                .rollback_target_revision_id
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.actions.permit.receipt.model')"
        >
          <span class="break-all font-mono text-xs">
            {{ visibleActivationReceipt.previous_model_version_id }} →
            {{ visibleActivationReceipt.activated_model_version_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.actions.permit.receipt.actors')"
        >
          {{
            $t('page.research.feedback.actions.permit.receipt.actorLineage', {
              activator: visibleActivationReceipt.activated_by_username,
              issuer: visibleActivationReceipt.permit_issued_by_username,
            })
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.feedback.actions.permit.receipt.timestamp')"
        >
          {{ formatUtc(visibleActivationReceipt.server_timestamp) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.research.feedback.actions.permit.receipt.transactionHash')
          "
          span="filled"
        >
          <span class="break-all font-mono text-xs">
            {{ visibleActivationReceipt.transaction_hash }}
          </span>
        </DescriptionsItem>
      </Descriptions>
      <Alert
        class="mt-4"
        :message="
          $t('page.research.feedback.actions.permit.executionUnchanged')
        "
        show-icon
        type="success"
      />
      <RouterLink
        class="!text-foreground mt-4 inline-flex min-h-11 items-center rounded-sm underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="feedback-rollback-link"
        :to="{
          path: '/system/config',
          query: {
            module: 'policy',
            resource: 'model_routing',
            activated_revision_id:
              visibleActivationReceipt.activated_model_routing_revision_id,
            activation_id: visibleActivationReceipt.policy_activation_id,
            rollback_target_revision_id:
              visibleActivationReceipt.rollback_target
                .rollback_target_revision_id,
          },
        }"
      >
        {{ $t('page.research.feedback.actions.permit.receipt.rollback') }}
      </RouterLink>
    </Card>

    <Card v-if="canRead && canIssue" size="small">
      <template #title>
        {{ $t('page.research.feedback.actions.permit.issueTitle') }}
      </template>
      <div class="grid min-w-0 gap-4 lg:grid-cols-2">
        <div class="min-w-0">
          <div class="text-sm font-medium">
            {{ $t('page.research.feedback.actions.permit.selectedCycle') }}
          </div>
          <div class="mt-1 break-all font-mono text-xs">
            {{
              selectedCycle?.feedback_cycle_id ??
              $t('page.research.feedback.actions.permit.noCycle')
            }}
          </div>
        </div>
        <div class="min-w-0">
          <label class="text-sm font-medium" for="feedback-permit-ttl">
            {{ $t('page.research.feedback.actions.permit.ttl') }}
          </label>
          <Select
            id="feedback-permit-ttl"
            v-model:value="ttlSecs"
            class="mt-1 w-full"
            :options="ttlOptions"
          />
        </div>
        <div class="min-w-0">
          <div class="text-sm font-medium">
            {{ $t('page.research.feedback.actions.permit.idempotencyKey') }}
          </div>
          <div class="mt-1 break-all font-mono text-xs">
            {{ idempotencyKey }}
          </div>
        </div>
      </div>
      <Alert
        v-if="inputError"
        class="mt-4"
        :message="inputError"
        show-icon
        type="error"
      />
      <p v-else-if="!issueEligible" class="mt-4 text-sm text-muted-foreground">
        {{ $t('page.research.feedback.actions.permit.notEligible') }}
      </p>
      <Button
        class="mt-4 min-h-11"
        data-testid="feedback-issue-permit"
        :disabled="!issueEligible"
        :loading="issuePending"
        type="primary"
        @click="submitIssue"
      >
        {{ $t('page.research.feedback.actions.permit.issue') }}
      </Button>
    </Card>

    <Alert v-if="error" :message="error" show-icon type="warning">
      <template #action>
        <Button class="min-h-11" @click="emit('retry')">
          {{ $t('page.research.feedback.retry') }}
        </Button>
      </template>
    </Alert>

    <div v-if="canRead" :aria-busy="loading" class="space-y-3">
      <Empty
        v-if="!loading && page.items.length === 0"
        :description="$t('page.research.feedback.actions.permit.empty')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
      <Card
        v-for="permit in page.items"
        :key="permit.promotion_permit_id"
        :data-testid="`feedback-permit-${permit.promotion_permit_id}`"
        size="small"
      >
        <template #title>
          <span class="break-all font-mono text-xs">
            {{ permit.promotion_permit_id }}
          </span>
        </template>
        <template #extra>
          <Tag :color="statusColor(presentationStatus(permit))">
            {{
              $t(
                `page.research.feedback.actions.permit.status.${presentationStatus(permit)}`,
              )
            }}
          </Tag>
        </template>
        <Descriptions
          :column="{ lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 }"
          bordered
          size="small"
        >
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.cycle')"
          >
            <span class="break-all font-mono text-xs">
              {{ permit.feedback_cycle_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.profile')"
          >
            <span class="break-all font-mono text-xs">
              {{ permit.profile_ref.id }}@{{ permit.profile_ref.version }} ·
              {{ permit.profile_ref.content_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.category')"
          >
            {{ permit.category }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.runtimeModes')"
          >
            {{
              permit.allowed_runtime_modes
                .map((mode) => $t(`enum.quantRuntimeMode.${mode}`))
                .join(', ')
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.serverClock')"
          >
            {{ formatUtc(permit.observed_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.expiresAt')"
          >
            {{ formatUtc(permit.expires_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.countdown')"
          >
            <span
              class="font-mono tabular-nums"
              data-screenshot-volatile="true"
            >
              {{ countdown(permit) }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.routeRevision')"
          >
            {{ permit.expected_policy_generation }} ·
            {{ permit.expected_runtime_control_revision }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.routeGeneration')"
          >
            {{ permit.expected_route_generation }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.modelDiff')"
            span="filled"
          >
            <span class="break-all font-mono text-xs">
              {{ permit.champion_model_version_id }} →
              {{ permit.candidate_model_version_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.manifest')"
            span="filled"
          >
            <span class="break-all font-mono text-xs">
              {{ permit.candidate_manifest_id }} ·
              {{ permit.candidate_manifest_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.issuedBy')"
          >
            {{ permit.issued_by_username }} · {{ permit.issued_by_role }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.issuedReason')"
          >
            {{ permit.issuance_reason }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.scopeHash')"
          >
            <span class="break-all font-mono text-xs">
              {{ permit.scope_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.preflightHash')"
          >
            <span class="break-all font-mono text-xs">
              {{ permit.preflight_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.research.feedback.actions.permit.promotionGateHash')
            "
            span="filled"
          >
            <span class="break-all font-mono text-xs">
              {{ permit.promotion_gate_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.revision')"
          >
            {{ permit.revision }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.research.feedback.actions.permit.observedAt')"
          >
            {{ formatDateTimeLocal(permit.observed_at) }}
          </DescriptionsItem>
        </Descriptions>
        <Alert
          v-if="presentationStatus(permit) === 'active'"
          class="mt-4"
          :message="
            $t('page.research.feedback.actions.permit.activationInvariant')
          "
          show-icon
          type="info"
        />
        <div
          v-if="presentationStatus(permit) === 'active'"
          class="mt-4 flex flex-wrap gap-2"
        >
          <Button
            v-if="canActivate"
            class="min-h-11"
            :data-testid="`feedback-activate-${permit.promotion_permit_id}`"
            :loading="
              pendingActions.has(`activate:${permit.promotion_permit_id}`)
            "
            type="primary"
            @click="emit('activate', permit)"
          >
            {{ $t('page.research.feedback.actions.permit.activate') }}
          </Button>
          <Button
            v-if="canRevoke"
            class="min-h-11"
            danger
            :loading="
              pendingActions.has(`revoke:${permit.promotion_permit_id}`)
            "
            @click="emit('revoke', permit)"
          >
            {{ $t('page.research.feedback.actions.permit.revoke') }}
          </Button>
        </div>
      </Card>
    </div>
  </section>
</template>

<style scoped>
@media (max-width: 640px) {
  .feedback-receipt-descriptions :deep(.ant-descriptions-item-label) {
    width: 6.5rem;
    min-width: 6.5rem;
  }
}
</style>
