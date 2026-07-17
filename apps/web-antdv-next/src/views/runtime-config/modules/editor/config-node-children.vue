<script setup lang="ts">
import type {
  RuntimeConfigDocument,
  RuntimeConfigSchemaFieldView,
  SchemaNode,
  SchemaSection,
  SchemaUnion,
} from '@vben/types';

import type { RuntimeConfigFieldIndex } from './types';

import { computed, ref, watch } from 'vue';

import { Collapse, CollapsePanel } from 'antdv-next';

import { getDocumentPath } from './document-path';
import { isFieldVisible } from './field-when';
import RuntimeConfigField from './fields/runtime-config-field.vue';
import RuntimeConfigScheduleListField from './fields/runtime-config-schedule-list-field.vue';
import RuntimeConfigSectionIcon from './fields/runtime-config-section-icon.vue';
import {
  nodeGridSpan,
  RUNTIME_CONFIG_GRID_COLUMNS,
  sortedChildren,
} from './schema-mapper';
import { resolveUiText } from './ui-text';

defineOptions({ name: 'ConfigNodeChildren' });

const props = defineProps<{
  config: RuntimeConfigDocument;
  disabled?: boolean;
  draft: Record<string, unknown>;
  fields: RuntimeConfigFieldIndex;
  locale: string;
  nodes: SchemaNode[];
  setValue: (path: string, value: unknown) => void;
}>();

type Segment =
  | { accordionIndex: number; kind: 'accordion'; nodes: SchemaSection[] }
  | { kind: 'grid'; nodes: SchemaNode[] };

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: `repeat(${RUNTIME_CONFIG_GRID_COLUMNS}, minmax(0, 1fr))`,
  columnGap: '1rem',
  rowGap: '0.75rem',
};

function isCollapsibleSection(
  node: SchemaNode,
): node is SchemaSection & { kind: 'section' } {
  return node.kind === 'section' && node.collapsible;
}

function buildSegments(nodes: SchemaNode[]): Segment[] {
  const segments: Segment[] = [];
  let gridRun: SchemaNode[] = [];
  let accordionRun: SchemaSection[] = [];
  let accordionIndex = 0;

  const flushGrid = () => {
    if (gridRun.length > 0) {
      segments.push({ kind: 'grid', nodes: [...gridRun] });
      gridRun = [];
    }
  };
  const flushAccordion = () => {
    if (accordionRun.length > 0) {
      segments.push({
        accordionIndex: accordionIndex++,
        kind: 'accordion',
        nodes: [...accordionRun],
      });
      accordionRun = [];
    }
  };

  for (const node of sortedChildren(nodes)) {
    if (isCollapsibleSection(node)) {
      flushGrid();
      accordionRun.push(node);
    } else {
      flushAccordion();
      gridRun.push(node);
    }
  }
  flushGrid();
  flushAccordion();
  return segments;
}

const segments = computed(() => buildSegments(props.nodes));

const accordionKeys = ref<Record<number, string>>({});

function accordionActiveKey(segment: Extract<Segment, { kind: 'accordion' }>) {
  return (
    accordionKeys.value[segment.accordionIndex] ?? segment.nodes[0]?.id ?? ''
  );
}

function onAccordionChange(segmentIndex: number, key: string | undefined) {
  if (key) {
    accordionKeys.value = { ...accordionKeys.value, [segmentIndex]: key };
  }
}

watch(
  segments,
  (next) => {
    const keys = { ...accordionKeys.value };
    for (const segment of next) {
      if (segment.kind === 'accordion' && segment.nodes[0]) {
        keys[segment.accordionIndex] ??= segment.nodes[0].id;
      }
    }
    accordionKeys.value = keys;
  },
  { immediate: true },
);

function gridStyleFor(node: SchemaNode) {
  const span = nodeGridSpan(node, props.fields);
  return {
    gridColumn: `span ${span} / span ${span}`,
  };
}

function nodeKey(node: SchemaNode): string {
  switch (node.kind) {
    case 'field': {
      return `field:${node.path}`;
    }
    case 'section': {
      return `section:${node.id}`;
    }
    case 'union': {
      return `union:${node.discriminator}`;
    }
  }
}

function fieldFor(node: SchemaNode): RuntimeConfigSchemaFieldView | undefined {
  return node.kind === 'field' ? props.fields.get(node.path) : undefined;
}

function fieldVisible(node: SchemaNode): boolean {
  const field = fieldFor(node);
  return field ? isFieldVisible(field, props.draft, props.config) : false;
}

function sectionLabel(section: SchemaSection) {
  return resolveUiText(section.label, props.locale);
}

function sectionDescription(section: SchemaSection) {
  return section.description
    ? resolveUiText(section.description, props.locale)
    : '';
}

function unionLabel(union: SchemaUnion) {
  return union.label ? resolveUiText(union.label, props.locale) : '';
}

