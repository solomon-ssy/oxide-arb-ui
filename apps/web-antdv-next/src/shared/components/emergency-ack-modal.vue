<script lang="ts" setup>
import type { ExecutionEmergencyView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Alert, Checkbox, Input } from 'antdv-next';

import { $t } from '#/locales';
import { useSystemStore } from '#/store';

export interface EmergencyAckPayload {
  emergency?: ExecutionEmergencyView;
  onCancel?: () => void;
  onSubmit: (operatorAck: string) => Promise<boolean>;
}

defineOptions({ name: 'EmergencyAckModal' });

const systemStore = useSystemStore();
const acknowledged = ref(false);
const operatorAck = ref('');
const payload = ref<EmergencyAckPayload | null>(null);

const blockingCount = computed(
  () => systemStore.balance?.blocking_trade_count ?? 0,
);

const emergency = computed(
  () =>
    payload.value?.emergency ?? systemStore.status?.execution_emergency ?? null,
);

const canSubmit = computed(
  () =>
    acknowledged.value &&
    operatorAck.value.trim().length >= 4 &&
    blockingCount.value === 0,
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
      const succeeded = await payload.value.onSubmit(operatorAck.value.trim());
      if (succeeded) {
        modalApi.close();
      }
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      payload.value = modalApi.getData<EmergencyAckPayload>();
      modalApi.setState({ title: $t('page.system.emergencyAck.title') });
      acknowledged.value = false;
      operatorAck.value = '';
    }
  },
});
</script>

<template>
  <Modal>
    <div class="flex flex-col gap-4">
      <Alert
        v-if="blockingCount > 0"
        type="error"
        show-icon
        :message="
          $t('page.system.emergencyAck.blockingTrades', {
            count: blockingCount,
          })
        "
      />

      <div v-if="emergency" class="text-sm">
        <p class="font-medium">
          {{
            $t('page.system.emergencyAck.classLabel', {
              class: $t(`enum.executionEmergencyClass.${emergency.class}`),
            })
          }}
        </p>
        <p v-if="emergency.last_reason" class="text-muted-foreground mt-1">
          {{ emergency.last_reason }}
        </p>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-300">
        {{ $t('page.system.emergencyAck.summary') }}
      </p>

      <ol class="text-muted-foreground list-inside list-decimal text-xs">
        <li>{{ $t('page.system.emergencyAck.steps.reconcile') }}</li>
        <li>{{ $t('page.system.emergencyAck.steps.ack') }}</li>
        <li>{{ $t('page.system.emergencyAck.steps.resume') }}</li>
      </ol>

      <Checkbox v-model:checked="acknowledged">
        {{ $t('page.system.emergencyAck.ackCheckbox') }}
      </Checkbox>

      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.system.emergencyAck.ackLabel') }}
        </span>
        <Input
          v-model:value="operatorAck"
          :disabled="blockingCount > 0"
          :maxlength="256"
          :placeholder="$t('page.system.emergencyAck.ackPlaceholder')"
        />
      </div>
    </div>
  </Modal>
</template>
