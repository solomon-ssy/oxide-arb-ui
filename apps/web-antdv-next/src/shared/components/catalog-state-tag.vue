<script lang="ts" setup>
import type { CatalogState } from '@vben/types';

import { computed } from 'vue';

import { Tag } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'CatalogStateTag' });

const props = defineProps<{
  catalog: CatalogState | undefined;
}>();

const color = computed(() => {
  if (!props.catalog) {
    return 'default';
  }
  return props.catalog.state === 'ready' ? 'success' : 'processing';
});

const label = computed(() => {
  const catalog = props.catalog;
  if (!catalog) {
    return '—';
  }
  return catalog.state === 'ready'
    ? $t('page.system.catalog.ready', { markets: catalog.markets })
    : $t('page.system.catalog.warming');
});
</script>

<template>
  <Tag :color="color">{{ label }}</Tag>
</template>
