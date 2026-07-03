<script setup lang="ts">
import type { BorderBeamColor } from 'antdv-next';

import { BorderBeam } from 'antdv-next';

defineOptions({ name: 'RuntimeConfigSectionPanel' });

const props = defineProps<{
  active: boolean;
  beamColor: BorderBeamColor;
  panelId: string;
  sectionId: string;
}>();

const emit = defineEmits<{
  activate: [];
}>();

function onHeaderClick() {
  if (!props.active) {
    emit('activate');
  }
}

function onHeaderKeydown(event: KeyboardEvent) {
  if (props.active) {
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('activate');
  }
}
</script>

<template>
  <div
    class="runtime-config-section-panel"
    :class="{ 'is-active': active }"
    :data-section-id="sectionId"
  >
    <!-- Beam only on the active section; anchor overlays the card without remounting slot content. -->
    <BorderBeam v-if="active" :color="beamColor" :outset="0">
      <div
        class="runtime-config-section-panel__beam-anchor"
        aria-hidden="true"
      ></div>
    </BorderBeam>

    <div
      class="runtime-config-section-panel__header"
      :role="active ? undefined : 'button'"
      :aria-controls="panelId"
      :aria-expanded="active"
      :tabindex="active ? -1 : 0"
      @click="onHeaderClick"
      @keydown="onHeaderKeydown"
    >
      <div class="runtime-config-section-panel__header-main">
        <slot name="header"></slot>
      </div>
      <div class="runtime-config-section-panel__actions" @click.stop>
        <slot name="actions"></slot>
      </div>
    </div>
    <div
      :id="panelId"
      v-show="active"
      class="runtime-config-section-panel__body"
    >
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.runtime-config-section-panel {
  position: relative;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 80%);
  border-radius: 0.75rem;
}

.runtime-config-section-panel.is-active {
  border-color: hsl(var(--primary) / 25%);
}

.runtime-config-section-panel__beam-anchor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
}

.runtime-config-section-panel__header {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  cursor: default;
  background: hsl(var(--muted) / 35%);
}

.runtime-config-section-panel:not(.is-active)
  .runtime-config-section-panel__header {
  cursor: pointer;
}

.runtime-config-section-panel.is-active .runtime-config-section-panel__header {
  background: hsl(var(--primary) / 6%);
}

.runtime-config-section-panel__header:focus-visible {
  outline: 2px solid hsl(var(--primary) / 55%);
  outline-offset: -2px;
}

.runtime-config-section-panel__header-main {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  min-width: 0;
}

.runtime-config-section-panel__actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
  align-items: center;
}

.runtime-config-section-panel__body {
  position: relative;
  z-index: 1;
  padding: 0.75rem 1rem 1rem;
}
</style>
