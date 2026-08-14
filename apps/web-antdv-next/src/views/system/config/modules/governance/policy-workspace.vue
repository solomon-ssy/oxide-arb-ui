<script lang="ts" setup>
import { defineAsyncComponent } from 'vue';

const Overview = defineAsyncComponent(() => import('./index.vue'));
const Resource = defineAsyncComponent(() => import('./resource.vue'));
</script>

<template>
  <Overview />
  <Resource />
</template>
