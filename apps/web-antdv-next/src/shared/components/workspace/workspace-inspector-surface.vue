<script lang="ts" setup>
import type { ComponentPublicInstance, Ref } from 'vue';

import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Drawer, Skeleton } from 'antdv-next';
import { AnimatePresence, motion, useReducedMotion } from 'motion-v';

import { $t } from '#/locales';

import { WORKSPACE_INSPECTOR_HOST_KEY } from './workspace-inspector-host.types';

defineOptions({ name: 'WorkspaceInspectorSurface' });

const props = withDefaults(
  defineProps<{
    drawerApi?: InspectorDrawerApi;
    loading?: boolean;
    testId?: string;
    title: string;
  }>(),
  {
    drawerApi: undefined,
    loading: false,
    testId: undefined,
  },
);

const emit = defineEmits<{ close: [] }>();

interface DrawerState {
  isOpen?: boolean;
}

interface InspectorDrawerApi {
  close: () => void;
  useStore: <T = DrawerState>(
    selector?: (state: DrawerState) => T,
  ) => Readonly<Ref<T>>;
}

const openModel = defineModel<boolean>('open', { default: false });

const host =
  inject(WORKSPACE_INSPECTOR_HOST_KEY) ??
  (() => {
    throw new Error(
      'WorkspaceInspectorSurface requires WorkspaceInspectorHost',
    );
  })();

const drawerState = props.drawerApi?.useStore();
const reducedMotion = useReducedMotion();
const panel = ref<HTMLElement | null>(null);
const surfaceId = useId();
const open = computed(() =>
  props.drawerApi ? Boolean(drawerState?.value.isOpen) : openModel.value,
);
const active = computed(() => host.activeId.value === surfaceId);
const desktopTarget = computed(
  () => host.desktop.value && active.value && host.target.value !== null,
);
let deactivateTimer: ReturnType<typeof setTimeout> | undefined;
let restoreFocus: HTMLElement | null = null;

function focusAfterClose() {
  const original =
    restoreFocus?.isConnected && restoreFocus !== document.body
      ? restoreFocus
      : null;
  const fallback =
    document.querySelector<HTMLElement>(
      '.workspace-tabs [role="tab"][aria-selected="true"]',
    ) ?? document.querySelector<HTMLElement>('.workspace-hero h1');
  (original ?? fallback)?.focus();
  restoreFocus = null;
}

function close() {
  if (props.drawerApi) {
    props.drawerApi.close();
  } else {
    openModel.value = false;
  }
  emit('close');
}

function setPanelRef(value: ComponentPublicInstance | Element | null) {
  const element = value instanceof Element ? value : value?.$el;
  panel.value = element instanceof HTMLElement ? element : null;
}

function deactivateAfterExit() {
  if (deactivateTimer) clearTimeout(deactivateTimer);
  const delay = reducedMotion.value ? 0 : 180;
  deactivateTimer = setTimeout(() => {
    host.deactivate(surfaceId);
    deactivateTimer = undefined;
  }, delay);
}

watch(
  open,
  async (visible) => {
    if (!visible) {
      deactivateAfterExit();
      await nextTick();
      focusAfterClose();
      return;
    }

    if (deactivateTimer) {
      clearTimeout(deactivateTimer);
      deactivateTimer = undefined;
    }
    restoreFocus = document.activeElement as HTMLElement | null;
    host.activate(surfaceId, close);
    if (!host.desktop.value) return;
    await nextTick();
    await nextTick();
    panel.value?.focus();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (deactivateTimer) clearTimeout(deactivateTimer);
  host.deactivate(surfaceId);
  focusAfterClose();
});
</script>

<template>
  <Teleport v-if="desktopTarget" :to="host.target.value!">
    <AnimatePresence :initial="false">
      <motion.aside
        v-if="open"
        :ref="setPanelRef"
        :aria-label="title"
        :animate="
          reducedMotion ? undefined : { opacity: 1, transform: 'translateX(0)' }
        "
        class="workspace-inspector-surface"
        :data-testid="testId"
        :exit="
          reducedMotion
            ? undefined
            : { opacity: 0, transform: 'translateX(8px)' }
        "
        :initial="
          reducedMotion ? false : { opacity: 0, transform: 'translateX(8px)' }
        "
        tabindex="-1"
        :transition="{ duration: reducedMotion ? 0 : 0.18 }"
      >
        <header class="workspace-inspector-toolbar">
          <span class="workspace-inspector-title">
            <IconifyIcon aria-hidden="true" icon="lucide:panel-right" />
            {{ title }}
          </span>
          <Button
            :aria-label="$t('page.common.close')"
            shape="circle"
            type="text"
            @click="close"
          >
            <IconifyIcon icon="lucide:x" />
          </Button>
        </header>
        <div class="workspace-inspector-content">
          <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
          <slot v-else></slot>
        </div>
      </motion.aside>
    </AnimatePresence>
  </Teleport>

  <Drawer
    auto-focus
    class="workspace-inspector-drawer"
    :keyboard="true"
    :mask-closable="true"
    v-else-if="!host.desktop.value"
    :open="open"
    placement="right"
    size="min(100vw, 720px)"
    :data-testid="testId"
    :title="title"
    @close="close"
  >
    <div class="workspace-inspector-content">
      <Skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
      <slot v-else></slot>
    </div>
  </Drawer>
</template>

<style scoped>
.workspace-inspector-surface {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: hsl(var(--qp-text-primary));
  outline: none;
  background: hsl(var(--qp-surface-glass) / 94%);
}

.workspace-inspector-surface::before {
  position: absolute;
  inset: 0 0 auto;
  z-index: var(--qp-layer-raised);
  height: 2px;
  pointer-events: none;
  content: '';
  background: var(--workspace-gradient, var(--qp-gradient-brand));
  box-shadow: var(--qp-shadow-inspector);
}

.workspace-inspector-toolbar {
  display: flex;
  flex: none;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 12px;
  font-weight: 720;
  color: hsl(var(--qp-text-secondary));
  background:
    linear-gradient(
      90deg,
      hsl(var(--workspace-accent, var(--qp-accent-violet)) / 10%),
      transparent 72%
    ),
    hsl(var(--qp-surface-glass) / 92%);
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.workspace-inspector-title {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.workspace-inspector-title svg {
  color: hsl(var(--workspace-accent, var(--qp-accent-violet)));
}

.workspace-inspector-content {
  flex: 1;
  min-height: 0;
  padding: var(--qp-density-card-padding);
  overflow-y: auto;
}

:global(.workspace-inspector-drawer .ant-drawer-content),
:global(.workspace-inspector-drawer .ant-drawer-wrapper-body),
:global(.workspace-inspector-drawer .ant-drawer-body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:global(.workspace-inspector-drawer .ant-drawer-body) {
  padding: 0;
  overflow: hidden;
}

:global(.workspace-inspector-drawer .workspace-inspector-content) {
  width: 100%;
}

@media (max-width: 640px) {
  .workspace-inspector-content {
    padding: 10px;
  }

  :global(.workspace-inspector-drawer .ant-drawer-header) {
    padding: 12px;
  }
}
</style>
