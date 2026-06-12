<script lang="ts" setup>
import type { BreakerStateName } from '@vben/types';

import { computed } from 'vue';

import { Tag } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'BreakerBadge' });

const props = defineProps<{
  state: BreakerStateName | undefined;
}>();

/** Tag color per circuit-breaker FSM state (mirrors the grid cell renderer). */
const BREAKER_COLOR: Record<BreakerStateName, string> = {
  closed: 'success',
  half_open: 'warning',
  halted: 'magenta',
  open: 'error',
  recovered: 'processing',
};

const color = computed(() =>
  props.state ? BREAKER_COLOR[props.state] : 'default',
);
const label = computed(() =>
  props.state ? $t(`enum.breakerState.${props.state}`) : '—',
);
</script>

<template>
  <Tag :color="color">{{ label }}</Tag>
</template>
