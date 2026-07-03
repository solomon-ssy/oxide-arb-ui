<script setup lang="ts">
import { Input, InputNumber, SpaceCompact } from 'antdv-next';

defineProps<{
  addonAfter?: string;
  addonBefore?: string;
  disabled?: boolean;
  max?: number;
  min?: number;
  placeholder?: string;
}>();

const model = defineModel<null | number>({ default: null });
</script>

<template>
  <SpaceCompact v-if="addonBefore || addonAfter" block class="w-full">
    <Input
      v-if="addonBefore"
      :value="addonBefore"
      disabled
      class="addon-cell !w-auto max-w-24 text-center"
      tabindex="-1"
    />
    <InputNumber
      v-model:value="model"
      :disabled="disabled"
      :max="max"
      :min="min"
      :placeholder="placeholder"
      class="min-w-0 flex-1"
    />
    <Input
      v-if="addonAfter"
      :value="addonAfter"
      disabled
      class="addon-cell !w-auto max-w-24 text-center"
      tabindex="-1"
    />
  </SpaceCompact>

  <InputNumber
    v-else
    v-model:value="model"
    :disabled="disabled"
    :max="max"
    :min="min"
    :placeholder="placeholder"
    class="w-full"
  />
</template>

<style scoped>
:deep(.addon-cell.ant-input-disabled) {
  pointer-events: none;
}

:deep(.ant-input-number) {
  width: 100%;
}
</style>
