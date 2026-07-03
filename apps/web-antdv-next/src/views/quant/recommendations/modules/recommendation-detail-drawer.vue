<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Spin } from 'antdv-next';

import { getRecommendation } from '#/api/quant-recommendations';
import { $t } from '#/locales';
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
/** Recommendation id while the drawer is open; drives WS-driven refetch. */
const openRecommendationId = ref<null | string>(null);

async function refreshRecommendation(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getRecommendation(id), {
      silent: true,
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
      // Seed from the list row for instant paint, then fetch the authoritative view.
      recommendation.value = data.recommendation;
      void refreshRecommendation(data.recommendation.recommendation_id);
    } else {
      openRecommendationId.value = null;
      recommendation.value = null;
    }
  },
});

// Intent lifecycle (local create or `quant.intent` WS elsewhere) must converge gate fields.
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
    <Spin :spinning="loading">
      <RecommendationDetailPanel
        v-if="recommendation"
        :recommendation="recommendation"
      />
    </Spin>
  </Drawer>
</template>
