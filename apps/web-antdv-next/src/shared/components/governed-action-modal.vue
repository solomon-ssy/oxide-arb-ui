<script lang="ts" setup>
import type { RoleView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Input, Select, TextArea } from 'antdv-next';

import { useAuthStore } from '#/store';

export interface GovernedActionPayload {
  confirmWord?: string;
  danger?: boolean;
  onCancel?: () => void;
  onSubmit: (ctx: { actingRole: string; reason: string }) => Promise<void>;
  summary?: string;
  title: string;
}

const authStore = useAuthStore();

const actingRole = ref<string>('');
const reason = ref('');
const confirmWordInput = ref('');

const roleOptions = computed(() =>
  authStore.meRoles.map((role: RoleView) => ({
    label: role.name,
    value: role.code,
  })),
);

const payload = ref<GovernedActionPayload | null>(null);

const isSingleRole = computed(() => roleOptions.value.length <= 1);

const canSubmit = computed(() => {
  const trimmedReason = reason.value.trim();
  if (trimmedReason.length < 4 || !actingRole.value) {
    return false;
  }
  if (payload.value?.danger && payload.value.confirmWord) {
    return confirmWordInput.value === payload.value.confirmWord;
  }
  return true;
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onCancel() {
    payload.value?.onCancel?.();
    modalApi.close();
  },
  onConfirm: async () => {
    if (!canSubmit.value || !payload.value) {
      return;
    }
    modalApi.lock();
    try {
      await payload.value.onSubmit({
        actingRole: actingRole.value,
        reason: reason.value.trim(),
      });
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      payload.value = modalApi.getData<GovernedActionPayload>();
      modalApi.setState({ title: payload.value?.title ?? '' });
      reason.value = '';
      confirmWordInput.value = '';
      actingRole.value = roleOptions.value[0]?.value ?? '';
    }
  },
});

watch(roleOptions, (options) => {
  if (!actingRole.value && options.length > 0) {
    actingRole.value = options[0]?.value ?? '';
  }
});
</script>

<template>
  <Modal>
    <div class="flex flex-col gap-4">
      <p
        v-if="payload?.summary"
        class="text-sm text-gray-600 dark:text-gray-300"
      >
        {{ payload.summary }}
      </p>

      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">{{
          $t('governance.modal.actingRole')
        }}</span>
        <Select
          v-if="!isSingleRole"
          v-model:value="actingRole"
          :options="roleOptions"
          class="w-full"
        />
        <Input v-else :value="roleOptions[0]?.label" disabled />
        <span class="text-xs text-gray-500">
          {{ $t('governance.modal.actingRoleTip') }}
        </span>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">{{
          $t('governance.modal.reason')
        }}</span>
        <TextArea
          v-model:value="reason"
          :maxlength="1024"
          :placeholder="$t('governance.modal.reasonPlaceholder')"
          :rows="4"
          show-count
        />
      </div>

      <div
        v-if="payload?.danger && payload.confirmWord"
        class="flex flex-col gap-1"
      >
        <span class="text-sm font-medium">{{
          $t('governance.modal.confirmWord')
        }}</span>
        <Input
          v-model:value="confirmWordInput"
          :placeholder="$t('governance.modal.confirmWordPlaceholder')"
        />
        <span class="text-xs text-gray-500">
          {{
            $t('governance.modal.confirmWordTip', {
              word: payload.confirmWord,
            })
          }}
        </span>
      </div>
    </div>
  </Modal>
</template>
