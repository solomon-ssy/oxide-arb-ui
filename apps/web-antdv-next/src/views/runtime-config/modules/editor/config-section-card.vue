<script setup lang="ts">
import type { RuntimeConfigDocument, SchemaSection } from '@vben/types';

import type {
  ConfigSectionMeta,
  RuntimeConfigApplyPayload,
  RuntimeConfigFieldIndex,
} from './types';

import { computed, reactive, ref, watch, watchEffect } from 'vue';

import { preferences } from '@vben/preferences';

import { Alert, Checkbox } from 'antdv-next';

import { $t } from '#/locales';
import {
  findTagOption,
  useRuntimeConfigDiffTypeTagOptions,
} from '#/shared/components/format/tag-options';
import JsonDiffList from '#/shared/components/json-diff-list.vue';

import ConfigNodeChildren from './config-node-children.vue';
import { isFieldVisible } from './field-when';
import {
  buildDiffs,
  buildPatch,
  fieldToInputValue,
  getPath,
  hasGovernanceCriticalDiff,
  inputValueToField,
  nodeFieldViews,
  sortedChildren,
  structurallyActivePaths,
} from './schema-mapper';
import { validateGroupDraft } from './schema-validator';
import { resolveUiText } from './ui-text';

const props = defineProps<{
  config: RuntimeConfigDocument;
  fields: RuntimeConfigFieldIndex;
  loading?: boolean;
  section: SchemaSection;
}>();

const emit = defineEmits<{
  apply: [payload: RuntimeConfigApplyPayload];
  meta: [meta: ConfigSectionMeta];
}>();

const draft = reactive<Record<string, unknown>>({});
const applyError = ref('');
const diffAcknowledged = ref(false);
const diffTypeTagOptions = useRuntimeConfigDiffTypeTagOptions();

const locale = computed(() => preferences.app.locale);
const description = computed(() =>
  props.section.description
    ? resolveUiText(props.section.description, locale.value)
    : '',
);
const children = computed(() => sortedChildren(props.section.children));

const sectionFields = computed(() =>
  nodeFieldViews(props.section, props.fields),
);

const visibleFields = computed(() => {
  const active = structurallyActivePaths(props.section, draft, props.config);
  return sectionFields.value.filter(
    (field) =>
      active.has(field.path) && isFieldVisible(field, draft, props.config),
  );
});

function resetDraft() {
  applyError.value = '';
  diffAcknowledged.value = false;
  for (const field of sectionFields.value) {
    draft[field.path] = fieldToInputValue(
      field,
      getPath(props.config, field.path),
    );
  }
}

function setValue(path: string, value: unknown) {
  draft[path] = value;
}

const draftState = computed(() => {
  try {
    const validationError = validateGroupDraft(
      visibleFields.value,
      draft,
      props.config,
      inputValueToField,
    );
    if (validationError) {
      return { diffs: [], validationError };
    }
    return {
      diffs: buildDiffs(visibleFields.value, props.config, draft),
      validationError: '',
    };
  } catch (error_) {
    return {
      diffs: [],
      validationError:
        error_ instanceof Error ? error_.message : String(error_),
    };
  }
});

const validationError = computed(() => draftState.value.validationError);
const diffs = computed(() => draftState.value.diffs);
const error = computed(() => validationError.value || applyError.value);

const diffItems = computed(() =>
  diffs.value.map((diff) => ({
    badge: findTagOption(diffTypeTagOptions, 'changed'),
    key: diff.path,
    next: diff.next,
    previous: diff.previous,
    subtitle: diff.path,
    title: resolveUiText(diff.field.label, locale.value),
  })),
);

const dirty = computed(() => diffs.value.length > 0);
const requireDiffAck = computed(() => hasGovernanceCriticalDiff(diffs.value));

function apply() {
  if (error.value || !dirty.value) {
    return;
  }
  if (requireDiffAck.value && !diffAcknowledged.value) {
    applyError.value = $t(
      'page.runtimeConfig.editor.error.confirmDiffRequired',
    );
    return;
  }
  applyError.value = '';
  emit('apply', {
    diffs: diffs.value,
    patch: buildPatch(diffs.value),
    section: props.section,
  });
}

watchEffect(() => {
  emit('meta', {
    diffAcknowledged: diffAcknowledged.value,
    dirty: dirty.value,
    error: error.value,
    requireDiffAck: requireDiffAck.value,
  });
});

watch(
  () => [props.config, props.section.id],
  () => resetDraft(),
  { immediate: true },
);

watch(diffs, () => {
  diffAcknowledged.value = false;
});

defineExpose({ apply, resetDraft });
</script>

<template>
  <div class="runtime-config-section-body">
    <p
      v-if="description"
      class="text-muted-foreground mb-4 text-sm leading-relaxed"
    >
      {{ description }}
    </p>

    <ConfigNodeChildren
      :config="config"
      :disabled="loading"
      :draft="draft"
      :fields="fields"
      :locale="locale"
      :nodes="children"
      :set-value="setValue"
    />

    <Alert v-if="error" class="mt-4" :message="error" show-icon type="error" />

    <div
      v-if="dirty"
      class="border-border bg-muted/30 mt-4 rounded-lg border p-4"
    >
      <div class="text-foreground mb-3 text-sm font-medium">
        {{ $t('page.runtimeConfig.editor.diff.title') }}
      </div>
      <Checkbox
        v-if="requireDiffAck"
        v-model:checked="diffAcknowledged"
        class="mb-3"
      >
        {{ $t('page.runtimeConfig.editor.diff.acknowledgeGovernanceCritical') }}
      </Checkbox>
      <JsonDiffList :items="diffItems" />
    </div>
  </div>
</template>
