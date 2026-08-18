<script lang="ts" setup>
import type { EnumName } from '@vben/types';

import type { EnumPresentation } from '#/shared/presentation/enum-presentation';

import { computed } from 'vue';

import { ENUM_CATALOG } from '@vben/types';

import { Popover } from 'antdv-next';

import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import HeaderStatusGlyph from '#/shared/components/header/header-status-glyph.vue';
import { ENUM_PRESENTATION } from '#/shared/presentation/enum-presentation';

defineOptions({ name: 'GovernedStatePickerPopover' });

const props = defineProps<{
  currentValue: null | string;
  enumName: EnumName;
  fallbackLabel: string;
  options: StatePickerOption[];
  title: string;
}>();

const emit = defineEmits<{
  select: [value: string];
}>();

export interface StatePickerOption {
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  value: string;
}

const visibleOptions = computed(() =>
  props.options.filter((option) => !option.hidden),
);

const triggerPresentation = computed<EnumPresentation>(() => {
  const value = props.currentValue;
  if (!value) {
    return {
      icon: 'lucide:circle-help',
      tone: 'neutral',
    };
  }
  if (!(ENUM_CATALOG[props.enumName] as readonly string[]).includes(value)) {
    return {
      icon: 'lucide:badge-alert',
      tone: 'danger',
    };
  }
  return ENUM_PRESENTATION[
    `${props.enumName}.${value}` as keyof typeof ENUM_PRESENTATION
  ];
});

const triggerLabel = computed(() => {
  const value = props.currentValue;
  if (!value) {
    return `${props.title}: ${props.fallbackLabel}`;
  }
  const namespace = props.enumName[0]?.toLowerCase() + props.enumName.slice(1);
  const translated = $t(`enum.${namespace}.${value}`);
  return `${props.title}: ${translated === `enum.${namespace}.${value}` ? value : translated}`;
});

function onSelect(option: StatePickerOption) {
  if (option.disabled || option.value === props.currentValue) {
    return;
  }
  emit('select', option.value);
}
</script>

<template>
  <Popover placement="bottomRight" trigger="click">
    <button
      :aria-label="triggerLabel"
      class="qp-header-status-btn focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
      type="button"
    >
      <HeaderStatusGlyph
        :category-hue="triggerPresentation.categoryHue"
        :icon="triggerPresentation.icon ?? 'lucide:circle'"
        :tone="triggerPresentation.tone"
      />
    </button>
    <template #content>
      <div class="flex w-56 flex-col gap-2">
        <span class="text-muted-foreground text-xs font-medium">
          {{ title }}
        </span>
        <div class="flex flex-col gap-1">
          <button
            v-for="option in visibleOptions"
            :key="option.value"
            :class="[
              option.disabled
                ? 'cursor-default opacity-60'
                : 'hover:bg-accent cursor-pointer',
              option.danger && !option.disabled
                ? 'text-destructive hover:bg-destructive/10'
                : '',
            ]"
            class="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
            type="button"
            @click="onSelect(option)"
          >
            <EnumTag
              :context="`header-picker:${enumName}`"
              :name="enumName"
              :value="option.value"
            />
            <span
              v-if="option.value === currentValue"
              class="text-muted-foreground text-xs"
            >
              ✓
            </span>
          </button>
        </div>
      </div>
    </template>
  </Popover>
</template>
