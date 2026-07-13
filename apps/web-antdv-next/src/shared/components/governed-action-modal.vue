<script lang="ts" setup>
import type { RoleView } from '@vben/types';

import type { GovernedField } from '#/shared/composables/governed-field';
import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { computed, reactive, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import {
  Checkbox,
  Descriptions,
  DescriptionsItem,
  Input,
  Select,
  TextArea,
} from 'antdv-next';

import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import { isGovernedFieldValid } from '#/shared/composables/governed-field';
import { useAuthStore } from '#/store';

interface GovernedDetailRow {
  label: string;
  mono?: boolean;
  routeTo?: string;
  value: string;
}

export interface GovernedActionPayload {
  confirmWord?: string;
  danger?: boolean;
  details?: GovernedDetailRow[];
  fields?: GovernedField[];
  onCancel?: () => void;
  /** Return `true` when the governed mutation succeeded. */
  onSubmit: (ctx: GovernedContext) => Promise<boolean>;
  summary?: string;
  title: string;
}

const authStore = useAuthStore();

const actingRole = ref<string>('');
const reason = ref('');
const confirmWordInput = ref('');
/** Raw string values of the payload's typed fields, keyed by field name. */
const fieldValues = reactive<Record<string, string>>({});

const roleOptions = computed(() =>
  authStore.meRoles.map((role: RoleView) => ({
    label: role.name,
    value: role.code,
  })),
);

const payload = ref<GovernedActionPayload | null>(null);

const isSingleRole = computed(() => roleOptions.value.length <= 1);

const fieldsValid = computed(
  () =>
    !payload.value?.fields?.some(
      (field) => !isGovernedFieldValid(field, fieldValues[field.name]),
    ),
);

const canSubmit = computed(() => {
  const trimmedReason = reason.value.trim();
  if (trimmedReason.length < 4 || !actingRole.value) {
    return false;
  }
  if (!fieldsValid.value) {
    return false;
  }
  if (payload.value?.danger && payload.value.confirmWord) {
    return confirmWordInput.value === payload.value.confirmWord;
  }
  return true;
});

/** Normalize collected field inputs to `undefined` for empty strings. */
function collectFields(): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const field of payload.value?.fields ?? []) {
    const raw = (fieldValues[field.name] ?? '').trim();
    result[field.name] = raw === '' ? undefined : raw;
  }
  return result;
}

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
      const succeeded = await payload.value.onSubmit({
        actingRole: actingRole.value,
        fields: collectFields(),
        reason: reason.value.trim(),
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
      payload.value = modalApi.getData<GovernedActionPayload>();
      modalApi.setState({ title: payload.value?.title ?? '' });
      reason.value = '';
      confirmWordInput.value = '';
      actingRole.value = roleOptions.value[0]?.value ?? '';
      for (const key of Object.keys(fieldValues)) {
        delete fieldValues[key];
      }
      for (const field of payload.value?.fields ?? []) {
        fieldValues[field.name] = '';
      }
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
    <div class="flex flex-col gap-4" data-testid="governed-action-modal">
      <p
        v-if="payload?.summary"
        class="text-sm text-gray-600 dark:text-gray-300"
      >
        {{ payload.summary }}
      </p>

      <Descriptions
        v-if="payload?.details?.length"
        bordered
        :column="1"
        size="small"
      >
        <DescriptionsItem
          v-for="row in payload.details"
          :key="row.label"
          :label="row.label"
        >
          <EntityRouteLink
            v-if="row.routeTo"
            :label="row.value"
            :mono="row.mono"
            :to="row.routeTo"
          />
          <span v-else :class="row.mono ? 'font-mono text-xs break-all' : ''">
            {{ row.value }}
          </span>
        </DescriptionsItem>
      </Descriptions>

      <div
        v-for="field in payload?.fields ?? []"
        :key="field.name"
        :data-testid="`governed-field-${field.name}`"
        class="flex flex-col gap-1"
      >
        <span class="text-sm font-medium">
          {{ field.label }}
          <span v-if="field.required" class="text-destructive">*</span>
        </span>
        <Checkbox
          v-if="field.kind === 'checkbox'"
          :checked="fieldValues[field.name] === 'acknowledged'"
          @update:checked="
            (checked) => {
              fieldValues[field.name] = checked ? 'acknowledged' : '';
            }
          "
        >
          {{ field.help }}
        </Checkbox>
        <Select
          v-else-if="field.kind === 'select'"
          v-model:value="fieldValues[field.name]"
          allow-clear
          :options="field.options"
          :placeholder="field.placeholder"
        />
        <Input
          v-else
          v-model:value="fieldValues[field.name]"
          :inputmode="field.kind === 'text' ? undefined : 'decimal'"
          :placeholder="field.placeholder"
        />
        <span
          v-if="field.help && field.kind !== 'checkbox'"
          class="text-xs text-gray-500"
        >
          {{ field.help }}
        </span>
      </div>

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
          data-testid="governed-reason"
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
