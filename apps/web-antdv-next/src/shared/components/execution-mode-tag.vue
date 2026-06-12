<script lang="ts" setup>
import type { ExecutionMode } from '@vben/types';

import { computed } from 'vue';

import { Tag } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'ExecutionModeTag' });

const props = defineProps<{
  mode: ExecutionMode | undefined;
}>();

/** Tag color per execution mode: dry_run grey, paper blue, live red. */
const MODE_COLOR: Record<ExecutionMode, string> = {
  dry_run: 'default',
  live: 'error',
  paper: 'processing',
};

const color = computed(() => (props.mode ? MODE_COLOR[props.mode] : 'default'));
const label = computed(() =>
  props.mode ? $t(`enum.executionMode.${props.mode}`) : '—',
);
</script>

<template>
  <Tag :color="color">{{ label }}</Tag>
</template>
