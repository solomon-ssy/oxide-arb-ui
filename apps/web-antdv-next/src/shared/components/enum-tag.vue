<script lang="ts" setup>
import type { EnumName } from '@vben/types';

import type { EnumPresentation } from '#/shared/presentation/enum-presentation';

import { computed, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { ENUM_CATALOG } from '@vben/types';

import { Tag } from 'antdv-next';

import { $t } from '#/locales';
import { EMPTY_PLACEHOLDER } from '#/shared/components/format';
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
  <Tag
    :data-category-hue="presentation.categoryHue"
    :data-emphasis="presentation.emphasis ?? 'subtle'"
    :data-tone="presentation.tone"
    class="enum-tag"
  >
    <IconifyIcon v-if="presentation.icon" :icon="presentation.icon" />
    <span>{{ translatedLabel }}</span>
  </Tag>
</template>

<style scoped>
.enum-tag {
  --enum-color: var(--qp-status-neutral);

  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-inline-end: 0;
  font-weight: 620;
  color: hsl(var(--enum-color));
  background: hsl(var(--enum-color) / 11%);
  border-color: hsl(var(--enum-color) / 38%);
}

[data-emphasis='solid'] {
  color: hsl(var(--qp-text-primary));
  background: hsl(var(--enum-color) / 23%);
  border-color: hsl(var(--enum-color) / 72%);
}

[data-tone='success'] {
  --enum-color: var(--qp-status-success);
}

[data-tone='running'] {
  --enum-color: var(--qp-status-running);
}

[data-tone='queued'] {
  --enum-color: var(--qp-status-queued);
}

[data-tone='warning'] {
  --enum-color: var(--qp-status-warning);
}

[data-tone='danger'] {
  --enum-color: var(--qp-status-danger);
}

[data-tone='paused'] {
  --enum-color: var(--qp-status-paused);
}

[data-category-hue='1'] {
  --enum-color: var(--qp-chart-cat-1);
}

[data-category-hue='2'] {
  --enum-color: var(--qp-chart-cat-2);
}

[data-category-hue='3'] {
  --enum-color: var(--qp-chart-cat-3);
}

[data-category-hue='4'] {
  --enum-color: var(--qp-chart-cat-4);
}

[data-category-hue='5'] {
  --enum-color: var(--qp-chart-cat-5);
}

[data-category-hue='6'] {
  --enum-color: var(--qp-chart-cat-6);
}

[data-category-hue='7'] {
  --enum-color: var(--qp-chart-cat-7);
}

[data-category-hue='8'] {
  --enum-color: var(--qp-chart-cat-8);
}

[data-category-hue='9'] {
  --enum-color: var(--qp-chart-cat-9);
}

[data-category-hue='10'] {
  --enum-color: var(--qp-chart-cat-10);
}

[data-category-hue='11'] {
  --enum-color: var(--qp-chart-cat-11);
}

[data-category-hue='12'] {
  --enum-color: var(--qp-chart-cat-12);
}
</style>
