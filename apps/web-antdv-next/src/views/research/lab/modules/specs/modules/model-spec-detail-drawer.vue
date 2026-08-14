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
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { enumOption, enumOptions } from '#/shared/presentation/enum-options';

import InputContractEditor from './input-contract-editor.vue';
import {
  trainingTargetHorizon,
  trainingTargetLabel,
} from './model-training-contract';

defineOptions({ name: 'ModelSpecDetailDrawer' });

interface ModelSpecDrawerData {
  spec: QuantModelSpecView;
}

const router = useRouter();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();

const familyTagOptions = enumOptions('ModelFamily');

const canCreateDataset = hasAccessByCodes(['materialization:create']);

const spec = ref<null | QuantModelSpecView>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const familyTag = computed(() =>
  enumOption(familyTagOptions, spec.value?.model_family),
);

const targetLabel = computed(() =>
  spec.value ? trainingTargetLabel(spec.value.training_contract.target) : '—',
);

const targetHorizon = computed(() =>
  spec.value ? trainingTargetHorizon(spec.value.training_contract.target) : 0,
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
    path: '/research/lab',
    query: { model_spec_id: spec.value.model_spec_id, module: 'datasets' },
  });
}

function goToTrainedModels() {
  if (!spec.value) {
    return;
  }
  void router.push({
    path: '/research/lab',
    query: { model_spec_id: spec.value.model_spec_id, module: 'models' },
  });
}

function goToEvaluationPolicy() {
  const artifactId =
    spec.value?.training_contract.evaluation_trade_policy_artifact_id;
  if (artifactId) {
    void router.push(
      `/research/learning-policy?module=policies&entity=trade-policy&id=${artifactId}`,
    );
  }
}

const [, drawerApi] = useVbenDrawer({
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
  <WorkspaceInspectorSurface
    :drawer-api="drawerApi"
    :title="$t('page.research.modelSpecs.detail.title')"
  >
    <Spin :spinning="loading">
      <div v-if="spec" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
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
              :label="$t('page.research.modelSpecs.detail.definitionHash')"
            >
              <span class="font-mono text-xs break-all">
                {{ spec.definition_hash }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.modelSpecs.detail.governance')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.createdBy')"
            >
              {{ spec.created_by_label }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.createdByRole')"
            >
              {{ spec.created_by_role || '—' }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.createdByUserId')"
            >
              <span v-if="spec.created_by_user_id" class="font-mono text-xs">
                {{ spec.created_by_user_id }}
              </span>
              <span v-else>—</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.creationReason')"
            >
              <p class="whitespace-pre-wrap">{{ spec.reason }}</p>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.modelSpecs.detail.inputContract')"
        >
          <InputContractEditor :model-value="spec.input_contract" read-only />
        </Card>

        <Card
          size="small"
          :title="$t('page.research.modelSpecs.detail.trainingContract')"
        >
          <Descriptions :column="1" size="small">
            <DescriptionsItem
              :label="
                $t('page.research.modelSpecs.trainingContract.targetTask')
              "
            >
              {{
                $t(
                  `page.research.modelSpecs.trainingContract.targets.${spec.training_contract.target.kind}`,
                )
              }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.modelSpecs.trainingContract.targetLabel')
              "
            >
              <code>{{ targetLabel }}</code>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.modelSpecs.trainingContract.targetHorizon')
              "
            >
              {{ targetHorizon }}s
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.research.modelSpecs.trainingContract.validationFolds')
              "
            >
              {{ spec.training_contract.validation_folds }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t(
                  'page.research.modelSpecs.trainingContract.evaluationTradePolicy',
                )
              "
            >
              <Button
                v-if="
                  spec.training_contract.evaluation_trade_policy_artifact_id
                "
                class="h-auto p-0"
                type="link"
                @click="goToEvaluationPolicy"
              >
                {{ spec.training_contract.evaluation_trade_policy_artifact_id }}
              </Button>
              <span v-else>—</span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.research.modelSpecs.detail.thesis')"
        >
          <Descriptions :column="1" size="small">
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.thesisSummary')"
            >
              <p class="whitespace-pre-wrap">{{ spec.thesis.summary }}</p>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.thesisHypothesis')"
            >
              <p class="whitespace-pre-wrap">{{ spec.thesis.hypothesis }}</p>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.research.modelSpecs.detail.thesisLimitations')"
            >
              <ul class="list-disc space-y-1 pl-5">
                <li v-for="item in spec.thesis.limitations" :key="item">
                  {{ item }}
                </li>
              </ul>
            </DescriptionsItem>
          </Descriptions>
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
  </WorkspaceInspectorSurface>
</template>
