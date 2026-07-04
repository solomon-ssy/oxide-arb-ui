<script lang="ts" setup>
import type { StepItem } from 'antdv-next';

import type {
  BuildTrainingDatasetRequest,
  TrainingDatasetPlanView,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  DatePicker,
  Descriptions,
  DescriptionsItem,
  Input,
  InputNumber,
  message,
  Select,
  Steps,
} from 'antdv-next';

import { listModelSpecs } from '#/api/research';
import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';

defineOptions({ name: 'DatasetFormModal' });

const RangePicker = DatePicker.RangePicker;

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type DatasetFormBody = Omit<BuildTrainingDatasetRequest, 'reason'>;

export interface DatasetFormPayload {
  /**
   * `build-direct` materializes in one governed step; `plan-wizard` first
   * dry-runs a sample count, then materializes reusing the plan's dataset id.
   */
  mode: 'build-direct' | 'plan-wizard';
  /** Governed build; resolves `true` on success so the wizard can close. */
  onBuild: (body: DatasetFormBody) => Promise<boolean>;
  /** Governed dry-run plan; resolves the plan view (or `null` if cancelled). */
  onPlan: (body: DatasetFormBody) => Promise<null | TrainingDatasetPlanView>;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<DatasetFormPayload | null>(null);
const specOptions = ref<OptionItem[]>([]);
const versionOptions = ref<OptionItem[]>([]);

const modelSpecId = ref<string | undefined>();
const runtimeConfigVersionId = ref<string | undefined>();
const range = ref<[string, string] | undefined>();
const sampleIntervalSecs = ref<number>(60);
const horizonsSecs = ref<string>('3600');
const sourceDelaySecs = ref<number>(1);

const wizardStep = ref<'form' | 'review'>('form');
const pendingBody = ref<DatasetFormBody | null>(null);
const planResult = ref<null | TrainingDatasetPlanView>(null);

const isWizard = computed(() => payload.value?.mode === 'plan-wizard');
const isReview = computed(() => wizardStep.value === 'review');
const wizardCurrent = computed(() => (isReview.value ? 1 : 0));
const wizardStepItems = computed<StepItem[]>(() => [
  { title: $t('page.research.datasets.plan.steps.configure') },
  { title: $t('page.research.datasets.plan.steps.review') },
]);

function parseHorizons(): number[] {
  return horizonsSecs.value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function collectBody(): DatasetFormBody | null {
  const horizons = parseHorizons();
  if (
    !modelSpecId.value ||
    !runtimeConfigVersionId.value ||
    !range.value ||
    horizons.length === 0
  ) {
    message.warning($t('page.research.datasets.form.incomplete'));
    return null;
  }
  return {
    horizons_secs: horizons,
    model_spec_id: modelSpecId.value,
    runtime_config_version_id: runtimeConfigVersionId.value,
    sample_interval_secs: sampleIntervalSecs.value,
    source_delay_secs: sourceDelaySecs.value,
    window_end: range.value[1],
    window_start: range.value[0],
  };
}

async function loadOptions() {
  const [specs, versions] = await Promise.all([
    handleRequest(() => listModelSpecs({ size: 200 }), { silent: true }),
    handleRequest(() => fetchRuntimeConfigVersions({ limit: 200 }), {
      silent: true,
    }),
  ]);
  specOptions.value = (specs?.items ?? []).map((spec) => ({
    label: `${spec.name} · ${spec.model_spec_id}`,
    value: spec.model_spec_id,
  }));
  versionOptions.value = (versions ?? []).map((version) => ({
    label: version.runtime_config_version_id,
    value: version.runtime_config_version_id,
  }));
}

function applyFooter() {
  if (isReview.value) {
    modalApi.setState({
      cancelText: $t('page.research.datasets.plan.backToForm'),
      confirmText: $t('page.research.datasets.plan.confirmBuild'),
      title: $t('page.research.datasets.build.title'),
    });
    return;
  }
  modalApi.setState({
    cancelText: $t('common.cancel'),
    confirmText: isWizard.value
      ? $t('page.research.datasets.actions.plan')
      : $t('page.research.datasets.actions.build'),
    title: isWizard.value
      ? $t('page.research.datasets.plan.title')
      : $t('page.research.datasets.build.title'),
  });
}

function resetWizard() {
  wizardStep.value = 'form';
  pendingBody.value = null;
  planResult.value = null;
}

async function submitBuild(body: DatasetFormBody) {
  if (!payload.value) {
    return;
  }
  modalApi.lock();
  try {
    const ok = await payload.value.onBuild(body);
    if (ok) {
      modalApi.close();
    }
  } finally {
    modalApi.unlock();
  }
}

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onCancel() {
    // In review, "cancel" is a step-back to the form, not a modal close.
    if (isReview.value) {
      wizardStep.value = 'form';
      applyFooter();
      return;
    }
    modalApi.close();
  },
  async onConfirm() {
    if (!payload.value) {
      return;
    }
    if (isReview.value) {
      const body = pendingBody.value;
      const datasetId = planResult.value?.training_dataset_id;
      if (!body || !datasetId) {
        return;
      }
      if (planResult.value?.hard_cap_exceeded) {
        message.warning($t('page.research.datasets.plan.hardCapExceeded'));
        return;
      }
      await submitBuild({ ...body, training_dataset_id: datasetId });
      return;
    }

    const body = collectBody();
    if (!body) {
      return;
    }
    if (!isWizard.value) {
      await submitBuild(body);
      return;
    }

    modalApi.lock();
    let plan: null | TrainingDatasetPlanView;
    try {
      plan = await payload.value.onPlan(body);
    } finally {
      modalApi.unlock();
    }
    if (plan) {
      pendingBody.value = body;
      planResult.value = plan;
      wizardStep.value = 'review';
      applyFooter();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<DatasetFormPayload>();
      resetWizard();
      applyFooter();
      void loadOptions();
    }
  },
});
</script>

