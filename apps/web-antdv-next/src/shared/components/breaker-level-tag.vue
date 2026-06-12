<script lang="ts" setup>
import type { CircuitBreakerLevel } from '@vben/types';

import { computed } from 'vue';

import { Tag } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'BreakerLevelTag' });

const props = defineProps<{
  level: CircuitBreakerLevel | null | undefined;
}>();

/** Escalation tier → ant Tag preset (trade mildest, system most severe). */
const LEVEL_COLOR: Record<CircuitBreakerLevel, string> = {
  daily: 'error',
  session: 'volcano',
  system: 'magenta',
  trade: 'warning',
};

const color = computed(() =>
  props.level ? LEVEL_COLOR[props.level] : 'default',
);

const label = computed(() =>
  props.level ? $t(`enum.circuitBreakerLevel.${props.level}`) : '—',
);
</script>

<template>
  <Tag :color="color">{{ label }}</Tag>
</template>
