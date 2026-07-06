<script lang="ts" setup>
import type { QuantModelSpecView } from '@vben/types';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Spin,
  Tag,
} from 'antdv-next';

import { getModelSpec } from '#/api/research';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useModelFamilyTagOptions,
  usePublicationStatusTagOptions,
} from '#/shared/components/format/tag-options';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';
import { useQpAccess } from '#/shared/composables/use-qp-access';

defineOptions({ name: 'ModelSpecDetailDrawer' });

interface ModelSpecDrawerData {
  spec: QuantModelSpecView;
}

const router = useRouter();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();

const statusTagOptions = usePublicationStatusTagOptions();
const familyTagOptions = useModelFamilyTagOptions();

const canCreateDataset = hasAccessByCodes(['materialization:create']);

const spec = ref<null | QuantModelSpecView>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const statusTag = computed(() =>
  findTagOption(statusTagOptions, spec.value?.status),
);
const familyTag = computed(() =>
  findTagOption(familyTagOptions, spec.value?.model_family),
);

async function refresh(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getModelSpec(id), { silent: true });
    if (openId.value === id) {
      spec.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

function goToDatasets() {
  if (!spec.value) {
    return;
  }
  void router.push({
    path: '/research/datasets',
    query: { model_spec_id: spec.value.model_spec_id },
  });
}

function goToTrainedModels() {
  if (!spec.value) {
    return;
  }
  void router.push({
    path: '/research/models',
    query: { model_spec_id: spec.value.model_spec_id },
  });
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<ModelSpecDrawerData>();
      openId.value = data.spec.model_spec_id;
      spec.value = data.spec;
      void refresh(data.spec.model_spec_id);
    } else {
      openId.value = null;
      spec.value = null;
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.research.modelSpecs.detail.title')"
    class="w-full max-w-2xl"
  >
    <Spin :spinning="loading">
      <div v-if="spec" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <Tag :color="statusTag?.color">{{ statusTag?.label }}</Tag>
          <Tag :color="familyTag?.color">{{ familyTag?.label }}</Tag>
        </div>

        <Card
          size="small"
          :title="$t('page.research.modelSpecs.detail.summary')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.columns.specId')"
            >
              <span class="font-mono text-xs break-all">
                {{ spec.model_spec_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.columns.name')"
            >
              {{ spec.name }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.columns.predictionHorizon')"
            >
              {{ spec.prediction_horizon_secs }}s
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.modelSpecs.detail.featureSchemaVersion')
              "
            >
              {{ spec.feature_schema_version }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.labelSchemaVersion')"
            >
              {{ spec.label_schema_version }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.columns.createdAt')"
            >
              {{ formatDateTimeLocal(spec.created_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.updatedAt')"
            >
              {{ formatDateTimeLocal(spec.updated_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.modelSpecs.detail.specJson')"
        >
          <JsonEditorShell
            :model-value="spec.spec_json"
            read-only
            variant="field"
          />
        </Card>

        <Card
          size="small"
          :title="$t('page.research.modelSpecs.detail.nextSteps')"
        >
          <p class="text-muted-foreground mb-3 text-sm">
            {{ $t('page.research.modelSpecs.detail.nextStepsHelp') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="canCreateDataset"
              type="primary"
              @click="goToDatasets()"
            >
              {{ $t('page.research.modelSpecs.detail.buildDataset') }}
            </Button>
            <Button @click="goToTrainedModels()">
              {{ $t('page.research.modelSpecs.detail.viewTrainedModels') }}
            </Button>
          </div>
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
