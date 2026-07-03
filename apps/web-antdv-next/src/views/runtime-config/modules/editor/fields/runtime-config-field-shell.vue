<script setup lang="ts">
import type { RuntimeConfigSchemaFieldView } from '@vben/types';

import { Tag } from 'antdv-next';

import { $t } from '#/locales';

import RuntimeConfigFieldHelp from './runtime-config-field-help.vue';

defineProps<{
  critical?: boolean;
  field: RuntimeConfigSchemaFieldView;
  label: string;
  locale: string;
  sensitive?: boolean;
}>();
</script>

<template>
  <div class="runtime-config-field">
    <div class="runtime-config-field-label">
      <span class="text-foreground min-w-0 font-medium break-words">
        {{ label }}
      </span>
      <RuntimeConfigFieldHelp :help="field.help" :locale="locale" />
      <Tag v-if="sensitive" color="purple" class="m-0">
        {{ $t('page.runtimeConfig.editor.state.sensitive') }}
      </Tag>
      <Tag v-if="critical" color="warning" class="m-0">
        {{ $t('page.runtimeConfig.editor.state.governanceCritical') }}
      </Tag>
    </div>
    <slot></slot>
  </div>
</template>

<style scoped>
.runtime-config-field {
  padding: 0.625rem 0.75rem;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border) / 55%);
  border-radius: 0.5rem;
  transition: border-color 0.15s ease;
}

.runtime-config-field:focus-within {
  border-color: hsl(var(--primary) / 40%);
}

.runtime-config-field-label {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
</style>
