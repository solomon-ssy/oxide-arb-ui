<script lang="ts" setup>
import type { PanelTone } from '#/shared/components/dashboard-accent';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  DASHBOARD_SURFACE,
  panelToneStyle,
} from '#/shared/components/dashboard-accent';

defineOptions({ name: 'DashboardPanel' });

const props = withDefaults(
  defineProps<{
    /** Stretch panel to fill the grid cell height. */
    fill?: boolean;
    /** Extra vertical gap between header and body (`sm` | `md`). */
    gap?: 'md' | 'sm';
    /** Optional header icon (Iconify name). */
    icon?: string;
    title: string;
    /** Optional title / icon typography tint (background stays neutral). */
    tone?: PanelTone;
  }>(),
  {
    gap: 'md',
    icon: undefined,
    fill: false,
    tone: undefined,
  },
);

const surface = DASHBOARD_SURFACE;

const headerTone = computed(() =>
  props.tone ? panelToneStyle(props.tone) : null,
);

const titleClass = computed(
  () => headerTone.value?.titleText ?? surface.titleText,
);
const iconBgClass = computed(() => headerTone.value?.iconBg ?? surface.iconBg);
const iconTextClass = computed(
  () => headerTone.value?.iconText ?? surface.iconText,
);

const gapClass = computed(() => (props.gap === 'sm' ? 'gap-2' : 'gap-3'));
</script>

<template>
  <div
    :class="[surface.border, fill ? 'h-full' : '']"
    class="bg-card flex flex-col rounded-lg border p-4"
  >
    <div :class="gapClass" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2.5">
          <div
            v-if="icon"
            :class="[iconBgClass, iconTextClass]"
            class="flex size-8 shrink-0 items-center justify-center rounded-md"
          >
            <IconifyIcon :icon="icon" class="size-4" />
          </div>
          <span :class="titleClass" class="truncate text-sm font-semibold">
            {{ title }}
          </span>
        </div>
        <div v-if="$slots.extra" :class="surface.extraLink" class="shrink-0">
          <slot name="extra"></slot>
        </div>
      </div>
      <div class="relative min-h-0 flex-1">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
