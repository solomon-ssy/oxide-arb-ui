<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { getRecommendation } from '#/api/quant-recommendations';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import DetailBackNav from '#/shared/components/detail-back-nav.vue';
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

const recommendationId = computed(() => route.params.id as string);
const initialTab = computed(() => (route.query.tab as string) || undefined);

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
  router.back();
}

watch(recommendationId, () => void load());
watch(
  () => orderIntentStore.revision,
  () => void load(),
);
onMounted(() => void load());
</script>

<template>
  <Page auto-content-height>
    <DetailBackNav
      :label="$t('page.quantRecommendations.back')"
      @back="goBack"
    />
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
  </Page>
</template>
