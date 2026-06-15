<script setup lang="ts">
import type { UiText } from '@vben/types';

import { computed } from 'vue';

import { CircleHelp } from '@vben/icons';

import { VbenTooltip } from '@vben-core/shadcn-ui';

import { resolveUiTextLines } from '../ui-text';

const props = defineProps<{
  help: UiText;
  locale: string;
}>();

const lines = computed(() => resolveUiTextLines(props.help, props.locale));
</script>

<template>
  <VbenTooltip v-if="lines.length > 0" side="bottom">
    <template #trigger>
      <CircleHelp class="size-3.5 shrink-0 cursor-help" />
    </template>
    <p v-for="(line, index) in lines" :key="index">{{ line }}</p>
  </VbenTooltip>
</template>
