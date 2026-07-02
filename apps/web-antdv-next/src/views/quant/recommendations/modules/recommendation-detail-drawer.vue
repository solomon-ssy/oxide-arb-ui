<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { $t } from '#/locales';

import RecommendationDetailPanel from './recommendation-detail-panel.vue';

defineOptions({ name: 'RecommendationDetailDrawer' });

interface RecommendationDrawerData {
  recommendation: QuantRecommendationView;
}

const recommendation = ref<null | QuantRecommendationView>(null);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<RecommendationDrawerData>();
      recommendation.value = data.recommendation;
    } else {
      recommendation.value = null;
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.quantRecommendations.title')"
    class="w-full max-w-5xl"
  >
    <RecommendationDetailPanel
      v-if="recommendation"
      :recommendation="recommendation"
    />
  </Drawer>
</template>
