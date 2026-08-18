<script lang="ts" setup>
import type { InspectorDrawerApi } from './use-workspace-overlay';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { ConfigProvider, Skeleton } from 'antdv-next';
import { AnimatePresence, motion } from 'motion-v';

import { $t } from '#/locales';

import { useWorkspaceOverlay } from './use-workspace-overlay';
import { provideWorkspaceChromeActions } from './workspace-chrome';

defineOptions({ name: 'WorkspaceObjectStage' });

const props = withDefaults(
  defineProps<{
    drawerApi?: InspectorDrawerApi;
    eyebrow?: string;
    loading?: boolean;
    title: string;
  }>(),
  {
    drawerApi: undefined,
    eyebrow: undefined,
    loading: false,
  },
);
const emit = defineEmits<{ close: [] }>();
const MOTION_SLOW = 0.28;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const openModel = defineModel<boolean>('open', { default: false });
const {
  close,
  open,
  popupContainer,
  quietMotion,
  setPanelRef,
  stageTarget,
  workspaceDomain,
} = useWorkspaceOverlay({
  drawerApi: props.drawerApi,
  emitClose: () => emit('close'),
  openModel,
  surface: 'page',
});

const panelMotion = computed(() => ({
  duration: quietMotion.value ? 0 : MOTION_SLOW,
  ease: [...EASE_OUT],
}));
const actionsHost = ref<HTMLElement | null>(null);
provideWorkspaceChromeActions(actionsHost);
</script>

<template>
  <Teleport :disabled="!stageTarget" :to="stageTarget ?? 'body'">
    <AnimatePresence :initial="false">
      <motion.section
        v-if="open"
        :ref="setPanelRef"
        :animate="quietMotion ? undefined : { opacity: 1, y: 0 }"
        :aria-label="title"
        class="workspace-object-stage"
        :data-domain="workspaceDomain"
        data-testid="workspace-object-stage"
        :exit="quietMotion ? undefined : { opacity: 0, y: 8 }"
        :initial="quietMotion ? false : { opacity: 0, y: 8 }"
        tabindex="-1"
        :transition="panelMotion"
      >
        <ConfigProvider :get-popup-container="popupContainer">
          <header class="workspace-object-stage-toolbar">
            <button
              class="workspace-object-stage-back"
              type="button"
              @click="close"
            >
              <IconifyIcon aria-hidden="true" icon="lucide:arrow-left" />
              <span>{{ $t('page.common.back') }}</span>
            </button>
            <div class="workspace-object-stage-identity">
              <span v-if="eyebrow" class="workspace-object-stage-eyebrow">
                {{ eyebrow }}
              </span>
              <h1 class="workspace-object-stage-heading">{{ title }}</h1>
            </div>
            <div ref="actionsHost" class="workspace-object-stage-actions">
              <slot name="actions"></slot>
            </div>
          </header>
          <div class="workspace-object-stage-content">
            <Skeleton v-if="loading" active :paragraph="{ rows: 10 }" />
            <slot v-else></slot>
          </div>
        </ConfigProvider>
      </motion.section>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped>
.workspace-object-stage {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  color: hsl(var(--qp-text-primary));
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
  box-shadow: var(--qp-shadow-low);
}

.workspace-object-stage[data-domain='trading'] {
  --workspace-accent: var(--qp-accent-sky);
}

.workspace-object-stage[data-domain='execution'] {
  --workspace-accent: var(--qp-accent-orange);
}

.workspace-object-stage[data-domain='research'] {
  --workspace-accent: var(--qp-accent-pink);
}

.workspace-object-stage[data-domain='governance'] {
  --workspace-accent: var(--qp-accent-violet);
}

.workspace-object-stage > :deep(*) {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.workspace-object-stage-toolbar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  padding: 10px 16px;
  background: hsl(var(--qp-surface-raised));
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.workspace-object-stage-back {
  display: inline-flex;
  flex: none;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 650;
  color: hsl(var(--qp-text-secondary));
  cursor: pointer;
  background: hsl(var(--qp-surface-overlay));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-md);
}

.workspace-object-stage-back svg {
  color: hsl(var(--workspace-accent, var(--qp-accent-violet)));
}

.workspace-object-stage-back:hover,
.workspace-object-stage-back:focus-visible {
  color: hsl(var(--qp-text-primary));
  outline: none;
  background: hsl(var(--qp-surface-sunken));
  border-color: hsl(var(--qp-border-active));
  box-shadow: var(--qp-shadow-focus);
}

.workspace-object-stage-identity {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.workspace-object-stage-eyebrow {
  font-size: 10px;
  font-weight: 720;
  color: hsl(var(--qp-text-muted));
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.workspace-object-stage-heading {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 18px;
  font-weight: 720;
  line-height: 1.3;
  color: hsl(var(--qp-text-primary));
  white-space: nowrap;
}

.workspace-object-stage-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  max-width: 100%;
}

.workspace-object-stage-actions:empty {
  display: none;
}

.workspace-object-stage-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: var(--qp-density-card-padding);
  overflow: hidden auto;
}

.workspace-object-stage-content > :deep(*) {
  min-width: 0;
  max-width: 100%;
}

.workspace-object-stage-content :deep(.ant-table-wrapper),
.workspace-object-stage-content :deep(.ant-descriptions-view) {
  max-width: 100%;
  overflow-x: auto;
}
</style>
