<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Popover, Tag } from 'antdv-next';

defineOptions({ name: 'GovernedStatePickerPopover' });

const props = defineProps<{
  currentValue: null | string;
  icon: string;
  options: StatePickerOption[];
  tagColor: string;
  tagLabel: string;
  title: string;
}>();

const emit = defineEmits<{
  select: [value: string];
}>();

export interface StatePickerOption {
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  label: string;
  tagColor?: string;
  value: string;
}

const visibleOptions = computed(() =>
  props.options.filter((option) => !option.hidden),
);

function onSelect(option: StatePickerOption) {
  if (option.disabled || option.value === props.currentValue) {
    return;
  }
  emit('select', option.value);
}
</script>

<template>
  <div class="flex h-8 items-center px-0 sm:px-1">
    <Popover placement="bottomRight" trigger="click">
      <button
        :aria-label="`${title}: ${tagLabel}`"
        class="focus-visible:ring-ring flex size-8 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none sm:size-auto"
        type="button"
      >
        <Tag :color="tagColor" class="!m-0 cursor-pointer max-sm:!p-1">
          <IconifyIcon
            aria-hidden="true"
            :icon="icon"
            class="size-4 sm:hidden"
          />
          <span class="max-sm:sr-only">{{ tagLabel }}</span>
        </Tag>
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
              <Tag :color="option.tagColor ?? 'default'" class="mr-2">
                {{ option.label }}
              </Tag>
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
  </div>
</template>
