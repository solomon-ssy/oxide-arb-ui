<script lang="ts" setup>
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const ReportDetail = defineAsyncComponent(
  () => import('../reports/detail/index.vue'),
);
const RecommendationDetail = defineAsyncComponent(
  () => import('../recommendations/detail.vue'),
);
const isRecommendation = computed(
  () => route.query.entity === 'recommendation',
);
</script>

<template>
  <RecommendationDetail v-if="isRecommendation" />
  <ReportDetail v-else default-tab="recommendations" />
</template>
