<script lang="ts" setup>
import type {
  CpcvFrozenContract,
  CpcvRequestBody,
} from './model-cpcv-contract';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Descriptions, DescriptionsItem, message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { getModelSpec } from '#/api/research';
import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';
import { formatDurationSecs } from '#/shared/components/format';

import {
  cpcvFrozenContractFromSpec,
  cpcvRequestBody,
} from './model-cpcv-contract';

defineOptions({ name: 'ModelCpcvModal' });

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type CpcvBody = CpcvRequestBody;

export interface ModelCpcvPayload {
  modelVersionId: string;
  modelSpecId: string;
  trainingDatasetId?: string;
  onSubmit: (body: CpcvBody) => Promise<boolean>;
}

interface OptionItem {
  label: string;
  value: string;
}

const SELL_MODEL_FAMILY = 'hold_vs_exit_weighted';

const { handleRequest } = useRequestHandler();

const payload = ref<ModelCpcvPayload | null>(null);
const frozenContract = ref<CpcvFrozenContract | null>(null);
const contractLoaded = ref(false);
const isSellFamily = computed(
  () => frozenContract.value?.modelFamily === SELL_MODEL_FAMILY,
);
const cpcvHint = computed(() =>
  isSellFamily.value
    ? $t('page.research.models.cpcv.sellDualTrackHint')
    : $t('page.research.models.cpcv.dualTrackHint'),
);
const cpcvSummary = computed(() =>
  isSellFamily.value
    ? $t('page.research.models.cpcv.sellSummary')
    : $t('page.research.models.cpcv.summary'),
);

async function loadOptions() {
  const versions = await handleRequest(
    () => fetchRuntimeConfigVersions({ limit: 200 }),
    { silent: true },
  );
  const versionOptions: OptionItem[] = (versions ?? []).map((version) => ({
    label: version.runtime_config_version_id,
    value: version.runtime_config_version_id,
  }));
  formApi.updateSchema([
    {
      componentProps: { optionFilterProp: 'label', options: versionOptions },
      fieldName: 'runtime_config_version_id',
    },
  ]);
}

async function loadFrozenContract() {
  const currentPayload = payload.value;
  if (!currentPayload) {
    return;
  }
  const modelSpecId = currentPayload.modelSpecId;
  contractLoaded.value = false;
  const spec = await handleRequest(() => getModelSpec(modelSpecId), {
    silent: true,
  });
  if (payload.value?.modelSpecId !== modelSpecId) {
    return;
  }
  frozenContract.value = spec ? cpcvFrozenContractFromSpec(spec) : null;
  contractLoaded.value = true;
}

async function onSubmit(values: Record<string, unknown>) {
  if (!payload.value) {
    return;
  }
  if (!frozenContract.value) {
    message.error($t('page.research.models.cpcv.contractUnavailable'));
    return;
  }
  modalApi.lock();
  try {
    const ok = await payload.value.onSubmit(cpcvRequestBody(values));
    if (ok) {
      modalApi.close();
    }
  } finally {
    modalApi.unlock();
  }
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  handleSubmit: onSubmit,
  schema: [
    {
      component: 'Input',
      componentProps: {
        readonly: true,
      },
      fieldName: 'training_dataset_id',
      label: $t('page.research.models.cpcv.trainingDataset'),
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        optionFilterProp: 'label',
        options: [],
        showSearch: true,
      },
      fieldName: 'runtime_config_version_id',
      label: $t('page.research.models.cpcv.runtimeConfigVersion'),
      rules: 'selectRequired',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm: () => formApi.validateAndSubmitForm(),
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelCpcvPayload>();
      frozenContract.value = null;
      contractLoaded.value = false;
      formApi.resetForm();
      formApi.setValues({
        training_dataset_id: payload.value?.trainingDatasetId || undefined,
      });
      void loadOptions();
      void loadFrozenContract();
    }
  },
});
</script>

<template>
  <Modal :title="$t('page.research.models.cpcv.title')">
    <Alert class="mb-4" :message="cpcvHint" show-icon type="info" />
    <p class="text-muted-foreground mb-4 text-sm">
      {{ cpcvSummary }}
    </p>
    <Alert
      class="mb-4"
      :description="$t('page.research.models.cpcv.frozenContractHint')"
      :message="$t('page.research.models.cpcv.frozenContractTitle')"
      show-icon
      type="info"
    />
    <Descriptions
      v-if="frozenContract"
      class="mb-4"
      :column="2"
      bordered
      size="small"
    >
      <DescriptionsItem :label="$t('page.research.models.cpcv.modelFamily')">
        <code>{{ frozenContract.modelFamily }}</code>
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.models.cpcv.labelName')">
        <code>{{ frozenContract.targetLabelName }}</code>
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.models.cpcv.labelHorizonSecs')"
      >
        {{ formatDurationSecs(frozenContract.targetLabelHorizonSecs) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.models.cpcv.predictionHorizonSecs')"
      >
        {{ formatDurationSecs(frozenContract.predictionHorizonSecs) }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.models.cpcv.validationFolds')"
      >
        {{ frozenContract.validationFolds }}
      </DescriptionsItem>
      <DescriptionsItem :label="$t('page.research.models.cpcv.rawInputs')">
        {{ frozenContract.rawInputCount }}
      </DescriptionsItem>
    </Descriptions>
    <Alert
      v-else-if="contractLoaded"
      class="mb-4"
      :message="$t('page.research.models.cpcv.contractUnavailable')"
      show-icon
      type="error"
    />
    <Form />
  </Modal>
</template>
