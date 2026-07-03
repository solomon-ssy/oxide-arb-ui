<script lang="ts" setup>
import type { BuildTrainingDatasetRequest } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import { DatePicker, Input, InputNumber, message, Select } from 'antdv-next';

import { listModelSpecs } from '#/api/research';
import { fetchRuntimeConfigVersions } from '#/api/runtime-config';
import { $t } from '#/locales';

defineOptions({ name: 'DatasetFormModal' });

const RangePicker = DatePicker.RangePicker;

/** Domain body collected by the form (governed `reason` is added by the caller). */
export type DatasetFormBody = Omit<BuildTrainingDatasetRequest, 'reason'>;

export interface DatasetFormPayload {
  /** `plan` runs a dry-run sample count; `build` materializes the dataset. */
  mode: 'build' | 'plan';
  /** Invoked with the collected body on confirm; caller wraps it as governed. */
  onSubmit: (body: DatasetFormBody) => void;
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

const isBuild = computed(() => payload.value?.mode === 'build');
const title = computed(() =>
  isBuild.value
    ? $t('page.research.datasets.build.title')
    : $t('page.research.datasets.plan.title'),
);

function parseHorizons(): number[] {
  return horizonsSecs.value
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
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

const [Modal, modalApi] = useVbenModal({
  destroyOnClose: true,
  onConfirm() {
    const horizons = parseHorizons();
    if (
      !modelSpecId.value ||
      !runtimeConfigVersionId.value ||
      !range.value ||
      horizons.length === 0
    ) {
      message.warning($t('page.research.datasets.form.incomplete'));
      return;
    }
    payload.value?.onSubmit({
      horizons_secs: horizons,
      model_spec_id: modelSpecId.value,
      runtime_config_version_id: runtimeConfigVersionId.value,
      sample_interval_secs: sampleIntervalSecs.value,
      source_delay_secs: sourceDelaySecs.value,
      window_end: range.value[1],
      window_start: range.value[0],
    });
    modalApi.close();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<DatasetFormPayload>();
      void loadOptions();
    }
  },
});
</script>

<template>
  <Modal :title="title">
    <div class="flex flex-col gap-4">
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
