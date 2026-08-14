<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';

import { Button } from 'antdv-next';

import { getRecommendation } from '#/api/quant-recommendations';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
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
  <Page auto-content-height>
    <Button class="mb-4" type="link" @click="goBack">
      <IconifyIcon class="mr-1 size-4" icon="lucide:arrow-left" />
      {{ $t('page.quantRecommendations.back') }}
    </Button>
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
