<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { usePreferences } from '@vben/preferences';

import JsonEditorVue from 'json-editor-vue';
import { Mode } from 'vanilla-jsoneditor';

import 'vanilla-jsoneditor/themes/jse-theme-dark.css';

const props = withDefaults(
  defineProps<{
    mode?: Mode;
    modelValue: unknown;
    readOnly?: boolean;
  }>(),
  {
    mode: Mode.text,
    readOnly: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
}>();

const { isDark } = usePreferences();
const parseError = ref('');

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
  <div>
    <JsonEditorVue
      v-model="editorValue"
      :class="isDark ? 'jse-theme-dark' : ''"
      :main-menu-bar="!readOnly"
      :mode="mode"
      :read-only="readOnly"
      :status-bar="!readOnly"
    />
    <p v-if="parseError" class="mt-2 text-sm text-red-600">{{ parseError }}</p>
  </div>
</template>
