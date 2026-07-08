<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { Button } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'DetailBackNav' });

withDefaults(
  defineProps<{
    label?: string;
  }>(),
  { label: undefined },
);

const emit = defineEmits<{ back: [] }>();
</script>

<template>
  <div class="mb-4">
    <Button type="link" @click="emit('back')">
      <IconifyIcon class="mr-1 size-4" icon="lucide:arrow-left" />
      {{ label ?? $t('page.shared.detailBack') }}
    </Button>
  </div>
</template>
