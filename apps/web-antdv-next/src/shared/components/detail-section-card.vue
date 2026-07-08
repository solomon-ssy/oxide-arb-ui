<script lang="ts" setup>
import { Card } from 'antdv-next';

defineOptions({ name: 'DetailSectionCard' });

withDefaults(
  defineProps<{
    loading?: boolean;
    title?: string;
  }>(),
  { loading: false, title: undefined },
);
</script>

<template>
  <Card :loading="loading" size="small" :title="title">
    <template v-if="$slots.extra" #extra>
      <slot name="extra"></slot>
    </template>
    <slot></slot>
  </Card>
</template>
