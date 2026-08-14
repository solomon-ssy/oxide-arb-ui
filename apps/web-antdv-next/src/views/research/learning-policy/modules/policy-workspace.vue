<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

defineOptions({ name: 'PolicyWorkspaceModule' });
const PolicyCatalog = defineAsyncComponent(
  () => import('./policies/index.vue'),
);
const PolicyDetail = defineAsyncComponent(
  () => import('./policies/detail/index.vue'),
);
</script>

<template>
  <PolicyCatalog />
  <PolicyDetail />
</template>
