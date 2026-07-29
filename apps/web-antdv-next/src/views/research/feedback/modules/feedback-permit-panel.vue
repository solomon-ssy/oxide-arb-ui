<script lang="ts" setup>
import type {
  FeedbackCycleView,
  IssuePromotionPermitRequest,
  Paginated,
  PromotionPermitView,
  QuantRuntimeMode,
} from '@vben/types';

import { computed, ref } from 'vue';

import { QUANT_RUNTIME_MODE_OPTIONS } from '@vben/types';

import {
  Alert,
  Button,
  Card,
  CheckboxGroup,
  Descriptions,
  DescriptionsItem,
  Empty,
  Input,
  Tag,
} from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

import {
  canIssuePromotionPermit,
  canonicalPromotionModes,
  parsePromotionExpiry,
} from './feedback-action-state';

const props = defineProps<{
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
  issue: [request: Omit<IssuePromotionPermitRequest, 'reason'>];
  retry: [];
  revoke: [permit: PromotionPermitView];
}>();

const selectedModes = ref<QuantRuntimeMode[]>(['report_only']);
const expiryInput = ref('');
const inputError = ref<null | string>(null);

const modeOptions = computed(() =>
  QUANT_RUNTIME_MODE_OPTIONS.map((mode) => ({
    label: $t(`enum.quantRuntimeMode.${mode}`),
    value: mode,
  })),
);

const issueEligible = computed(
  () =>
    props.canIssue &&
    props.selectedCycle !== undefined &&
    canIssuePromotionPermit(props.selectedCycle),
);

function statusColor(status: PromotionPermitView['status']) {
  switch (status) {
    case 'active': {
      return 'success';
    }
    case 'expired': {
      return 'warning';
    }
    case 'revoked': {
      return 'error';
    }
  }
}

function submitIssue() {
  const cycle = props.selectedCycle;
  if (!cycle || !issueEligible.value || props.issuePending) {
    return;
  }
  try {
    inputError.value = null;
    emit('issue', {
      allowed_runtime_modes: canonicalPromotionModes(selectedModes.value),
      expires_at: parsePromotionExpiry(expiryInput.value),
      feedback_cycle_id: cycle.feedback_cycle_id,
      idempotency_key: props.idempotencyKey,
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
          <label class="text-sm font-medium" for="feedback-permit-expiry">
            {{ $t('page.research.feedback.actions.permit.expiresAt') }}
          </label>
          <Input
            id="feedback-permit-expiry"
            v-model:value="expiryInput"
            class="mt-1"
            type="datetime-local"
          />
        </div>
        <fieldset class="min-w-0">
          <legend class="text-sm font-medium">
            {{ $t('page.research.feedback.actions.permit.runtimeModes') }}
          </legend>
          <CheckboxGroup
            v-model:value="selectedModes"
            class="mt-2 flex flex-wrap gap-3"
            :options="modeOptions"
          />
        </fieldset>
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
        size="small"
      >
        <template #title>
          <span class="break-all font-mono text-xs">
            {{ permit.promotion_permit_id }}
          </span>
        </template>
        <template #extra>
          <Tag :color="statusColor(permit.status)">
            {{
              $t(
                `page.research.feedback.actions.permit.status.${permit.status}`,
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
            :label="$t('page.research.feedback.actions.permit.expiresAt')"
          >
            {{ formatDateTimeLocal(permit.expires_at) }}
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
        <Button
          v-if="canRevoke && permit.status === 'active'"
          class="mt-4 min-h-11"
          danger
          :loading="pendingActions.has(`revoke:${permit.promotion_permit_id}`)"
          @click="emit('revoke', permit)"
        >
          {{ $t('page.research.feedback.actions.permit.revoke') }}
        </Button>
      </Card>
    </div>
  </section>
</template>
