<script lang="ts" setup>
import type { CSSProperties } from 'vue';

import type { InspectorDrawerApi } from './use-workspace-overlay';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { ConfigProvider, Skeleton } from 'antdv-next';
import { AnimatePresence, motion } from 'motion-v';

import { $t } from '#/locales';

import { OVERLAY_EXIT_S, useWorkspaceOverlay } from './use-workspace-overlay';
import { provideWorkspaceChromeActions } from './workspace-chrome';
import { resolveInspectorPanelWidth } from './workspace-inspector-width';

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
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const openModel = defineModel<boolean>('open', { default: false });
const {
  close,
  layerMounted,
  open,
  popupContainer,
  quietMotion,
  setPanelRef,
  workspaceDomain,
} = useWorkspaceOverlay({
  drawerApi: props.drawerApi,
  emitClose: () => emit('close'),
  openModel,
  surface: 'inspector',
});

const panelWidth = computed(() =>
  resolveInspectorPanelWidth(props.width, readStoredWidth()),
);
const panelStyle = computed(
  (): CSSProperties =>
    ({
      '--workspace-inspector-width': panelWidth.value,
    }) as CSSProperties,
);
const maskTransition = computed(() => ({
  duration: quietMotion.value ? 0 : OVERLAY_EXIT_S.inspector,
}));
const panelMotion = computed(() => ({
  duration: quietMotion.value ? 0 : OVERLAY_EXIT_S.inspector,
  ease: [...EASE_OUT],
}));

const actionsHost = ref<HTMLElement | null>(null);
provideWorkspaceChromeActions(actionsHost);

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
</script>

<template>
  <Teleport to="body">
    <div
      v-if="layerMounted"
      class="workspace-inspector-layer"
      :data-domain="workspaceDomain"
      :data-open="open ? 'true' : undefined"
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
                <h2 class="workspace-inspector-title">{{ title }}</h2>
                <div ref="actionsHost" class="workspace-inspector-actions">
                  <slot name="actions"></slot>
                </div>
                <button
                  :aria-label="$t('page.common.close')"
                  class="workspace-inspector-close"
                  type="button"
                  @click="close"
                >
                  <IconifyIcon icon="lucide:x" />
                </button>
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

.workspace-inspector-layer[data-open='true'] .workspace-inspector-mask,
.workspace-inspector-layer[data-open='true'] .workspace-inspector-surface {
  pointer-events: auto;
}

.workspace-inspector-mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  cursor: pointer;
  background: hsl(var(--qp-surface-sunken) / 48%);
}

.workspace-inspector-surface {
  position: absolute;
  top: calc(var(--vben-header-height, 48px) + var(--qp-inspector-inset));
  right: var(--qp-inspector-inset);
  bottom: max(var(--qp-inspector-inset), env(safe-area-inset-bottom, 0px));
  z-index: var(--qp-layer-raised);
  display: flex;
  flex-direction: column;
  width: min(
    var(--workspace-inspector-width, 520px),
    calc(100% - 2 * var(--qp-inspector-inset))
  );
  min-width: min(360px, calc(100% - 2 * var(--qp-inspector-inset)));
  color: hsl(var(--qp-text-primary));
  pointer-events: none;
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
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: inherit;
}

.workspace-inspector-surface :deep(.ant-select-dropdown),
.workspace-inspector-surface :deep(.ant-dropdown),
.workspace-inspector-surface :deep(.ant-picker-dropdown),
.workspace-inspector-surface :deep(.ant-tooltip),
.workspace-inspector-surface :deep(.ant-popover) {
  height: auto;
  max-height: min(20rem, 70%);
  background: hsl(var(--qp-surface-glass) / 96%);
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
  box-shadow: var(--qp-shadow-medium);
}

.workspace-inspector-toolbar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 12px 14px;
  background: hsl(var(--qp-surface-raised));
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.workspace-inspector-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 720;
  line-height: 1.3;
  color: hsl(var(--qp-text-primary));
  white-space: nowrap;
}

.workspace-inspector-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  max-width: 100%;
}

.workspace-inspector-actions:empty {
  display: none;
}

.workspace-inspector-close {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  color: hsl(var(--qp-text-muted));
  cursor: pointer;
  background: hsl(var(--qp-surface-overlay));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.workspace-inspector-close:hover,
.workspace-inspector-close:focus-visible {
  color: hsl(var(--qp-text-primary));
  outline: none;
  background: hsl(var(--qp-surface-sunken));
  border-color: hsl(var(--qp-border-active));
  box-shadow: var(--qp-shadow-focus);
}

.workspace-inspector-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: var(--qp-density-card-padding);
  container-type: inline-size;
  overflow: clip auto;
}

.workspace-inspector-content > :deep(*) {
  min-width: 0;
  max-width: 100%;
}

.workspace-inspector-content :deep(.ant-spin-nested-loading),
.workspace-inspector-content :deep(.ant-spin-container) {
  min-width: 0;
  max-width: 100%;
}

.workspace-inspector-content :deep(.ant-table-wrapper),
.workspace-inspector-content :deep(.ant-descriptions-view) {
  max-width: 100%;
  overflow-x: auto;
}

@container (max-width: 40rem) {
  .workspace-inspector-content :deep([class*='grid-cols-6']),
  .workspace-inspector-content :deep([class*='grid-cols-3']) {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .workspace-inspector-content {
    padding: 10px;
  }
}
</style>
