<script lang="ts" setup>
import type {
  TradePolicyFitContract,
  TradePolicyFitPreflightView,
  TrainingDatasetView,
} from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { Alert, Descriptions, DescriptionsItem, message } from 'antdv-next';

import { useVbenForm } from '#/adapter/form';
import { listTrainingDatasets } from '#/api/research';
import { preflightTradePolicy } from '#/api/trade-policies';
import { $t } from '#/locales';

defineOptions({ name: 'TradePolicyFitModal' });

export interface TradePolicyFitModalData {
  onSubmit: (contract: TradePolicyFitContract) => Promise<boolean>;
}

const { handleRequest } = useRequestHandler();
const payload = ref<null | TradePolicyFitModalData>(null);
const datasets = ref(new Map<string, TrainingDatasetView>());
const preflight = ref<null | TradePolicyFitPreflightView>(null);
const pendingContract = ref<null | TradePolicyFitContract>(null);

function checkPassed(status: 'fail' | 'pass'): boolean {
  return status === 'pass';
}

function parseNotionalTiers(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

async function collectContract(): Promise<null | TradePolicyFitContract> {
  const validation = await formApi.validate();
  if (Object.keys(validation?.errors ?? {}).length > 0) {
    return null;
  }
  const values = await formApi.getValues();
  const dataset = datasets.value.get(String(values.source_dataset_id ?? ''));
  const window = values.fit_window as [string, string] | undefined;
  const notionalTiers = parseNotionalTiers(values.notional_tiers);
  if (!dataset || !window || notionalTiers.length === 0) {
    message.warning($t('page.research.tradePolicies.fit.incomplete'));
    return null;
  }
  return {
    embargo_secs: Number(values.embargo_secs),
    fit_window_end: window[1],
    fit_window_start: window[0],
    maximum_scale_out_targets: Number(values.maximum_scale_out_targets),
    minimum_executable_coverage: String(values.minimum_executable_coverage),
    notional_tiers: notionalTiers,
    runtime_config_version_id: dataset.runtime_config_version_id,
    source_dataset_id: dataset.training_dataset_id,
  };
}

async function handleConfirm() {
  if (!payload.value) {
    return;
  }
  if (!pendingContract.value) {
    const contract = await collectContract();
    if (!contract) {
      return;
    }
    modalApi.lock();
    try {
      const result = await handleRequest(() =>
        preflightTradePolicy({ contract }),
      );
      if (result) {
        preflight.value = result;
        pendingContract.value = contract;
        modalApi.setState({
          confirmText: $t('page.research.tradePolicies.fit.enqueue'),
        });
      }
    } finally {
      modalApi.unlock();
    }
    return;
  }
  modalApi.lock();
  try {
    if (await payload.value.onSubmit(pendingContract.value)) {
      modalApi.close();
    }
  } finally {
    modalApi.unlock();
  }
}

async function loadDatasets() {
  const page = await handleRequest(
    () => listTrainingDatasets({ size: 200, status: 'ready' }),
    { silent: true },
  );
  const rows = page?.items ?? [];
  datasets.value = new Map(rows.map((row) => [row.training_dataset_id, row]));
  formApi.updateSchema([
    {
      componentProps: {
        onChange: (id: string) => {
          const row = datasets.value.get(id);
          if (row) {
            formApi.setValues({
              fit_window: [row.window_start, row.window_end],
            });
          }
        },
        optionFilterProp: 'label',
        options: rows.map((row) => ({
          label: `${row.training_dataset_id} · ${row.window_start}`,
          value: row.training_dataset_id,
        })),
        showSearch: true,
      },
      fieldName: 'source_dataset_id',
    },
  ]);
}

const [Form, formApi] = useVbenForm({
  commonConfig: { componentProps: { class: 'w-full' } },
  schema: [
    {
      component: 'Select',
      componentProps: { options: [], showSearch: true },
      fieldName: 'source_dataset_id',
      label: $t('page.research.tradePolicies.fit.dataset'),
      rules: 'selectRequired',
    },
    {
      component: 'RangePicker',
      componentProps: {
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'fit_window',
      label: $t('page.research.tradePolicies.fit.window'),
      rules: 'selectRequired',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 1 },
      defaultValue: 86_400,
      fieldName: 'embargo_secs',
      label: $t('page.research.tradePolicies.fit.embargoSecs'),
      rules: 'required',
    },
    {
      component: 'Input',
      defaultValue: '25,100,500',
      fieldName: 'notional_tiers',
      help: $t('page.research.tradePolicies.fit.notionalTiersHelp'),
      label: $t('page.research.tradePolicies.fit.notionalTiers'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { max: 3, min: 0 },
      defaultValue: 3,
      fieldName: 'maximum_scale_out_targets',
      label: $t('page.research.tradePolicies.fit.maxScaleOutTargets'),
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { max: 1, min: 0.01, step: 0.01 },
      defaultValue: 0.8,
      fieldName: 'minimum_executable_coverage',
      label: $t('page.research.tradePolicies.fit.minimumCoverage'),
      rules: 'required',
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onCancel() {
    if (pendingContract.value) {
      pendingContract.value = null;
      preflight.value = null;
      modalApi.setState({
        confirmText: $t('page.research.tradePolicies.fit.preflight'),
      });
      return;
    }
    modalApi.close();
  },
  onConfirm: handleConfirm,
  onOpenChange(open) {
    if (!open) {
      return;
    }
    payload.value = modalApi.getData<TradePolicyFitModalData>();
    pendingContract.value = null;
    preflight.value = null;
    formApi.resetForm();
    modalApi.setState({
      cancelText: $t('common.cancel'),
      confirmText: $t('page.research.tradePolicies.fit.preflight'),
      title: $t('page.research.tradePolicies.fit.title'),
    });
    void loadDatasets();
  },
});
</script>

<template>
  <Modal>
    <div v-if="preflight" class="flex flex-col gap-3">
      <Alert
        :message="
          checkPassed(preflight.publishable_input)
            ? $t('page.research.tradePolicies.fit.publishable')
            : $t('page.research.tradePolicies.fit.shadowOnly')
        "
        show-icon
        :type="checkPassed(preflight.publishable_input) ? 'success' : 'warning'"
      />
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.fit.contractValid')"
        >
          {{ checkPassed(preflight.contract_valid) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.fit.datasetReady')"
        >
          {{ checkPassed(preflight.source_dataset_ready) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.tradePolicies.fit.fullL2')">
          {{ checkPassed(preflight.full_l2_trajectory_present) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.tradePolicies.fit.fees')">
          {{ checkPassed(preflight.fee_model_present) }}
        </DescriptionsItem>
      </Descriptions>
      <Alert
        v-for="item in preflight.messages"
        :key="item"
        :message="item"
        show-icon
        type="info"
      />
    </div>
    <div v-else class="flex flex-col gap-3">
      <Alert
        :message="$t('page.research.tradePolicies.fit.hint')"
        show-icon
        type="info"
      />
      <Form />
    </div>
  </Modal>
</template>

<style scoped>
:deep(.ant-input-number),
:deep(.ant-select),
:deep(.ant-picker) {
  width: 100%;
}
</style>
