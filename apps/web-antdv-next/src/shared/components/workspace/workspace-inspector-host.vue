<script lang="ts" setup>
import { Splitter, SplitterPanel } from 'antdv-next';

defineOptions({ name: 'WorkspaceInspectorHost' });

defineProps<{
  active: boolean;
  desktop: boolean;
}>();
const target = defineModel<HTMLElement | null>('target', { default: null });
const width = defineModel<number>('width', { default: 520 });

function onResizeEnd(sizes: number[]) {
  const next = sizes.at(-1);
  if (!next || next < 360 || next > 760) return;
  width.value = Math.round(next);
  localStorage.setItem('qp.workspace-inspector.width', String(width.value));
}

function setTarget(element: unknown) {
  target.value = element instanceof HTMLElement ? element : null;
}
</script>

<template>
  <div class="workspace-inspector-host" :data-open="active">
    <Splitter
      v-if="desktop"
      class="workspace-inspector-splitter"
      :data-open="active"
      @resize-end="onResizeEnd"
    >
      <SplitterPanel :min="active ? 520 : 0">
        <div class="workspace-inspector-main"><slot></slot></div>
      </SplitterPanel>
      <SplitterPanel
        :max="active ? 760 : 0"
        :min="active ? 360 : 0"
        :resizable="active"
        :size="active ? width : 0"
      >
        <div :ref="setTarget" class="workspace-inspector-target"></div>
      </SplitterPanel>
    </Splitter>
    <slot v-else></slot>
  </div>
</template>

<style scoped>
.workspace-inspector-host,
.workspace-inspector-main,
.workspace-inspector-splitter,
.workspace-inspector-target {
  min-width: 0;
  min-height: 0;
}

.workspace-inspector-host {
  width: 100%;
}

.workspace-inspector-splitter {
  overflow: hidden;
  background: transparent;
  border: 0;
  border-radius: 0;
}

.workspace-inspector-splitter[data-open='true'] {
  background: hsl(var(--qp-surface-canvas));
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-lg);
}

.workspace-inspector-splitter[data-open='false'] :deep(.ant-splitter-bar) {
  visibility: hidden;
}

.workspace-inspector-main {
  height: 100%;
  padding: 1px;
  overflow: auto;
}

.workspace-inspector-target {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: hsl(var(--qp-surface-glass) / 94%);
  backdrop-filter: blur(18px);
}
</style>
