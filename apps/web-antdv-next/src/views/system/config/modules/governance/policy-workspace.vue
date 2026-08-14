<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const Overview = defineAsyncComponent(() => import('./index.vue'));
const Resource = defineAsyncComponent(() => import('./resource.vue'));
const hasResource = computed(
  () => typeof route.query.resource === 'string' && route.query.resource !== '',
);
</script>

<template>
  <Resource v-if="hasResource" />
  <Overview v-else />
</template>
