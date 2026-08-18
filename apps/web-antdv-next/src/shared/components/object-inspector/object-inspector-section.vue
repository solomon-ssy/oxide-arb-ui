<script lang="ts" setup>
import type { ObjectInspectorSectionModel } from './object-inspector.types';

import { RouterLink } from 'vue-router';

import EnumTag from '#/shared/components/enum-tag.vue';
import { EMPTY_PLACEHOLDER } from '#/shared/components/format';

defineOptions({ name: 'ObjectInspectorSection' });

defineProps<{
  section: ObjectInspectorSectionModel;
}>();
</script>

<template>
  <section :aria-labelledby="`inspector-section-${section.key}`">
    <h3
      :id="`inspector-section-${section.key}`"
      class="inspector-section-title"
    >
      {{ section.title }}
    </h3>
    <dl class="object-definition-list">
      <div
        v-for="field in section.fields"
        :key="field.label"
        class="object-definition-row"
      >
        <dt>{{ field.label }}</dt>
        <dd>
          <EnumTag
            v-if="field.enum"
            :context="field.enum.context ?? `object-inspector.${section.key}`"
            :label="field.enum.label"
            :name="field.enum.name"
            :value="field.enum.value"
          />
          <RouterLink
            v-else-if="field.routeTo"
            :class="{ 'font-mono text-xs break-all': field.mono }"
            :to="field.routeTo"
          >
            {{ field.value ?? EMPTY_PLACEHOLDER }}
          </RouterLink>
          <span v-else :class="{ 'font-mono text-xs break-all': field.mono }">
            {{ field.value ?? EMPTY_PLACEHOLDER }}
          </span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.inspector-section-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 720;
  color: hsl(var(--qp-text-secondary));
  letter-spacing: 0.02em;
}

.object-definition-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  overflow: hidden;
  border: 1px solid hsl(var(--qp-border-subtle));
  border-radius: var(--qp-radius-sm);
}

.object-definition-row {
  display: grid;
  grid-template-columns: minmax(7em, 10em) minmax(0, 1fr);
  gap: 8px 12px;
  padding: 8px 12px;
  border-bottom: 1px solid hsl(var(--qp-border-subtle));
}

.object-definition-row:last-child {
  border-bottom: none;
}

.object-definition-row dt {
  margin: 0;
  font-size: 12px;
  color: hsl(var(--qp-text-muted));
}

.object-definition-row dd {
  min-width: 0;
  margin: 0;
  font-size: 12px;
  color: hsl(var(--qp-text-primary));
  overflow-wrap: anywhere;
}
</style>
