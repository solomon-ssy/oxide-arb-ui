<script lang="ts" setup>
import type { TrainingDatasetView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { isTrainableDatasetStatus } from '@vben/types';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Spin,
  Tag,
} from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { getTrainingDataset } from '#/api/research';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useTrainingDatasetStatusTagOptions,
} from '#/shared/components/format/tag-options';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';
import { usePolling } from '#/shared/composables/use-polling';

defineOptions({ name: 'DatasetDetailDrawer' });

const emit = defineEmits<{ train: [dataset: TrainingDatasetView] }>();

interface DatasetDrawerData {
  dataset: TrainingDatasetView;
}

/** Non-terminal statuses are still materializing — poll until they settle. */
const NON_TERMINAL = new Set(['building', 'planned']);

const { handleRequest } = useRequestHandler();
const statusTagOptions = useTrainingDatasetStatusTagOptions();

const dataset = ref<null | TrainingDatasetView>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const coverage = computed(() => dataset.value?.coverage_json ?? {});
const statusTag = computed(() =>
  findTagOption(statusTagOptions, dataset.value?.status),
);
const canTrain = computed(
  () => !!dataset.value && isTrainableDatasetStatus(dataset.value.status),
);
const polling = computed(
  () =>
    !!openId.value && !!dataset.value && NON_TERMINAL.has(dataset.value.status),
);

async function refresh(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getTrainingDataset(id), {
      silent: true,
    });
    if (openId.value === id) {
      dataset.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

// Poll while the dataset is still building (WS is a hint, not the truth source).
usePolling(
  () => {
    const id = openId.value;
    if (id) {
      void refresh(id);
    }
  },
  { enabled: polling, intervalMs: 4000 },
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<DatasetDrawerData>();
      openId.value = data.dataset.training_dataset_id;
      dataset.value = data.dataset;
      void refresh(data.dataset.training_dataset_id);
    } else {
      openId.value = null;
      dataset.value = null;
    }
  },
});

function onTrain() {
  if (dataset.value) {
    emit('train', dataset.value);
  }
}
</script>

<template>
  <Drawer
    :title="$t('page.research.datasets.detail.title')"
    class="w-full max-w-3xl"
  >
    <Spin :spinning="loading">
      <div v-if="dataset" class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <Tag :color="statusTag?.color">{{ statusTag?.label }}</Tag>
          <Button v-if="canTrain" type="primary" @click="onTrain">
            {{ $t('page.research.datasets.actions.train') }}
          </Button>
        </div>

        <Card size="small" :title="$t('page.research.datasets.detail.summary')">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.datasetId')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.training_dataset_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.modelSpec')"
            >
              {{ dataset.model_spec_id }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.runtimeConfigVersion')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.runtime_config_version_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.windowStart')"
            >
              {{ formatDateTimeLocal(dataset.window_start) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.windowEnd')"
            >
              {{ formatDateTimeLocal(dataset.window_end) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.columns.sampleCount')"
            >
              {{ dataset.sample_count }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.datasetHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.dataset_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.datasets.detail.parquetUri')"
            >
              <span class="font-mono text-xs break-all">
                {{ dataset.parquet_uri }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.datasets.detail.coverage')"
        >
          <JsonEditorShell
            :model-value="coverage"
            :mode="Mode.tree"
            read-only
          />
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
