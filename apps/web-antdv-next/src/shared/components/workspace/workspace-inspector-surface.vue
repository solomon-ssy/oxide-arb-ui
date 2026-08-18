<script lang="ts" setup>
import type { ComponentPublicInstance, CSSProperties, Ref } from 'vue';

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

import { useEventListener } from '@vueuse/core';
import { Button, ConfigProvider, Skeleton } from 'antdv-next';
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
    width?: number | string;
  }>(),
  {
    drawerApi: undefined,
    loading: false,
    testId: undefined,
    width: undefined,
  },
);
const emit = defineEmits<{ close: [] }>();
const DEFAULT_WIDTH_PX = 520;
const MIN_STORED_WIDTH = 360;
const MAX_STORED_WIDTH = 760;
const EXIT_MS = 750;
const MOTION_SLOW = 0.75;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

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

const host = inject(WORKSPACE_INSPECTOR_HOST_KEY, null);
const drawerState = props.drawerApi?.useStore();
const reducedMotion = useReducedMotion();
const panel = ref<HTMLElement | null>(null);
const layerMounted = ref(false);
const workspaceDomain = ref<string | undefined>();
const surfaceId = useId();
const open = computed(() =>
  props.drawerApi ? Boolean(drawerState?.value.isOpen) : openModel.value,
);
const quietMotion = computed(
  () =>
    Boolean(reducedMotion.value) ||
    document.documentElement.dataset.uiDeterministic === 'true',
);
const panelWidth = computed(() => {
  if (typeof props.width === 'number') {
    return `${props.width}px`;
  }
  if (typeof props.width === 'string') {
    return props.width;
  }
  return `${readStoredWidth()}px`;
});
const panelStyle = computed(
  (): CSSProperties =>
    ({
      '--workspace-inspector-width': panelWidth.value,
    }) as CSSProperties,
);
const maskTransition = computed(() => ({
  duration: quietMotion.value ? 0 : MOTION_SLOW,
}));
const panelMotion = computed(() => ({
  duration: quietMotion.value ? 0 : MOTION_SLOW,
  ease: [...EASE_OUT],
}));
let deactivateTimer: ReturnType<typeof setTimeout> | undefined;
let restoreFocus: HTMLElement | null = null;

function readStoredWidth(): number {
  const saved = Number(localStorage.getItem('qp.workspace-inspector.width'));
  if (
    Number.isFinite(saved) &&
    saved >= MIN_STORED_WIDTH &&
    saved <= MAX_STORED_WIDTH
  ) {
    return saved;
  }
  return DEFAULT_WIDTH_PX;
}

function syncWorkspaceDomain() {
  workspaceDomain.value =
    document.querySelector<HTMLElement>('.workspace-shell')?.dataset.domain;
}

function popupContainer(trigger?: HTMLElement) {
  return panel.value ?? trigger?.parentElement ?? document.body;
}

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
  const delay = quietMotion.value ? 0 : EXIT_MS;
  deactivateTimer = setTimeout(() => {
    host?.deactivate(surfaceId);
    layerMounted.value = false;
    deactivateTimer = undefined;
  }, delay);
}

function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !open.value) return;
  event.preventDefault();
  close();
}

watch(
  open,
  async (visible, wasOpen) => {
    if (!visible) {
      if (wasOpen) {
        deactivateAfterExit();
        await nextTick();
        focusAfterClose();
      }
      return;
    }

    if (deactivateTimer) {
      clearTimeout(deactivateTimer);
      deactivateTimer = undefined;
    }
    restoreFocus = document.activeElement as HTMLElement | null;
    layerMounted.value = true;
    syncWorkspaceDomain();
    host?.activate(surfaceId, close);
    await nextTick();
    await nextTick();
    panel.value?.focus();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (deactivateTimer) clearTimeout(deactivateTimer);
  host?.deactivate(surfaceId);
  if (restoreFocus) {
    focusAfterClose();
  }
});

