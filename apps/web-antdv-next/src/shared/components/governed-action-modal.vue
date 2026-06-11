<script lang="ts" setup>
import type { GovernedFormValue } from '#/shared/composables/use-governed-action';

import { computed } from 'vue';

import { Input, Select, TextArea } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'GovernedActionModal' });

const props = defineProps<{
  /** Exact word the operator must type to confirm a dangerous action. */
  confirmWord?: string;
  /** Minimum characters required for the reason field. */
  minReasonLength: number;
  /** Acting-role candidates for the current user. */
  roles: string[];
}>();

/** Hosted by vben `prompt()` — the whole form value is the prompt model. */
const modelValue = defineModel<GovernedFormValue>({ required: true });

const roleOptions = computed(() =>
  props.roles.map((role) => ({ label: role, value: role })),
);
</script>

<template>
  <div class="flex flex-col gap-3 pt-1">
    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium">
        {{ $t('governance.field.actingRole') }}
      </span>
      <Select
        v-model:value="modelValue.actingRole"
        :options="roleOptions"
        :placeholder="$t('governance.field.actingRolePlaceholder')"
      />
    </div>

    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium">
        {{ $t('governance.field.reason') }}
      </span>
      <TextArea
        v-model:value="modelValue.reason"
        :placeholder="
          $t('governance.field.reasonPlaceholder', { min: minReasonLength })
        "
        :rows="3"
      />
    </div>

    <div v-if="confirmWord" class="flex flex-col gap-1">
      <span class="text-destructive text-sm font-medium">
        {{ $t('governance.field.confirmWord') }}
      </span>
      <Input
        v-model:value="modelValue.confirmInput"
        :placeholder="
          $t('governance.field.confirmWordPlaceholder', { word: confirmWord })
        "
      />
    </div>
  </div>
</template>
