<script setup lang="ts">
import type { SchemaSection } from '@vben/types';

import type { ConfigSectionMeta } from './types';

import { nextTick, useTemplateRef } from 'vue';

import { Modal } from 'antdv-next';

import { $t } from '#/locales';

import {
  needsDirtySwitchConfirm,
  resolveSectionBeamColor,
} from './runtime-config-beam-palette';
import RuntimeConfigSectionPanel from './runtime-config-section-panel.vue';
import { resolveUiText } from './ui-text';

defineOptions({ name: 'RuntimeConfigTopSections' });

const props = defineProps<{
  canApply: boolean;
  loading: boolean;
  locale: string;
  sectionGovernanceCritical: Record<string, boolean>;
  sectionMeta: Record<string, ConfigSectionMeta | undefined>;
  sections: SchemaSection[];
}>();

const activeSectionKey = defineModel<string>('activeSectionKey', {
  required: true,
});

const rootRef = useTemplateRef<HTMLElement>('rootRef');

function panelId(sectionId: string) {
  return `runtime-config-section-panel-${sectionId}`;
}

function sectionTitle(section: SchemaSection) {
  return resolveUiText(section.label, props.locale);
}

function confirmDirtySwitch(sectionLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: $t('page.runtimeConfig.editor.switchSection.title'),
      content: $t('page.runtimeConfig.editor.switchSection.content', {
        section: sectionLabel,
      }),
      okText: $t('page.runtimeConfig.editor.switchSection.continue'),
      cancelText: $t('common.cancel'),
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

async function requestSectionSwitch(nextId: string) {
  if (nextId === activeSectionKey.value) {
    return;
  }

  const currentId = activeSectionKey.value;
  const currentMeta = currentId ? props.sectionMeta[currentId] : undefined;
  if (needsDirtySwitchConfirm(currentId, nextId, Boolean(currentMeta?.dirty))) {
    const currentSection = props.sections.find(
      (section) => section.id === currentId,
    );
    const confirmed = await confirmDirtySwitch(
      currentSection ? sectionTitle(currentSection) : currentId,
    );
    if (!confirmed) {
      return;
    }
  }

  activeSectionKey.value = nextId;
  await nextTick();
  scrollActivePanelIntoView(nextId);
}

async function scrollActivePanelIntoView(sectionId: string) {
  await nextTick();
  const panel = rootRef.value?.querySelector(
    `[data-section-id="${sectionId}"]`,
  );
  panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function beamColorFor(section: SchemaSection) {
  const meta = props.sectionMeta[section.id];
  return resolveSectionBeamColor({
    dirty: meta?.dirty,
    governanceCritical: props.sectionGovernanceCritical[section.id],
  });
}
</script>

<template>
  <div ref="rootRef" class="runtime-config-top-sections">
    <RuntimeConfigSectionPanel
      v-for="section in sections"
      :key="section.id"
      :active="activeSectionKey === section.id"
      :beam-color="beamColorFor(section)"
      :panel-id="panelId(section.id)"
      :section-id="section.id"
      @activate="requestSectionSwitch(section.id)"
    >
      <template #header>
        <slot name="header" :section="section"></slot>
      </template>
      <template #actions>
        <slot name="actions" :section="section"></slot>
      </template>
      <slot name="body" :section="section"></slot>
    </RuntimeConfigSectionPanel>
  </div>
</template>

<style scoped>
.runtime-config-top-sections {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
</style>
