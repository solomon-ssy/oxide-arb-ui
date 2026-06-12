<script lang="ts" setup>
import type { KpiAccent } from '#/shared/components/dashboard-accent';
import type { DecimalSign } from '#/shared/components/format';

import { computed } from 'vue';

import { VbenCountToAnimator } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Skeleton, Tooltip } from 'antdv-next';

import { kpiAccentStyle } from '#/shared/components/dashboard-accent';
import { EMPTY_PLACEHOLDER } from '#/shared/components/format';

defineOptions({ name: 'KpiStatCard' });

const props = withDefaults(
  defineProps<{
    accent: KpiAccent;
    decimals?: number;
    duration?: number;
    endVal?: null | number;
    icon: string;
    loading?: boolean;
    prefix?: string;
    /** Sign drives PnL value coloring: positive emerald, negative rose. */
    sign?: DecimalSign | null;
    title: string;
    tooltip?: string;
  }>(),
  {
    decimals: 0,
    duration: 1200,
    endVal: null,
    loading: false,
    prefix: '',
    sign: null,
    tooltip: undefined,
  },
);

const accentClass = computed(() => kpiAccentStyle(props.accent));

const valueColorClass = computed(() => {
  if (props.sign === 1) {
    return 'text-emerald-600 dark:text-emerald-400';
  }
  if (props.sign === -1) {
    return 'text-rose-600 dark:text-rose-400';
  }
  return accentClass.value.valueText;
});

const hasValue = computed(
  () => props.endVal !== null && props.endVal !== undefined,
);
</script>

<template>
  <div
    :class="[accentClass.border, accentClass.bg]"
    class="relative overflow-hidden rounded-lg border p-4"
  >
    <div
      :class="accentClass.gradient"
      class="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b"
    ></div>
    <div class="relative flex flex-col gap-3">
      <div class="flex items-start justify-between gap-3">
        <div
          :class="accentClass.titleText"
          class="flex min-w-0 items-center gap-1 text-sm font-medium"
        >
          <span class="truncate">{{ title }}</span>
          <Tooltip v-if="tooltip" :title="tooltip">
            <IconifyIcon
              class="size-3.5 shrink-0 cursor-help opacity-70"
              icon="lucide:info"
            />
          </Tooltip>
        </div>
        <div
          :class="[accentClass.iconBg, accentClass.iconText]"
          class="flex size-8 shrink-0 items-center justify-center rounded-md"
        >
          <IconifyIcon :icon="icon" class="size-4" />
        </div>
      </div>
      <Skeleton
        v-if="loading"
        :paragraph="false"
        :title="{ width: '60%' }"
        active
      />
      <div
        v-else
        :class="valueColorClass"
        class="font-mono text-2xl font-semibold tabular-nums tracking-tight"
      >
        <slot name="value">
          <VbenCountToAnimator
            v-if="hasValue"
            :decimals="decimals"
            :duration="duration"
            :end-val="endVal!"
            :prefix="prefix"
            :start-val="0"
          />
          <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
        </slot>
      </div>
      <div
        v-if="$slots.footer"
        :class="accentClass.footerText"
        class="text-xs leading-relaxed"
      >
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>
