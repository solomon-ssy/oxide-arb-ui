<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const Backtests = defineAsyncComponent(() => import('./backtests/index.vue'));
const Comparison = defineAsyncComponent(
  () => import('./comparisons/detail.vue'),
);
const isComparison = computed(
  () =>
    route.query.entity === 'comparison-report' &&
    typeof route.query.id === 'string' &&
    route.query.id !== '',
);
</script>

<template>
  <Comparison v-if="isComparison" />
  <Backtests v-else />
</template>
