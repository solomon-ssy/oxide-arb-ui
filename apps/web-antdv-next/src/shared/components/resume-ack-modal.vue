<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Checkbox, Input } from 'antdv-next';

import { $t } from '#/locales';

export interface ResumeAckPayload {
  onCancel?: () => void;
  onSubmit: (operatorAck: string) => Promise<void>;
}

defineOptions({ name: 'ResumeAckModal' });

const acknowledged = ref(false);
const operatorAck = ref('');
const payload = ref<null | ResumeAckPayload>(null);

const canSubmit = computed(
  () => acknowledged.value && operatorAck.value.trim().length >= 4,
);

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
      await payload.value.onSubmit(operatorAck.value.trim());
      modalApi.close();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      payload.value = modalApi.getData<ResumeAckPayload>();
      modalApi.setState({ title: $t('page.system.resume.title') });
      acknowledged.value = false;
      operatorAck.value = '';
    }
  },
});
</script>

<template>
  <Modal>
    <div class="flex flex-col gap-4">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {{ $t('page.system.resume.summary') }}
      </p>
      <Checkbox v-model:checked="acknowledged">
        {{ $t('page.system.resume.ackCheckbox') }}
      </Checkbox>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.system.resume.ackLabel') }}
        </span>
        <Input
          v-model:value="operatorAck"
          :maxlength="256"
          :placeholder="$t('page.system.resume.ackPlaceholder')"
        />
        <span class="text-xs text-gray-500">
          {{ $t('page.system.resume.ackTip') }}
        </span>
      </div>
    </div>
  </Modal>
</template>
