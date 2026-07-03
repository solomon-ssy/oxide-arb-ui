<script setup lang="ts">
import type { UiText } from '@vben/types';

import { computed } from 'vue';

import { CircleHelp } from '@vben/icons';

import { Tooltip } from 'antdv-next';

import { resolveUiTextLines } from '../ui-text';

const props = defineProps<{
  help: UiText;
  locale: string;
}>();

const lines = computed(() => resolveUiTextLines(props.help, props.locale));
</script>

<template>
  <Tooltip v-if="lines.length > 0" placement="bottom">
    <template #title>
      <p v-for="(line, index) in lines" :key="index">{{ line }}</p>
    </template>
    <CircleHelp class="size-3.5 shrink-0 cursor-help" />
  </Tooltip>
</template>
