<script lang="ts" setup>
import { RouterLink } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Button } from 'antdv-next';

defineOptions({ name: 'EntityRouteButton' });

withDefaults(
  defineProps<{
    icon: string;
    label: string;
    to: string;
    type?: 'dashed' | 'default' | 'link' | 'primary' | 'text';
  }>(),
  { type: 'default' },
);
</script>

<template>
  <RouterLink :to="to">
    <Button :type="type">
      <span class="inline-flex items-center gap-1.5">
        <IconifyIcon class="size-4" :icon="icon" />
        {{ label }}
      </span>
    </Button>
  </RouterLink>
</template>
