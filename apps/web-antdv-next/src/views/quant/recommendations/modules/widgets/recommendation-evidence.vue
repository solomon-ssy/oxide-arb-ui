<script lang="ts" setup>
import type { QuantEvidenceView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import {
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Typography,
} from 'antdv-next';

import { getRecommendationEvidence } from '#/api/quant-recommendations';
import { $t } from '#/locales';
import { EMPTY_PLACEHOLDER } from '#/shared/components/format';

defineOptions({ name: 'RecommendationEvidence' });

const props = defineProps<{ active: boolean; recommendationId: string }>();

const { handleRequest } = useRequestHandler();
const { Text } = Typography;

const evidence = ref<null | QuantEvidenceView>(null);
const loading = ref(false);
let loaded = false;

/** Single-value replay handles rendered as copyable rows. */
const handleRows = computed<Array<{ label: string; value: string }>>(() => {
  const view = evidence.value;
  if (!view) {
    return [];
  }
  return [
    {
      label: $t('page.quantRecommendations.evidence.signalCandidate'),
      value: view.signal_candidate_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.featureVector'),
      value: view.feature_vector_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.modelRun'),
      value: view.model_run_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.marketSelection'),
      value: view.market_selection_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.bookSnapshot'),
      value: view.book_snapshot_ref,
    },
    {
      label: $t('page.quantRecommendations.evidence.runtimeConfig'),
      value: view.runtime_config_version_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.modelVersion'),
      value: view.model_version_id,
    },
    {
      label: $t('page.quantRecommendations.evidence.dataQualitySnapshot'),
      value: view.data_quality_snapshot_ref,
    },
  ];
});

async function loadOnce() {
  if (loaded) {
    return;
  }
  loaded = true;
  loading.value = true;
  try {
    evidence.value = await handleRequest(
      () => getRecommendationEvidence(props.recommendationId),
      { silent: true },
    );
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      void loadOnce();
    }
  },
  { immediate: true },
);
</script>

<template>
  <Spin :spinning="loading">
    <Descriptions v-if="evidence" :column="1" bordered size="small">
      <DescriptionsItem
        v-for="row in handleRows"
        :key="row.label"
        :label="row.label"
      >
        <Text
          class="font-mono text-xs break-all"
          copyable
          :aria-label="`${row.label}: ${row.value}`"
        >
          {{ row.value }}
        </Text>
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.quantRecommendations.evidence.factorDefinitions')"
      >
        <div
          v-if="evidence.factor_definition_versions.length > 0"
          class="flex flex-col gap-1"
        >
          <Text
            v-for="version in evidence.factor_definition_versions"
            :key="version"
            class="font-mono text-xs break-all"
            copyable
            :aria-label="version"
          >
            {{ version }}
          </Text>
        </div>
        <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
      </DescriptionsItem>
    </Descriptions>
    <Empty
      v-else-if="!loading"
      :description="$t('page.quantRecommendations.evidence.empty')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
  </Spin>
</template>
