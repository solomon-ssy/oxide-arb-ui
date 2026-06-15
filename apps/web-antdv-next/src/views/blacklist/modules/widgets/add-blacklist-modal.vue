<script lang="ts" setup>
import type { BlacklistReason, MarketId, RoleView } from '@vben/types';

import type { SelectOption } from '../schemas/form';

import { computed, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { useAuthStore } from '#/store';

import { useAddBlacklistFormSchema } from '../schemas/form';

defineOptions({ name: 'AddBlacklistModal' });

export interface AddBlacklistSubmitPayload {
  actingRole: string;
  blacklistReason: BlacklistReason;
  marketId: MarketId;
  reason: string;
}

interface ModalPayload {
  onSubmit: (payload: AddBlacklistSubmitPayload) => Promise<boolean>;
}

interface AddBlacklistFormValues {
  acting_role: string;
  blacklist_reason: BlacklistReason;
  market_id: MarketId;
  reason: string;
}

const authStore = useAuthStore();

const roleOptions = computed<Array<SelectOption>>(() =>
  authStore.meRoles.map((role: RoleView) => ({
    label: role.name,
    value: role.code,
  })),
);

const [Form, formApi] = useVbenForm({
  schema: useAddBlacklistFormSchema(roleOptions.value),
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  fullscreenButton: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const values = (await formApi.getValues()) as AddBlacklistFormValues;
    const payload = modalApi.getData<ModalPayload>();
    modalApi.lock();
    try {
      const succeeded = await payload.onSubmit({
        actingRole: values.acting_role,
        blacklistReason: values.blacklist_reason,
        marketId: values.market_id,
        reason: values.reason.trim(),
      });
      if (succeeded) {
        modalApi.close();
      }
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      formApi.resetForm();
      const defaultRole = roleOptions.value[0]?.value;
      if (defaultRole) {
        formApi.setValues({ acting_role: defaultRole });
      }
    }
  },
});

watch(roleOptions, (options) => {
  formApi.setState({ schema: useAddBlacklistFormSchema(options) });
});
</script>

<template>
  <Modal>
    <Form />
  </Modal>
</template>
