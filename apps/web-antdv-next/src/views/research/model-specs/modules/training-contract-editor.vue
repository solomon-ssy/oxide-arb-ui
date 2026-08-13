<script lang="ts" setup>
import type {
  ModelTrainingContract,
  TradePolicySummaryView,
} from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Descriptions,
  DescriptionsItem,
  InputNumber,
  Select,
} from 'antdv-next';

import { listTradePolicies } from '#/api/trade-policies';
import { $t } from '#/locales';

import {
  trainingTargetHorizon,
  trainingTargetLabel,
} from './model-training-contract';

defineOptions({ name: 'TrainingContractEditor' });

const model = defineModel<ModelTrainingContract>({ required: true });
const { handleRequest } = useRequestHandler();
const policyLoading = ref(false);
const publishedPolicies = ref<TradePolicySummaryView[]>([]);

const targetLabel = computed(() => trainingTargetLabel(model.value.target));

const targetHorizon = computed(() => trainingTargetHorizon(model.value.target));

const targetName = computed(() =>
  $t(
    `page.research.modelSpecs.trainingContract.targets.${model.value.target.kind}`,
  ),
);

const validationFolds = computed({
  get: () => model.value.validation_folds,
  set: (value: null | number) => {
    model.value = { ...model.value, validation_folds: value as number };
  },
});

const evaluationPolicyId = computed({
  get: () => model.value.evaluation_trade_policy_artifact_id ?? undefined,
  set: (value: string | undefined) => {
    model.value = {
      ...model.value,
      evaluation_trade_policy_artifact_id: value ?? null,
    };
  },
});

const policyOptions = computed(() =>
  publishedPolicies.value.map((policy) => ({
    label: `${policy.artifact_id} · ${policy.executable_coverage ?? '—'}`,
    value: policy.artifact_id,
  })),
);

async function loadPublishedPolicies() {
  policyLoading.value = true;
  try {
    const policies = await handleRequest(async () => {
      const rows: TradePolicySummaryView[] = [];
      let page = 1;
      let hasNext = true;
      while (hasNext) {
        const result = await listTradePolicies({
          page,
          size: 100,
          status: 'published',
        });
        rows.push(
          ...result.items.filter(
            (policy) => policy.status === 'published' && policy.publishable,
          ),
        );
        hasNext = result.has_next;
        page += 1;
      }
      return rows;
    });
    publishedPolicies.value = policies ?? [];
  } finally {
    policyLoading.value = false;
  }
}

onMounted(() => {
  void loadPublishedPolicies();
});
</script>

<template>
  <div class="flex flex-col gap-3">
    <Descriptions :column="1" size="small">
      <DescriptionsItem
        :label="$t('page.research.modelSpecs.trainingContract.targetTask')"
      >
        {{ targetName }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.modelSpecs.trainingContract.targetLabel')"
      >
        <code>{{ targetLabel }}</code>
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.modelSpecs.trainingContract.targetHorizon')"
      >
        {{ targetHorizon }}s
      </DescriptionsItem>
    </Descriptions>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <label class="flex flex-col gap-1 md:col-span-2">
        <span class="text-xs font-medium">
          {{
            $t(
              'page.research.modelSpecs.trainingContract.evaluationTradePolicy',
            )
          }}
        </span>
        <Select
          v-model:value="evaluationPolicyId"
          allow-clear
          :loading="policyLoading"
          :options="policyOptions"
          option-filter-prop="label"
          :placeholder="
            $t(
              'page.research.modelSpecs.trainingContract.evaluationTradePolicyPlaceholder',
            )
          "
          show-search
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs font-medium">
          {{ $t('page.research.modelSpecs.trainingContract.validationFolds') }}
        </span>
        <InputNumber
          v-model:value="validationFolds"
          :max="20"
          :min="2"
          :precision="0"
        />
      </label>
    </div>

    <Alert
      :message="$t('page.research.modelSpecs.trainingContract.help')"
      show-icon
      type="info"
    />
  </div>
</template>

<style scoped>
:deep(.ant-input-number),
:deep(.ant-select) {
  width: 100%;
}
</style>
