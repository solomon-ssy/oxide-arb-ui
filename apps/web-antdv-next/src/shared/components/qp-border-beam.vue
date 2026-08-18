<script lang="ts" setup>
import type { BorderBeamEmphasis, BorderBeamPalette } from './qp-border-beam';

import { computed } from 'vue';

import { usePreferredReducedMotion } from '@vueuse/core';
import { BorderBeam } from 'antdv-next';

import { BORDER_BEAM_PRESETS, BORDER_BEAM_STOPS } from './qp-border-beam';

defineOptions({ name: 'QpBorderBeam', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    emphasis?: BorderBeamEmphasis;
    palette?: BorderBeamPalette;
  }>(),
  {
    disabled: false,
    emphasis: 'featured',
    palette: 'brand',
  },
);

const reducedMotion = usePreferredReducedMotion();
const enabled = computed(() => {
  if (props.disabled) {
    return false;
  }
  if (document.documentElement.dataset.uiDeterministic === 'true') {
    return false;
  }
  return reducedMotion.value !== 'reduce';
});
const preset = computed(() => BORDER_BEAM_PRESETS[props.emphasis]);
</script>

<template>
  <BorderBeam
    v-if="enabled"
    :color="[...BORDER_BEAM_STOPS[palette]]"
    :duration="preset.duration"
    :line-width="1"
    :outset="0"
    :size="preset.size"
  >
    <slot></slot>
  </BorderBeam>
  <slot v-else></slot>
</template>