<template>
  <Modal>
    <Steps
      v-if="isWizard"
      :current="wizardCurrent"
      :items="wizardStepItems"
      class="mb-4"
      size="small"
    />

    <div
      v-if="isReview && planResult && pendingBody"
      class="flex flex-col gap-4"
    >
      <p class="text-muted-foreground text-sm">
        {{ $t('page.research.datasets.plan.reviewSummary') }}
      </p>
      <Alert
        v-if="planResult.hard_cap_exceeded"
        type="warning"
        show-icon
        :message="$t('page.research.datasets.plan.hardCapExceeded')"
      />
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.research.datasets.plan.plannedSamples')"
        >
          <span class="tabular-nums">{{ planResult.planned_samples }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.datasets.plan.spineUpperBound')"
        >
          <span class="tabular-nums">{{ planResult.spine_upper_bound }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.datasets.plan.estimatedEligible')"
        >
          <span class="tabular-nums">
            {{ planResult.estimated_eligible_samples }}
          </span>
          <span
            v-if="planResult.keep_rate !== null"
            class="text-muted-foreground ml-2 text-xs"
          >
            {{
              $t('page.research.datasets.plan.keepRateHint', {
                rate: (planResult.keep_rate * 100).toFixed(1),
                n: planResult.keep_rate_sample_size,
              })
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.datasets.plan.datasetId')">
          <span class="font-mono text-xs break-all">
            {{ planResult.training_dataset_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.datasets.form.modelSpec')">
          {{ planResult.model_spec_id }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.datasets.form.runtimeConfigVersion')"
        >
          <span class="font-mono text-xs break-all">
            {{ pendingBody.runtime_config_version_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.datasets.columns.windowStart')"
        >
          {{ formatDateTimeLocal(pendingBody.window_start) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.datasets.columns.windowEnd')"
        >
          {{ formatDateTimeLocal(pendingBody.window_end) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.datasets.form.sampleIntervalSecs')"
        >
          <span class="tabular-nums">{{
            pendingBody.sample_interval_secs
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.datasets.form.sourceDelaySecs')"
        >
          <span class="tabular-nums">{{ pendingBody.source_delay_secs }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.datasets.form.horizonsSecs')"
        >
          {{ pendingBody.horizons_secs.join(', ') }}
        </DescriptionsItem>
      </Descriptions>
    </div>

    <div v-else class="flex flex-col gap-4">
      <p class="text-muted-foreground text-sm">
        {{ $t('page.research.datasets.form.summary') }}
      </p>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.datasets.form.modelSpec') }}
        </span>
        <Select
          v-model:value="modelSpecId"
          :options="specOptions"
          :placeholder="$t('page.research.datasets.form.modelSpecPlaceholder')"
          show-search
          option-filter-prop="label"
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.datasets.form.runtimeConfigVersion') }}
        </span>
        <Select
          v-model:value="runtimeConfigVersionId"
          :options="versionOptions"
          :placeholder="$t('page.research.datasets.form.versionPlaceholder')"
          show-search
          option-filter-prop="label"
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.datasets.form.window') }}
        </span>
        <RangePicker
          v-model:value="range"
          show-time
          value-format="YYYY-MM-DDTHH:mm:ss.SSSZ"
          class="w-full"
        />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.research.datasets.form.sampleIntervalSecs') }}
          </span>
          <InputNumber
            v-model:value="sampleIntervalSecs"
            :min="1"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-sm font-medium">
            {{ $t('page.research.datasets.form.sourceDelaySecs') }}
          </span>
          <InputNumber
            v-model:value="sourceDelaySecs"
            :min="1"
            class="w-full"
          />
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.datasets.form.horizonsSecs') }}
        </span>
        <Input
          v-model:value="horizonsSecs"
          :placeholder="$t('page.research.datasets.form.horizonsPlaceholder')"
        />
        <span class="text-muted-foreground text-xs">
          {{ $t('page.research.datasets.form.horizonsHelp') }}
        </span>
      </div>
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
