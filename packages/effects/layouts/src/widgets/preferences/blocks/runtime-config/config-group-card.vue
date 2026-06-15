<script setup lang="ts">
import type { RuntimeConfigDocument } from '@vben/types';

import type { RuntimeConfigApplyPayload, RuntimeConfigGroup } from './types';

import { computed, reactive, ref, watch } from 'vue';

import { $t } from '@vben/locales';
import { preferences } from '@vben/preferences';

import CardShell from './card-shell.vue';
import { isFieldEnabled, isFieldVisible } from './field-when';
import RuntimeConfigField from './fields/runtime-config-field.vue';
import {
  buildDiffs,
  buildPatch,
  fieldToInputValue,
  getPath,
  hasMoneyCriticalDiff,
  inputValueToField,
} from './schema-mapper';
import { validateGroupDraft } from './schema-validator';
import { resolveUiText } from './ui-text';

const props = defineProps<{
  canApply: boolean;
  config: RuntimeConfigDocument;
  group: RuntimeConfigGroup;
  loading?: boolean;
}>();

const emit = defineEmits<{
  apply: [payload: RuntimeConfigApplyPayload];
  reload: [];
}>();

const draft = reactive<Record<string, unknown>>({});
const applyError = ref('');
const diffAcknowledged = ref(false);

const locale = computed(() => preferences.app.locale);
const groupTitle = computed(() =>
  resolveUiText(props.group.label, locale.value),
);
const groupDescription = computed(() =>
  resolveUiText(props.group.description, locale.value),
);

const visibleFields = computed(() =>
  props.group.fields.filter((field) =>
    isFieldVisible(field, draft, props.config),
  ),
);

const moneyCritical = computed(() =>
  visibleFields.value.some((field) => field.money_critical),
);

function resetDraft() {
  applyError.value = '';
  diffAcknowledged.value = false;
  for (const field of props.group.fields) {
    draft[field.path] = fieldToInputValue(
      field,
      getPath(props.config, field.path),
    );
  }
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

const dirty = computed(() => diffs.value.length > 0);
const requireDiffAck = computed(
  () => moneyCritical.value && hasMoneyCriticalDiff(diffs.value),
);

function apply() {
  if (error.value || !dirty.value) {
    return;
  }
  if (requireDiffAck.value && !diffAcknowledged.value) {
    applyError.value = $t(
      'preferences.runtimeConfig.error.confirmDiffRequired',
    );
    return;
  }
  applyError.value = '';
  emit('apply', {
    diffs: diffs.value,
    group: props.group,
    patch: buildPatch(diffs.value),
  });
}

watch(
  () => [props.config, props.group.key],
  () => resetDraft(),
  { immediate: true },
);

watch(diffs, () => {
  diffAcknowledged.value = false;
});
</script>

<template>
  <CardShell
    :description="groupDescription"
    :dirty="dirty"
    :disable-apply="
      !canApply || Boolean(error) || (requireDiffAck && !diffAcknowledged)
    "
    :error="error"
    :loading="loading"
    :money-critical="moneyCritical"
    :require-diff-ack="requireDiffAck"
    :title="groupTitle"
    @apply="apply"
    @reload="emit('reload')"
    @reset="resetDraft"
  >
    <div class="flex flex-col">
      <RuntimeConfigField
        v-for="field in visibleFields"
        :key="field.path"
        v-model="draft[field.path]"
        :disabled="loading || !isFieldEnabled(field, draft, config)"
        :field="field"
      />
    </div>

    <div v-if="dirty" class="rounded-md border p-3">
      <div class="text-foreground mb-2 text-sm font-medium">
        {{ $t('preferences.runtimeConfig.diff.title') }}
      </div>
      <label
        v-if="requireDiffAck"
        class="text-foreground mb-3 flex items-center gap-2 text-sm"
      >
        <input v-model="diffAcknowledged" type="checkbox" />
        {{ $t('preferences.runtimeConfig.diff.acknowledgeMoneyCritical') }}
      </label>
      <div class="max-h-40 space-y-2 overflow-auto text-xs">
        <div v-for="diff in diffs" :key="diff.path">
          <div class="font-medium">
            {{ resolveUiText(diff.field.label, locale) }}
          </div>
          <div class="text-muted-foreground font-mono">{{ diff.path }}</div>
          <div class="grid gap-2 md:grid-cols-2">
            <pre class="bg-muted rounded p-2">{{
              JSON.stringify(diff.previous, null, 2)
            }}</pre>
            <pre class="bg-muted rounded p-2">{{
              JSON.stringify(diff.next, null, 2)
            }}</pre>
          </div>
        </div>
      </div>
    </div>
  </CardShell>
</template>
