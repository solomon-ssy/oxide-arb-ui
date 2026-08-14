<script lang="ts" setup>
import type {
  FeatureParityRunListQuery,
  FeatureParityRunView,
} from '@vben/types';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
} from 'antdv-next';

import { listFeatureParityRuns } from '#/api/research';
import { $t } from '#/locales';
import EnumTag from '#/shared/components/enum-tag.vue';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'SubjectParityPanel' });

const props = defineProps<{
  modelVersionId?: null | string;
  reportId?: null | string;
  trainingDatasetId?: null | string;
}>();

const { handleRequest } = useRequestHandler();
const router = useRouter();
const loading = ref(false);
const loadError = ref(false);
const run = ref<FeatureParityRunView | null>(null);

const query = computed<FeatureParityRunListQuery>(() => ({
  model_version_id: props.modelVersionId || undefined,
  report_id: props.reportId || undefined,
  size: 1,
  training_dataset_id: props.trainingDatasetId || undefined,
}));
const hasSubject = computed(
  () => !!props.modelVersionId || !!props.reportId || !!props.trainingDatasetId,
);

async function load() {
  if (!hasSubject.value) {
    run.value = null;
    loadError.value = false;
    return;
  }
  loading.value = true;
  loadError.value = false;
  try {
    const result = await handleRequest(
      () => listFeatureParityRuns(query.value),
      {
        silent: true,
        onError: () => {
          loadError.value = true;
        },
      },
    );
    run.value = result?.items[0] ?? null;
  } finally {
    loading.value = false;
  }
}

function openIntegrity() {
  if (!run.value) return;
  void router.push({
    path: '/research/data-reliability',
    query: {
      entity: 'parity-run',
      id: run.value.parity_run_id,
      module: 'feature-integrity',
    },
  });
}

watch(query, () => void load(), { deep: true, immediate: true });
</script>

<template>
  <Spin :spinning="loading">
    <Alert
      v-if="loadError"
      :message="$t('page.research.featureIntegrity.entity.loadError')"
      show-icon
      type="warning"
    />
    <Empty
      v-else-if="!run"
      :description="$t('page.research.featureIntegrity.entity.empty')"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
    />
    <template v-else>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex gap-2">
          <EnumTag
            context="subject-parity-panel.kind"
            name="FeatureParityRunKind"
            :value="run.kind"
          />
          <EnumTag
            context="subject-parity-panel.status"
            name="FeatureParityRunStatus"
            :value="run.status"
          />
        </div>
        <Button size="small" type="link" @click="openIntegrity">
          {{ $t('page.research.featureIntegrity.entity.open') }}
        </Button>
      </div>
      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.runId')"
          :span="2"
        >
          <span class="font-mono text-xs break-all">{{
            run.parity_run_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.compared')"
        >
          {{ run.compared_count }} / {{ run.total_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.mismatched')"
        >
          {{ run.mismatched_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.pending')"
        >
          {{ run.pending_materialization_count }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.featureIntegrity.columns.finishedAt')"
        >
          {{ formatDateTimeLocal(run.finished_at) }}
        </DescriptionsItem>
      </Descriptions>
    </template>
  </Spin>
</template>
