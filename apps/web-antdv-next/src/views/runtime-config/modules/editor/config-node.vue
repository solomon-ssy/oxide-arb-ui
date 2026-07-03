<script setup lang="ts">
import type { RuntimeConfigDocument, SchemaNode } from '@vben/types';

import type { RuntimeConfigFieldIndex } from './types';

import { computed } from 'vue';

import ConfigNodeChildren from './config-node-children.vue';
import { isFieldVisible } from './field-when';
import RuntimeConfigField from './fields/runtime-config-field.vue';
import RuntimeConfigScheduleListField from './fields/runtime-config-schedule-list-field.vue';
import { getPath, sortedChildren } from './schema-mapper';
import { resolveUiText } from './ui-text';

defineOptions({ name: 'ConfigNode' });

const props = defineProps<{
  config: RuntimeConfigDocument;
  disabled?: boolean;
  draft: Record<string, unknown>;
  fields: RuntimeConfigFieldIndex;
  locale: string;
  node: SchemaNode;
  setValue: (path: string, value: unknown) => void;
}>();

const field = computed(() =>
  props.node.kind === 'field' ? props.fields.get(props.node.path) : undefined,
);

const fieldVisible = computed(() =>
  field.value ? isFieldVisible(field.value, props.draft, props.config) : false,
);

const sectionLabel = computed(() =>
  props.node.kind === 'section'
    ? resolveUiText(props.node.label, props.locale)
    : '',
);
const sectionDescription = computed(() =>
  props.node.kind === 'section' && props.node.description
    ? resolveUiText(props.node.description, props.locale)
    : '',
);
const unionLabel = computed(() =>
  props.node.kind === 'union'
    ? resolveUiText(props.node.label, props.locale)
    : '',
);

/** Children of the active union case (matched against the live discriminator). */
const activeUnionChildren = computed<SchemaNode[]>(() => {
  if (props.node.kind !== 'union') {
    return [];
  }
  const actual = Object.hasOwn(props.draft, props.node.discriminator)
    ? props.draft[props.node.discriminator]
    : getPath(props.config, props.node.discriminator);
  const active = props.node.cases.find(
    (unionCase) =>
      JSON.stringify(unionCase.case_value) === JSON.stringify(actual),
  );
  return sortedChildren(active?.children ?? []);
});
</script>

<template>
  <!-- Field leaf -->
  <template v-if="node.kind === 'field'">
    <template v-if="field && fieldVisible">
      <RuntimeConfigScheduleListField
        v-if="field.widget === 'schedule_list'"
        :model-value="draft[field.path] as unknown[]"
        :disabled="disabled"
        :field="field"
        :locale="locale"
        @update:model-value="(value) => setValue(field!.path, value)"
      />
      <RuntimeConfigField
        v-else
        :model-value="draft[field.path]"
        :disabled="disabled"
        :field="field"
        @update:model-value="(value) => setValue(field!.path, value)"
      />
    </template>
  </template>

  <!-- Non-collapsible nested section -->
  <div
    v-else-if="node.kind === 'section'"
    class="border-border/60 bg-muted/20 rounded-lg border border-dashed px-3 py-2"
  >
    <div class="text-foreground mb-1 text-sm font-medium">
      {{ sectionLabel }}
    </div>
    <p v-if="sectionDescription" class="text-muted-foreground mb-2 text-xs">
      {{ sectionDescription }}
    </p>
    <ConfigNodeChildren
      :config="config"
      :disabled="disabled"
      :draft="draft"
      :fields="fields"
      :locale="locale"
      :nodes="node.children"
      :set-value="setValue"
    />
  </div>

  <!-- Discriminated union: render the active case only -->
  <div v-else-if="node.kind === 'union'" class="union-block">
    <p v-if="unionLabel" class="text-muted-foreground mb-2 text-xs font-medium">
      {{ unionLabel }}
    </p>
    <ConfigNodeChildren
      :config="config"
      :disabled="disabled"
      :draft="draft"
      :fields="fields"
      :locale="locale"
      :nodes="activeUnionChildren"
      :set-value="setValue"
    />
  </div>
</template>

<style scoped>
.union-block {
  padding-left: 0.75rem;
  border-left: 2px solid hsl(var(--primary) / 35%);
}
</style>
