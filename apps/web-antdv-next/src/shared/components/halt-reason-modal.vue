<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { TextArea } from 'antdv-next';

import { $t } from '#/locales';

export interface HaltReasonPayload {
  onCancel?: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}

defineOptions({ name: 'HaltReasonModal' });

const reason = ref('');
const payload = ref<HaltReasonPayload | null>(null);

const canSubmit = computed(() => reason.value.trim().length >= 4);

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
      const succeeded = await payload.value.onSubmit(reason.value.trim());
      if (succeeded) {
        modalApi.close();
      }
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      payload.value = modalApi.getData<HaltReasonPayload>();
      modalApi.setState({ title: $t('page.system.halt.title') });
      reason.value = '';
    }
  },
});
</script>

<template>
  <Modal>
    <div class="flex flex-col gap-4">
      <p class="text-sm font-medium text-red-600 dark:text-red-400">
        {{ $t('page.system.halt.warning') }}
      </p>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('governance.modal.reason') }}
        </span>
        <TextArea
          v-model:value="reason"
          :maxlength="1024"
          :placeholder="$t('page.system.halt.reasonPlaceholder')"
          :rows="4"
          show-count
        />
      </div>
    </div>
  </Modal>
</template>
