<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/qp';

import { getRecommendation } from '#/api/quant-recommendations';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { useOrderIntentStore } from '#/store';

import RecommendationDetailPanel from './modules/recommendation-detail-panel.vue';

defineOptions({ name: 'RecommendationDetailPage' });

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const orderIntentStore = useOrderIntentStore();

const recommendation = ref<null | QuantRecommendationView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);

const recommendationId = computed(() => {
  const entity = Array.isArray(route.query.entity)
    ? route.query.entity[0]
    : route.query.entity;
  const id = Array.isArray(route.query.id) ? route.query.id[0] : route.query.id;
  return entity === 'recommendation' && typeof id === 'string' ? id : '';
});
const initialTab = computed(() => (route.query.tab as string) || undefined);
const inspectorOpen = computed({
  get: () => recommendationId.value !== '',
  set: (value: boolean) => {
    if (!value) goBack();
  },
});

async function load() {
  if (!recommendationId.value) {
    return;
  }
  loading.value = true;
  loadError.value = null;
  try {
    const result = await handleRequest(
      () => getRecommendation(recommendationId.value),
      {
        silent: true,
        onError: (err) => {
          if (err.httpStatus !== 404) {
            loadError.value = err.message;
          }
        },
      },
    );
    recommendation.value = result ?? null;
  } finally {
    loading.value = false;
  }
}

function goBack() {
  void router.push('/trading/recommendations?module=reports');
}

watch(recommendationId, () => void load());
watch(
  () => orderIntentStore.revision,
  () => void load(),
);
onMounted(() => void load());
</script>

<template>
  <WorkspaceInspectorSurface
    v-model:open="inspectorOpen"
    :title="$t('page.quantRecommendations.title')"
  >
    <AsyncState
      :error-message="loadError"
      :loading="loading"
      :not-found="!recommendation && !loading && !loadError"
      :not-found-text="$t('page.quantRecommendations.notFound')"
      @retry="load"
    >
      <RecommendationDetailPanel
        v-if="recommendation"
        :initial-tab="initialTab"
        :recommendation="recommendation"
      />
    </AsyncState>
  </WorkspaceInspectorSurface>
</template>
