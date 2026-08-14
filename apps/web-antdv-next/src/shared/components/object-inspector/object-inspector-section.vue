<script lang="ts" setup>
import type { ObjectInspectorSectionModel } from './object-inspector.types';

import { RouterLink } from 'vue-router';

import { Descriptions, DescriptionsItem } from 'antdv-next';

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
    <Descriptions :column="2" bordered size="small">
      <DescriptionsItem
        v-for="field in section.fields"
        :key="field.label"
        :label="field.label"
        :span="field.span ?? 1"
      >
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
      </DescriptionsItem>
    </Descriptions>
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
</style>
