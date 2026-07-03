<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { ref } from 'vue';

import { CircleX } from '@vben/icons';

import { Button, Input, Tag } from 'antdv-next';

import { $t } from '#/locales';

import RuntimeConfigFieldShell from './runtime-config-field-shell.vue';

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
  <RuntimeConfigFieldShell :field="field" :label="label" :locale="locale">
    <div v-if="model.length > 0" class="mb-3 flex flex-wrap gap-2">
      <Tag
        v-for="item in model"
        :key="item"
        class="flex max-w-full items-center gap-1 font-mono text-xs"
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
      </Tag>
    </div>
    <p v-else class="text-muted-foreground mb-3 text-xs">
      {{ $t('page.runtimeConfig.editor.field.stringListEmpty') }}
    </p>

    <div class="flex gap-2">
      <Input
        v-model:value="draft"
        :disabled="disabled"
        class="font-mono text-xs"
        :placeholder="
          $t('page.runtimeConfig.editor.field.stringListPlaceholder')
        "
        @press-enter="addEntry"
      />
      <Button :disabled="disabled || !draft.trim()" @click="addEntry">
        {{ $t('common.add') }}
      </Button>
    </div>
  </RuntimeConfigFieldShell>
</template>
