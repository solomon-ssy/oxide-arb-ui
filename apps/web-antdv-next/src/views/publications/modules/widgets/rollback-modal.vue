<script lang="ts" setup>
import type { ControlFactorPublicationInfo, UuidString } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Select } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'PublicationRollbackModal' });

interface ModalPayload {
  currentId: UuidString;
  options: ControlFactorPublicationInfo[];
  onSubmit: (targetPublicationId: UuidString) => Promise<boolean>;
}

const currentId = ref('');
const targetId = ref('');
const options = ref<ControlFactorPublicationInfo[]>([]);
const error = ref('');

const [Modal, modalApi] = useVbenModal({
  fullscreenButton: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    if (!targetId.value) {
      error.value = $t('page.publications.rollback.error.targetRequired');
      return;
    }
    const payload = modalApi.getData<ModalPayload>();
    modalApi.lock();
    try {
      const succeeded = await payload.onSubmit(targetId.value);
      if (succeeded) {
        modalApi.close();
      }
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const payload = modalApi.getData<ModalPayload>();
      currentId.value = payload.currentId;
      options.value = payload.options.filter(
        (item) => item.publication_id !== payload.currentId,
      );
      targetId.value = '';
      error.value = '';
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.publications.rollback.title')">
    <div
      v-if="error"
      class="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600"
    >
      {{ error }}
    </div>
    <div class="space-y-3">
      <div class="text-sm">
        {{ $t('page.publications.rollback.current') }}
        <span class="font-mono text-xs">{{ currentId }}</span>
      </div>
      <Select
        v-model:value="targetId"
        class="w-full"
        :placeholder="$t('page.publications.rollback.targetPlaceholder')"
        :options="
          options.map((item) => ({
            label: `${item.publication_id.slice(0, 8)}… · ${item.status}`,
            value: item.publication_id,
          }))
        "
      />
    </div>
  </Modal>
</template>
