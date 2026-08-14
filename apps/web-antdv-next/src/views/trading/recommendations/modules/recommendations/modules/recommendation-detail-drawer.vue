<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { getRecommendation } from '#/api/quant-recommendations';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import { useOrderIntentStore } from '#/store';

import RecommendationDetailPanel from './recommendation-detail-panel.vue';

defineOptions({ name: 'RecommendationDetailDrawer' });

interface RecommendationDrawerData {
  recommendation: QuantRecommendationView;
}

const { handleRequest } = useRequestHandler();
const orderIntentStore = useOrderIntentStore();

const recommendation = ref<null | QuantRecommendationView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
/** Recommendation id while the drawer is open; drives WS-driven refetch. */
const openRecommendationId = ref<null | string>(null);

const notFound = computed(
  () => !recommendation.value && !loading.value && !loadError.value,
);

async function refreshRecommendation(id: string) {
  loading.value = true;
  loadError.value = null;
  try {
    const fresh = await handleRequest(() => getRecommendation(id), {
      silent: true,
      onError: (err) => {
        if (err.httpStatus !== 404) {
          loadError.value = err.message;
        }
      },
    });
    if (openRecommendationId.value === id) {
      recommendation.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<RecommendationDrawerData>();
      openRecommendationId.value = data.recommendation.recommendation_id;
      loadError.value = null;
      // Seed from the list row for instant paint, then fetch the authoritative view.
      recommendation.value = data.recommendation;
      void refreshRecommendation(data.recommendation.recommendation_id);
    } else {
      openRecommendationId.value = null;
      recommendation.value = null;
      loadError.value = null;
    }
  },
});

function retry() {
  const id = openRecommendationId.value;
  if (id) {
    void refreshRecommendation(id);
  }
}

watch(
  () => orderIntentStore.revision,
  () => {
    const id = openRecommendationId.value;
    if (id) {
      void refreshRecommendation(id);
    }
  },
);
</script>

<template>
  <Drawer
    :title="$t('page.quantRecommendations.title')"
    class="w-full max-w-5xl"
  >
    <AsyncState
      :error-message="loadError"
      :loading="loading && !recommendation"
      :not-found="notFound"
      :not-found-text="$t('page.quantRecommendations.notFound')"
      @retry="retry"
    >
      <RecommendationDetailPanel
        v-if="recommendation"
        :recommendation="recommendation"
      />
    </AsyncState>
  </Drawer>
</template>
