<script lang="ts" setup>
import type { WorkspaceSurface } from './workspace-inspector-registry';

import { provide, readonly, ref, shallowReadonly } from 'vue';

import { WORKSPACE_INSPECTOR_HOST_KEY } from './workspace-inspector-host.types';

defineOptions({ name: 'WorkspaceInspectorHost' });

const stageTarget = ref<HTMLElement | null>(null);
const inspectorActiveId = ref<null | string>(null);
const stageOpen = ref(false);
let activeInspectorClose: (() => void) | undefined;

function activate(
  id: string,
  close: () => void,
  surface: WorkspaceSurface = 'inspector',
) {
  if (inspectorActiveId.value !== null && inspectorActiveId.value !== id) {
    activeInspectorClose?.();
  }
  inspectorActiveId.value = id;
  activeInspectorClose = close;
  stageOpen.value = surface === 'page';
}

function deactivate(id: string) {
  if (inspectorActiveId.value !== id) return;
  inspectorActiveId.value = null;
  activeInspectorClose = undefined;
  stageOpen.value = false;
}

function bindStageTarget(el: unknown) {
  stageTarget.value = el instanceof HTMLElement ? el : null;
}

provide(WORKSPACE_INSPECTOR_HOST_KEY, {
  activeId: readonly(inspectorActiveId),
  activate,
  deactivate,
  stageOpen: readonly(stageOpen),
  stageTarget: shallowReadonly(stageTarget),
});
</script>

<template>
  <div
    class="workspace-inspector-host"
    :class="{ 'is-object-stage': stageOpen }"
    :data-object-stage="stageOpen ? 'true' : 'false'"
  >
    <div class="workspace-module-pane" :aria-hidden="stageOpen">
      <slot></slot>
    </div>
    <div :ref="bindStageTarget" class="workspace-object-stage-host"></div>
  </div>
</template>

<style scoped>
.workspace-inspector-host {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.workspace-object-stage-host {
  display: none;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.workspace-module-pane {
  min-width: 0;
}

.workspace-inspector-host.is-object-stage {
  min-height: calc(100dvh - 220px);
}

.workspace-inspector-host.is-object-stage .workspace-object-stage-host {
  display: flex;
}

.workspace-inspector-host.is-object-stage .workspace-module-pane {
  display: none;
}
</style>
