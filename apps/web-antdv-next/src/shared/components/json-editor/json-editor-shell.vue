<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { usePreferences } from '@vben/preferences';

import JsonEditorVue from 'json-editor-vue';
import { Mode } from 'vanilla-jsoneditor';

import 'vanilla-jsoneditor/themes/jse-theme-dark.css';

/** Full-document editors vs compact embedded field editors. */
export type JsonEditorVariant = 'document' | 'field';

const props = withDefaults(
  defineProps<{
    /** CSS height for the editor surface (`.jse-main`). */
    height?: string;
    mode?: Mode;
    modelValue: unknown;
    readOnly?: boolean;
    variant?: JsonEditorVariant;
  }>(),
  {
    height: undefined,
    mode: Mode.tree,
    readOnly: false,
    variant: 'document',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();

const { isDark } = usePreferences();
const parseError = ref('');

const isField = computed(() => props.variant === 'field');

const resolvedHeight = computed(() => {
  if (props.height) {
    return props.height;
  }
  return isField.value ? '200px' : 'min(60vh, 640px)';
});

const editorValue = computed({
  get: () => props.modelValue,
  set: (value: unknown) => {
    parseError.value = '';
    emit('update:modelValue', value);
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (value === undefined) {
      parseError.value = 'JSON value is undefined';
    }
  },
);
</script>

<template>
  <div
    class="json-editor-shell"
    :class="{
      'json-editor-shell--field': isField,
      'json-editor-shell--document': !isField,
    }"
    :style="{ '--json-editor-height': resolvedHeight }"
  >
    <JsonEditorVue
      v-model="editorValue"
      :class="isDark ? 'jse-theme-dark' : ''"
      :main-menu-bar="!readOnly && !isField"
      :mode="mode"
      :navigation-bar="!isField"
      :read-only="readOnly"
      :status-bar="!readOnly && !isField"
    />
    <p v-if="parseError" class="text-destructive mt-2 text-sm">
      {{ parseError }}
    </p>
  </div>
</template>

<style scoped>
.json-editor-shell :deep(.jse-main) {
  height: var(--json-editor-height);
  min-height: var(--json-editor-height);
}

.json-editor-shell--field :deep(.jse-menu) {
  display: none;
}
</style>
