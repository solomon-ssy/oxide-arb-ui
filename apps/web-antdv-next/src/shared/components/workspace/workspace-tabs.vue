<script lang="ts" setup>
import type { WorkspaceModule } from './workspace-shell.types';

import { computed, nextTick, onMounted, ref, useId, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

const props = defineProps<{
  label: string;
  modelValue?: string;
  modules: Pick<WorkspaceModule, 'icon' | 'key' | 'label'>[];
}>();
const emit = defineEmits<{ 'update:modelValue': [key: string] }>();
const id = useId();
const tablist = ref<HTMLDivElement>();
const focusedKey = ref(props.modelValue);
const selectedKey = computed(() => props.modelValue ?? props.modules[0]?.key);

function revealTab(key: string | undefined) {
  focusedKey.value = key;
  const button = tablist.value?.querySelector<HTMLButtonElement>(
    `#${CSS.escape(`${id}-tab-${key}`)}`,
  );
  button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function focusTab(event: KeyboardEvent, index: number) {
  let next: number;
  switch (event.key) {
    case 'ArrowLeft': {
      next = (index - 1 + props.modules.length) % props.modules.length;
      break;
    }
    case 'ArrowRight': {
      next = (index + 1) % props.modules.length;
      break;
    }
    case 'End': {
      next = props.modules.length - 1;
      break;
    }
    case 'Home': {
      next = 0;
      break;
    }
    default: {
      return;
    }
  }
  event.preventDefault();
  const key = props.modules[next]?.key;
  if (!key) return;
  focusedKey.value = key;
  tablist.value?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
}

watch(selectedKey, async (key) => {
  focusedKey.value = key;
  await nextTick();
  revealTab(key);
});
onMounted(() => revealTab(selectedKey.value));
</script>

<template>
  <div class="workspace-module-tabs">
    <div
      ref="tablist"
      :aria-label="label"
      aria-orientation="horizontal"
      class="workspace-tabs"
      role="tablist"
    >
      <button
        v-for="(item, index) in modules"
        :id="`${id}-tab-${item.key}`"
        :key="item.key"
        :aria-controls="`${id}-panel-${item.key}`"
        :aria-selected="selectedKey === item.key"
        class="workspace-tab"
        role="tab"
        :tabindex="(focusedKey ?? selectedKey) === item.key ? 0 : -1"
        type="button"
        @click="emit('update:modelValue', item.key)"
        @focus="revealTab(item.key)"
        @keydown="focusTab($event, index)"
      >
        <IconifyIcon aria-hidden="true" :icon="item.icon" />
        {{ $t(item.label) }}
      </button>
    </div>
    <div
      v-for="item in modules"
      :id="`${id}-panel-${item.key}`"
      :key="item.key"
      :aria-labelledby="`${id}-tab-${item.key}`"
      class="workspace-tab-panel"
      :hidden="selectedKey !== item.key"
      role="tabpanel"
      tabindex="0"
    >
      <slot v-if="selectedKey === item.key"></slot>
    </div>
  </div>
</template>

<style scoped>
.workspace-module-tabs {
  min-width: 0;
}

.workspace-tabs {
  display: flex;
  gap: 32px;
  width: 100%;
  min-width: 0;
  padding: 2px 2px 0;
  margin-bottom: 16px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: thin;
  border-bottom: 1px solid hsl(var(--border));
}

.workspace-tab {
  position: relative;
  display: inline-flex;
  flex: none;
  gap: 7px;
  align-items: center;
  padding: 12px 0;
  font-size: 14px;
  line-height: 22px;
  color: hsl(var(--qp-text-secondary));
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.workspace-tab[aria-selected='true'] {
  color: hsl(var(--qp-text-primary));
}

.workspace-tab[aria-selected='true']::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  content: '';
  background: var(--workspace-gradient);
  box-shadow: var(--qp-shadow-workspace);
}

.workspace-tab-panel {
  min-width: 0;
}

.workspace-tab:focus-visible,
.workspace-tab-panel:focus-visible {
  outline: 2px solid hsl(var(--workspace-accent));
  outline-offset: -2px;
  box-shadow: var(--qp-shadow-focus);
}

@media (max-width: 640px) {
  .workspace-tab svg {
    display: none;
  }
}
</style>
