<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { computed } from 'vue';

import { Mode } from 'vanilla-jsoneditor';

import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

const props = defineProps<{
  disabled?: boolean;
  field: RuntimeConfigSchemaFieldView;
}>();

const model = defineModel<unknown>({ required: true });

/** Table mode suits homogeneous arrays; tree mode for nested objects. */
const editorMode = computed(() => {
  if (props.field.value_type === 'object') {
    return Mode.tree;
  }
  if (
    props.field.value_type === 'array' &&
    (props.field.array_item_type === 'integer' ||
      props.field.array_item_type === 'string')
  ) {
    return Mode.table;
  }
  return Mode.tree;
});
</script>

<template>
  <JsonEditorShell
    v-model="model"
    :mode="editorMode"
    :read-only="disabled"
    variant="field"
  />
</template>