function activeUnionChildren(union: SchemaUnion): SchemaNode[] {
  const actual = Object.hasOwn(props.draft, union.discriminator)
    ? props.draft[union.discriminator]
    : getDocumentPath(props.config, union.discriminator);
  const active = union.cases.find(
    (unionCase) =>
      JSON.stringify(unionCase.case_value) === JSON.stringify(actual),
  );
  return sortedChildren(active?.children ?? []);
}
</script>

<template>
  <div class="config-node-children space-y-3">
    <template v-for="(segment, segmentIndex) in segments" :key="segmentIndex">
      <div v-if="segment.kind === 'grid'" :style="gridStyle">
        <div
          v-for="child in segment.nodes"
          :key="nodeKey(child)"
          :style="gridStyleFor(child)"
        >
          <template v-if="child.kind === 'field'">
            <template v-if="fieldFor(child) && fieldVisible(child)">
              <RuntimeConfigScheduleListField
                v-if="fieldFor(child)!.widget === 'schedule_list'"
                :disabled="disabled"
                :field="fieldFor(child)!"
                :locale="locale"
                :model-value="draft[child.path] as unknown[]"
                @update:model-value="(value) => setValue(child.path, value)"
              />
              <RuntimeConfigField
                v-else
                :disabled="disabled"
                :field="fieldFor(child)!"
                :model-value="draft[child.path]"
                @update:model-value="(value) => setValue(child.path, value)"
              />
            </template>
          </template>

          <div
            v-else-if="child.kind === 'section'"
            class="border-border/60 bg-muted/20 rounded-lg border border-dashed px-3 py-2"
          >
            <div class="text-foreground mb-1 text-sm font-medium">
              {{ sectionLabel(child) }}
            </div>
            <p
              v-if="sectionDescription(child)"
              class="text-muted-foreground mb-2 text-xs"
            >
              {{ sectionDescription(child) }}
            </p>
            <ConfigNodeChildren
              :config="config"
              :disabled="disabled"
              :draft="draft"
              :fields="fields"
              :locale="locale"
              :nodes="child.children"
              :set-value="setValue"
            />
          </div>

          <div v-else class="union-block">
            <p
              v-if="unionLabel(child)"
              class="text-muted-foreground mb-2 text-xs font-medium"
            >
              {{ unionLabel(child) }}
            </p>
            <ConfigNodeChildren
              :config="config"
              :disabled="disabled"
              :draft="draft"
              :fields="fields"
              :locale="locale"
              :nodes="activeUnionChildren(child)"
              :set-value="setValue"
            />
          </div>
        </div>
      </div>

      <Collapse
        v-else
        accordion
        bordered
        class="nested-section-accordion"
        :active-key="accordionActiveKey(segment)"
        @change="
          (keys: string[]) => onAccordionChange(segment.accordionIndex, keys[0])
        "
      >
        <CollapsePanel
          v-for="section in segment.nodes"
          :key="section.id"
          :show-arrow="false"
        >
          <template #header>
            <span class="nested-section-header">
              <RuntimeConfigSectionIcon
                :section="section"
                size-class="size-3.5"
              />
              <span class="text-foreground text-sm font-medium">
                {{ sectionLabel(section) }}
              </span>
            </span>
          </template>
          <p
            v-if="sectionDescription(section)"
            class="text-muted-foreground mb-3 text-xs leading-relaxed"
          >
            {{ sectionDescription(section) }}
          </p>
          <ConfigNodeChildren
            :config="config"
            :disabled="disabled"
            :draft="draft"
            :fields="fields"
            :locale="locale"
            :nodes="section.children"
            :set-value="setValue"
          />
        </CollapsePanel>
      </Collapse>
    </template>
  </div>
</template>

<style scoped>
.nested-section-accordion {
  overflow: hidden;
  background: hsl(var(--muted) / 25%);
  border-radius: 0.5rem;
}

.nested-section-accordion :deep(.ant-collapse-item) {
  border-color: hsl(var(--border) / 60%) !important;
}

.nested-section-accordion :deep(.ant-collapse-header) {
  align-items: center !important;
  min-height: unset !important;
  padding: 0.375rem 0.625rem !important;
}

.nested-section-accordion :deep(.ant-collapse-expand-icon) {
  display: none !important;
}

.nested-section-accordion :deep(.ant-collapse-item-active) {
  background: hsl(var(--primary) / 4%);
}

.nested-section-accordion
  :deep(.ant-collapse-item-active > .ant-collapse-header) {
  color: hsl(var(--foreground));
}

.nested-section-accordion :deep(.ant-collapse-content-box) {
  padding: 0.75rem !important;
}

.nested-section-header {
  display: inline-flex;
  gap: 0.375rem;
  align-items: center;
}

.union-block {
  padding-left: 0.75rem;
  border-left: 2px solid hsl(var(--primary) / 35%);
}
</style>
