<script lang="ts" setup>
import { computed } from 'vue';

import { Progress } from 'antdv-next';

import { themeColors } from '#/shared/components/theme-color';

defineOptions({ name: 'InlineBar' });

const props = withDefaults(
  defineProps<{
    /** Zero-point for `mode="diverging"`. */
    center?: number;
    /** Accessible name — required, this component has no visible text label. */
    label: string;
    max: number;
    min?: number;
    /**
     * `linear`: single fill from `min` growing toward `value` (share-of-total
     * bars) — delegates to antdv `Progress` for theming/a11y.
     * `diverging`: fill grows outward from `center` toward `value`, colored by
     * sign (positive → success, negative → destructive) — for delta /
     * comparison cells. No antd primitive supports a bidirectional bar, so
     * this mode stays a purpose-built track.
     */
    mode?: 'diverging' | 'linear';
    tone?: 'destructive' | 'primary' | 'success' | 'warning';
    value: number;
  }>(),
  { center: 0, min: 0, mode: 'linear', tone: 'primary' },
);

const TONE_COLOR: Record<string, () => string> = {
  destructive: () => themeColors.destructive,
  primary: () => themeColors.primary,
  success: () => themeColors.success,
  warning: () => themeColors.warning,
};

const linearPercent = computed(() => {
  const span = props.max - props.min;
  if (span <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, ((props.value - props.min) / span) * 100));
});

const divergingStyle = computed(() => {
  const halfSpan =
    Math.max(
      Math.abs(props.min - props.center),
      Math.abs(props.max - props.center),
    ) || 1;
  const pct =
    Math.min(100, (Math.abs(props.value - props.center) / halfSpan) * 100) / 2;
  const isPositive = props.value >= props.center;
  return {
    left: isPositive ? '50%' : `${50 - pct}%`,
    width: `${pct}%`,
  };
});

const divergingTone = computed(() =>
  props.value >= props.center ? 'success' : 'destructive',
);
</script>

<template>
  <Progress
    v-if="mode === 'linear'"
    :aria-label="label"
    :percent="linearPercent"
    :show-info="false"
    size="small"
    :stroke-color="TONE_COLOR[tone]?.()"
    type="line"
  />
  <div
    v-else
    class="bg-muted relative h-2 w-full overflow-hidden rounded"
    role="progressbar"
    :aria-label="label"
    :aria-valuemax="max"
    :aria-valuemin="min"
    :aria-valuenow="value"
  >
    <div class="bg-border absolute inset-y-0 left-1/2 w-px"></div>
    <div
      class="absolute inset-y-0 rounded transition-all"
      :class="divergingTone === 'success' ? 'bg-success' : 'bg-destructive'"
      :style="divergingStyle"
    ></div>
  </div>
</template>
