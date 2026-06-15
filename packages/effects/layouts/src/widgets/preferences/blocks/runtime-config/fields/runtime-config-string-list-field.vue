<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { ref } from 'vue';

import { CircleX } from '@vben/icons';
import { $t } from '@vben/locales';

import { Badge, Input, VbenButton } from '@vben-core/shadcn-ui';

import RuntimeConfigFieldHelp from './runtime-config-field-help.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
  label: string;
  locale: string;
}>();

const model = defineModel<string[]>({ required: true });

const draft = ref('');

function addEntry() {
  const value = draft.value.trim();
  if (!value || props.disabled) {
    return;
  }
  if (props.field.constraints?.pattern) {
    const pattern = new RegExp(props.field.constraints.pattern);
    if (!pattern.test(value)) {
      return;
    }
  }
  if (!model.value.includes(value)) {
    model.value = [...model.value, value];
  }
  draft.value = '';
}

function removeEntry(value: string) {
  if (props.disabled) {
    return;
  }
  model.value = model.value.filter((item) => item !== value);
}
</script>

<template>
  <div class="my-1 space-y-3 rounded-md px-2 py-2">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-foreground min-w-0 text-sm font-medium break-words">
        {{ label }}
      </span>
      <RuntimeConfigFieldHelp :help="field.help" :locale="locale" />
    </div>

    <div v-if="model.length > 0" class="flex flex-wrap gap-2">
      <Badge
        v-for="item in model"
        :key="item"
        class="flex max-w-full items-center gap-1 font-mono text-xs"
        variant="secondary"
      >
        <span class="truncate">{{ item }}</span>
        <button
          v-if="!disabled"
          class="hover:text-foreground shrink-0"
          type="button"
          @click="removeEntry(item)"
        >
          <CircleX class="size-3" />
        </button>
      </Badge>
    </div>
    <p v-else class="text-muted-foreground text-xs">
      {{ $t('preferences.runtimeConfig.field.stringListEmpty') }}
    </p>

    <div class="flex gap-2">
      <Input
        v-model="draft"
        :disabled="disabled"
        class="h-9 font-mono text-xs"
        :placeholder="
          $t('preferences.runtimeConfig.field.stringListPlaceholder')
        "
        @keyup.enter="addEntry"
      />
      <VbenButton
        :disabled="disabled || !draft.trim()"
        size="sm"
        variant="outline"
        @click="addEntry"
      >
        {{ $t('common.add') }}
      </VbenButton>
    </div>
  </div>
</template>