useEventListener(window, 'keydown', onEscape);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="layerMounted"
      class="workspace-inspector-layer"
      :data-domain="workspaceDomain"
    >
      <AnimatePresence :initial="false">
        <motion.div
          v-if="open"
          key="mask"
          :animate="quietMotion ? undefined : { opacity: 1 }"
          class="workspace-inspector-mask"
          :exit="quietMotion ? undefined : { opacity: 0 }"
          :initial="quietMotion ? false : { opacity: 0 }"
          :transition="maskTransition"
          @click="close"
        />
        <motion.aside
          v-if="open"
          key="panel"
          :ref="setPanelRef"
          :animate="
            quietMotion ? undefined : { opacity: 1, transform: 'translateX(0)' }
          "
          aria-modal="true"
          :aria-label="title"
          class="workspace-inspector-surface"
          :data-testid="testId"
          :exit="
            quietMotion
              ? undefined
              : { opacity: 0, transform: 'translateX(16px)' }
          "
          :initial="
            quietMotion ? false : { opacity: 0, transform: 'translateX(16px)' }
          "
          role="dialog"
          :style="panelStyle"
          tabindex="-1"
          :transition="panelMotion"
        >
          <ConfigProvider :get-popup-container="popupContainer">
            <div class="workspace-inspector-frame">
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
            </div>
          </ConfigProvider>
        </motion.aside>
      </AnimatePresence>
    </div>
  </Teleport>
</template>

<style scoped>
.workspace-inspector-layer {
  position: fixed;
  inset: 0;
  z-index: var(--qp-layer-overlay);
  pointer-events: none;
}

.workspace-inspector-layer[data-domain='trading'] {
  --workspace-accent: var(--qp-accent-sky);
  --qp-gradient-hairline: linear-gradient(
    90deg,
    hsl(var(--qp-accent-sky)),
    hsl(var(--qp-accent-violet)) 64%,
    hsl(var(--qp-accent-pink))
  );
}

.workspace-inspector-layer[data-domain='execution'] {
  --workspace-accent: var(--qp-accent-orange);
  --qp-gradient-hairline: linear-gradient(
    90deg,
    hsl(var(--qp-accent-violet)),
    hsl(var(--qp-accent-pink)) 58%,
    hsl(var(--qp-accent-orange))
  );
}

.workspace-inspector-layer[data-domain='research'] {
  --workspace-accent: var(--qp-accent-pink);
  --qp-gradient-hairline: linear-gradient(
    90deg,
    hsl(var(--qp-accent-violet)),
    hsl(var(--qp-accent-pink))
  );
}

.workspace-inspector-layer[data-domain='governance'] {
  --workspace-accent: var(--qp-accent-violet);
  --qp-gradient-hairline: linear-gradient(
    90deg,
    hsl(var(--qp-accent-sky)),
    hsl(var(--qp-accent-violet))
  );
}

.workspace-inspector-mask {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  cursor: pointer;
  background: hsl(var(--qp-surface-sunken) / 48%);
}

.workspace-inspector-surface {
  position: absolute;
  top: 0;
  right: var(--qp-inspector-inset);
  bottom: 0;
  z-index: var(--qp-layer-raised);
  display: flex;
  flex-direction: column;
  width: min(
    var(--workspace-inspector-width, 520px),
    calc(100% - 2 * var(--qp-inspector-inset))
  );
  overflow: hidden;
  color: hsl(var(--qp-text-primary));
  pointer-events: auto;
  outline: none;
  background:
    linear-gradient(
        hsl(var(--qp-surface-glass) / 94%),
        hsl(var(--qp-surface-glass) / 94%)
      )
      padding-box,
    var(--qp-gradient-hairline) border-box;
  border: 2px solid transparent;
  border-radius: var(--qp-radius-lg);
  box-shadow: var(--qp-shadow-medium);
}

.workspace-inspector-frame {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.workspace-inspector-surface > :deep(*) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
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

@media (max-width: 640px) {
  .workspace-inspector-content {
    padding: 10px;
  }
}
</style>
