<script lang="ts" setup>
import type { IsoDateTime, PublicationMode, UuidString } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Alert } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'ControlFactorPublishModal' });

export interface PublishModalSubmitPayload {
  effective_from?: IsoDateTime;
  expires_at?: IsoDateTime;
  factor_ids: UuidString[];
  idempotency_key: string;
  manual_risk_expansion_approval: boolean;
  mode: 'emergency' | 'live' | 'shadow';
}

interface ModalPayload {
  factorIds: UuidString[];
  mode: PublishModalSubmitPayload['mode'];
  onSubmit: (payload: PublishModalSubmitPayload) => Promise<boolean>;
}

const factorIds = ref<UuidString[]>([]);
const mode = ref<PublishModalSubmitPayload['mode']>('shadow');
const idempotencyKey = ref('');
const effectiveFrom = ref('');
const expiresAt = ref('');
const manualApproval = ref(false);
const error = ref('');

const isEmergency = computed(() => mode.value === 'emergency');
const publicationMode = computed<PublicationMode>(() =>
  mode.value === 'shadow' ? 'shadow' : 'published',
);

function reset(payload: ModalPayload) {
  factorIds.value = payload.factorIds;
  mode.value = payload.mode;
  idempotencyKey.value = crypto.randomUUID();
  effectiveFrom.value = '';
  expiresAt.value = '';
  manualApproval.value = payload.mode === 'emergency';
  error.value = '';
}

function toIsoDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

const [Modal, modalApi] = useVbenModal({
  fullscreenButton: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    if (factorIds.value.length === 0) {
      error.value = $t('page.controlFactors.publish.error.noFactors');
      return;
    }
    if (!idempotencyKey.value.trim()) {
      error.value = $t('page.controlFactors.publish.error.idempotencyKey');
      return;
    }
    if (!isEmergency.value && !expiresAt.value) {
      error.value = $t('page.controlFactors.publish.error.expiresAt');
      return;
    }
    const payload = modalApi.getData<ModalPayload>();
    modalApi.lock();
    try {
      const succeeded = await payload.onSubmit({
        effective_from: toIsoDateTime(effectiveFrom.value),
        expires_at: toIsoDateTime(expiresAt.value),
        factor_ids: factorIds.value,
        idempotency_key: idempotencyKey.value.trim(),
        manual_risk_expansion_approval: manualApproval.value,
        mode: mode.value,
      });
      if (succeeded) {
        modalApi.close();
      }
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      reset(modalApi.getData<ModalPayload>());
    }
  },
});
</script>

<template>
  <Modal :title="$t(`page.controlFactors.publish.${mode}.title`)">
    <Alert
      :message="$t(`page.controlFactors.publish.${mode}.tip`)"
      class="mb-4"
      show-icon
      :type="isEmergency ? 'error' : 'info'"
    />
    <div
      v-if="error"
      class="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600"
    >
      {{ error }}
    </div>
    <div class="space-y-4">
      <div>
        <div class="mb-1 text-sm font-medium">
          {{ $t('page.controlFactors.publish.factorIds') }}
        </div>
        <div class="text-muted-foreground break-all font-mono text-xs">
          {{ factorIds.join(', ') }}
        </div>
      </div>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">
          {{ $t('page.controlFactors.publish.mode') }}
        </span>
        <input
          :value="$t(`enum.publicationMode.${publicationMode}`)"
          class="bg-muted w-full rounded border px-2 py-1 text-sm"
          disabled
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">
          {{ $t('page.controlFactors.publish.idempotencyKey') }}
        </span>
        <input
          v-model="idempotencyKey"
          class="bg-background w-full rounded border px-2 py-1 text-sm"
        />
      </label>
      <label v-if="!isEmergency" class="block">
        <span class="mb-1 block text-sm font-medium">
          {{ $t('page.controlFactors.publish.effectiveFrom') }}
        </span>
        <input
          v-model="effectiveFrom"
          class="bg-background w-full rounded border px-2 py-1 text-sm"
          type="datetime-local"
        />
      </label>
      <label v-if="!isEmergency" class="block">
        <span class="mb-1 block text-sm font-medium">
          {{ $t('page.controlFactors.publish.expiresAt') }}
        </span>
        <input
          v-model="expiresAt"
          class="bg-background w-full rounded border px-2 py-1 text-sm"
          type="datetime-local"
        />
      </label>
      <label class="flex items-center gap-2">
        <input
          v-model="manualApproval"
          :disabled="isEmergency"
          type="checkbox"
        />
        <span class="text-sm">{{
          $t('page.controlFactors.publish.manualRiskExpansionApproval')
        }}</span>
      </label>
    </div>
  </Modal>
</template>
