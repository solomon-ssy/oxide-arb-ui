<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Button, Empty, Spin } from 'antdv-next';

import { getRecommendation } from '#/api/quant-recommendations';
import { $t } from '#/locales';
import { useOrderIntentStore } from '#/store';

import RecommendationDetailPanel from './modules/recommendation-detail-panel.vue';

defineOptions({ name: 'RecommendationDetailPage' });

const route = useRoute();
const router = useRouter();
const { handleRequest } = useRequestHandler();
const orderIntentStore = useOrderIntentStore();

const recommendation = ref<null | QuantRecommendationView>(null);
const loading = ref(false);

const recommendationId = computed(() => route.params.id as string);

async function load() {
  if (!recommendationId.value) {
    return;
  }
  loading.value = true;
  try {
    recommendation.value = await handleRequest(
      () => getRecommendation(recommendationId.value),
      { silent: true },
    );
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
    <div class="mb-4">
      <Button type="link" @click="goBack">
        {{ $t('page.quantRecommendations.back') }}
      </Button>
    </div>
    <Spin :spinning="loading">
      <RecommendationDetailPanel
        v-if="recommendation"
        :recommendation="recommendation"
      />
      <Empty
        v-else-if="!loading"
        :description="$t('page.quantRecommendations.notFound')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </Spin>
  </Page>
</template>
