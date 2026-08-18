<script lang="ts" setup>
import type { EnumName } from '@vben/types';

import type { EnumPresentation } from '#/shared/presentation/enum-presentation';

import { computed, watch } from 'vue';

import { ENUM_CATALOG } from '@vben/types';

import { $t } from '#/locales';
import { EMPTY_PLACEHOLDER } from '#/shared/components/format';
import StatusChip from '#/shared/components/status-chip.vue';
import { reportEnumDrift } from '#/shared/presentation/enum-drift';
import { ENUM_PRESENTATION } from '#/shared/presentation/enum-presentation';

defineOptions({ name: 'EnumTag' });

const props = defineProps<{
  context?: string;
  label?: string;
  name: EnumName;
  value: null | string | undefined;
}>();

const hasValue = computed(
  () => typeof props.value === 'string' && props.value.trim().length > 0,
);
const known = computed(() => {
  const value = props.value;
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    (ENUM_CATALOG[props.name] as readonly string[]).includes(value)
  );
});
const presentation = computed<EnumPresentation>(() => {
  if (!hasValue.value) {
    return {
      emphasis: 'subtle',
      tone: 'neutral',
    };
  }
  if (!known.value) {
    return {
      emphasis: 'solid',
      icon: 'lucide:badge-alert',
      tone: 'danger',
    };
  }
  return ENUM_PRESENTATION[
    `${props.name}.${props.value}` as keyof typeof ENUM_PRESENTATION
  ];
});
const translatedLabel = computed(() => {
  if (props.label) return props.label;
  if (!hasValue.value) return EMPTY_PLACEHOLDER;
  if (!known.value) {
    return $t('enum.unknownValue', { value: props.value });
  }
  const namespace = props.name[0]?.toLowerCase() + props.name.slice(1);
  const key = `enum.${namespace}.${props.value}`;
  const translated = $t(key);
  return translated === key ? props.value : translated;
});

watch(
  () => [props.name, props.value] as const,
  () => {
    if (hasValue.value && !known.value) {
      reportEnumDrift({
        context: props.context,
        enumName: props.name,
        value: props.value,
      });
    }
  },
  { immediate: true },
);
</script>

<template>
  <StatusChip
    class="enum-tag"
    :category-hue="presentation.categoryHue"
    :emphasis="presentation.emphasis"
    :icon="presentation.icon"
    :tone="presentation.tone"
  >
    {{ translatedLabel }}
  </StatusChip>
</template>
