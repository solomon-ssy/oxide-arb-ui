<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

const Backtests = defineAsyncComponent(() => import('./backtests/index.vue'));
const Comparison = defineAsyncComponent(
  () => import('./comparisons/detail.vue'),
);
</script>

<template>
  <Backtests />
  <Comparison />
</template>
