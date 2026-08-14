<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

defineOptions({ name: 'PolicyWorkspaceModule' });
const PolicyCatalog = defineAsyncComponent(
  () => import('./policies/index.vue'),
);
const PolicyDetail = defineAsyncComponent(
  () => import('./policies/detail/index.vue'),
);

const route = useRoute();
const hasPolicyDetail = computed(
  () =>
    route.query.entity === 'trade-policy' &&
    typeof route.query.id === 'string' &&
    route.query.id !== '',
);
</script>

<template>
  <PolicyDetail v-if="hasPolicyDetail" />
  <PolicyCatalog v-else />
</template>
