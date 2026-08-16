<script lang="ts" setup>
import type { DecimalSign } from '#/shared/components/format';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { VbenCountToAnimator } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Skeleton, Tooltip } from 'antdv-next';

import { EMPTY_PLACEHOLDER } from '#/shared/components/format';
import SignedValue from '#/shared/components/signed-value.vue';

defineOptions({ name: 'KpiCard' });

const props = withDefaults(
  defineProps<{
    accent?: KpiAccent;
    decimals?: number;
    delay?: number;
    duration?: number;
    endVal?: null | number;
    featured?: boolean;
    icon?: string;
    loading?: boolean;
    prefix?: string;
    sign?: DecimalSign | null;
    suffix?: string;
    title: string;
    tooltip?: string;
    value?: string;
  }>(),
  {
    accent: 'sky',
    decimals: 0,
    delay: 0,
    duration: 800,
    endVal: null,
    featured: false,
    icon: undefined,
    loading: false,
    prefix: '',
    sign: null,
    suffix: '',
    tooltip: undefined,
    value: undefined,
  },
);

export type KpiAccent = 'amber' | 'emerald' | 'sky' | 'violet';

const hasNumericValue = computed(
  () => props.endVal !== null && props.endVal !== undefined,
);
const deterministic =
  document.documentElement.dataset.uiDeterministic === 'true';
const animateFirstArrival = ref(false);
let hasAnimatedRealValue = false;
let animationTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.endVal,
  (value) => {
    if (value === null || value === undefined || hasAnimatedRealValue) {
      animateFirstArrival.value = false;
      return;
    }
    hasAnimatedRealValue = true;
    if (deterministic || props.duration <= 0) return;
    animateFirstArrival.value = true;
    animationTimer = setTimeout(() => {
      animateFirstArrival.value = false;
      animationTimer = undefined;
    }, props.duration + props.delay);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (animationTimer) clearTimeout(animationTimer);
});
</script>

<template>
  <article
    :data-accent="accent"
    :data-featured="featured ? 'true' : undefined"
    class="kpi-card"
  >
    <header class="kpi-header">
      <div class="kpi-title">
        <span class="truncate">{{ title }}</span>
        <Tooltip v-if="tooltip" :title="tooltip">
          <IconifyIcon
            class="size-3.5 shrink-0 cursor-help"
            icon="lucide:info"
          />
        </Tooltip>
      </div>
      <span v-if="icon" class="kpi-icon" aria-hidden="true">
        <IconifyIcon :icon="icon" />
      </span>
    </header>

    <Skeleton
      v-if="loading"
      :paragraph="false"
      :title="{ width: '60%' }"
      active
    />
    <div v-else class="kpi-value">
      <slot name="value">
        <SignedValue v-if="value !== undefined" :sign="sign" :value="value" />
        <VbenCountToAnimator
          v-else-if="hasNumericValue"
          :decimals="decimals"
          :duration="animateFirstArrival ? duration : 0"
          :end-val="endVal!"
          :prefix="prefix"
          :start-val="animateFirstArrival ? 0 : endVal!"
          :suffix="suffix"
        />
        <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
      </slot>
    </div>

    <footer v-if="$slots.footer" class="kpi-footer">
      <slot name="footer"></slot>
    </footer>
  </article>
</template>

<style scoped>
.kpi-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 124px;
  padding: var(--qp-density-card-padding);
  background: hsl(var(--qp-surface-raised));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-lg);
  isolation: isolate;
}

.kpi-card[data-featured='true'] {
  background:
    linear-gradient(
        hsl(var(--qp-surface-raised)),
        hsl(var(--qp-surface-raised))
      )
      padding-box,
    var(--qp-gradient-brand) border-box;
  border-color: transparent;
  box-shadow: var(--qp-shadow-featured);
}

.kpi-card[data-featured='true'] .kpi-value {
  color: transparent;
  background: var(--qp-gradient-brand);
  background-clip: text;
}

.kpi-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.kpi-title {
  display: flex;
  gap: 5px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
  font-weight: 650;
  color: hsl(var(--qp-text-secondary));
}

.kpi-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 30px;
  height: 30px;
  color: hsl(var(--kpi-accent));
  background: hsl(var(--kpi-accent) / 12%);
  border-radius: var(--qp-radius-md);
}

.kpi-value {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 24px;
  font-weight: 720;
  font-variant-numeric: tabular-nums;
  color: hsl(var(--kpi-accent));
  letter-spacing: -0.035em;
}

.kpi-footer {
  margin-top: auto;
  font-size: 11px;
  line-height: 1.5;
  color: hsl(var(--qp-text-muted));
}

[data-accent='amber'] {
  --kpi-accent: var(--qp-status-warning);
}

[data-accent='emerald'] {
  --kpi-accent: var(--qp-status-success);
}

[data-accent='sky'] {
  --kpi-accent: var(--qp-accent-sky-ink);
}

[data-accent='violet'] {
  --kpi-accent: var(--qp-accent-research);
}
</style>
