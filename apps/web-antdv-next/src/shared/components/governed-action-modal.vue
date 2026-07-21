<script lang="ts" setup>
import type { RoleView } from '@vben/types';

import type { GovernedField } from '#/shared/composables/governed-field';
import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { computed, nextTick, reactive, ref, useId, watch } from 'vue';

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

const modalControlPrefix = useId();
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

function fieldControlId(name: string) {
  return `${modalControlPrefix}-field-${name}`;
}

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

function focusModalTitle() {
  void nextTick(() => {
    const modalBody = document.querySelector<HTMLElement>(
      '[data-testid="governed-action-modal"]',
    );
    const title = modalBody
      ?.closest('[role="dialog"]')
      ?.querySelector<HTMLElement>('h2');
    title?.setAttribute('tabindex', '-1');
    title?.focus({ preventScroll: true });
  });
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
      focusModalTitle();
    }
  },
});

watch(roleOptions, (options) => {
  if (!actingRole.value && options.length > 0) {
    actingRole.value = options[0]?.value ?? '';
  }
});

watch(
  canSubmit,
  (enabled) => {
    modalApi.setState({ confirmDisabled: !enabled });
  },
  { immediate: true },
);
</script>

<template>
  <Modal>
    <div class="flex flex-col gap-4" data-testid="governed-action-modal">
      <p v-if="payload?.summary" class="text-muted-foreground text-sm">
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
        <label :for="fieldControlId(field.name)" class="text-sm font-medium">
          {{ field.label }}
          <span v-if="field.required" class="text-destructive">*</span>
        </label>
        <Checkbox
          v-if="field.kind === 'checkbox'"
          :id="fieldControlId(field.name)"
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
          :id="fieldControlId(field.name)"
          :options="field.options"
          :placeholder="field.placeholder"
        />
        <Input
          v-else
          v-model:value="fieldValues[field.name]"
          :id="fieldControlId(field.name)"
          :inputmode="field.kind === 'text' ? undefined : 'decimal'"
          :placeholder="field.placeholder"
        />
        <span
          v-if="field.help && field.kind !== 'checkbox'"
          class="governed-hint text-xs"
        >
          {{ field.help }}
        </span>
      </div>

      <div class="flex flex-col gap-1">
        <label
          :for="`${modalControlPrefix}-acting-role`"
          class="text-sm font-medium"
        >
          {{ $t('governance.modal.actingRole') }}
        </label>
        <Select
          v-if="!isSingleRole"
          v-model:value="actingRole"
          :id="`${modalControlPrefix}-acting-role`"
          :options="roleOptions"
          class="w-full"
        />
        <Input
          v-else
          :id="`${modalControlPrefix}-acting-role`"
          :value="roleOptions[0]?.label"
          disabled
        />
        <span class="governed-hint text-xs">
          {{ $t('governance.modal.actingRoleTip') }}
        </span>
      </div>

      <div class="flex flex-col gap-1">
        <label
          :for="`${modalControlPrefix}-reason`"
          class="text-sm font-medium"
        >
          {{ $t('governance.modal.reason') }}
        </label>
        <TextArea
          data-testid="governed-reason"
          v-model:value="reason"
          :id="`${modalControlPrefix}-reason`"
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
        <label
          :for="`${modalControlPrefix}-confirm-word`"
          class="text-sm font-medium"
        >
          {{ $t('governance.modal.confirmWord') }}
        </label>
        <Input
          v-model:value="confirmWordInput"
          :id="`${modalControlPrefix}-confirm-word`"
          :placeholder="$t('governance.modal.confirmWordPlaceholder')"
        />
        <span class="governed-hint text-xs">
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

<style scoped>
.governed-hint,
:deep(.ant-input-data-count) {
  color: hsl(var(--foreground));
}
</style>
