<script lang="ts" setup>
import type { BindCalibrationRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { CALIBRATION_KINDS, DOWNSIDE_SOURCES } from '@vben/types';

import { message, Select } from 'antdv-next';

import { listCalibrationArtifacts } from '#/api/calibration';
import { $t } from '#/locales';

defineOptions({ name: 'ModelBindCalibrationModal' });

export type BindCalibrationBody = Omit<BindCalibrationRequest, 'reason'>;

export interface ModelBindCalibrationPayload {
  modelVersionId: string;
  onSubmit: (body: BindCalibrationBody) => Promise<boolean>;
}

interface OptionItem {
  label: string;
  value: string;
}

const { handleRequest } = useRequestHandler();

const payload = ref<ModelBindCalibrationPayload | null>(null);
const calibratorOptions = ref<OptionItem[]>([]);
const loading = ref(false);

const calibratorRef = ref<string | undefined>();
const downsideSource = ref<BindCalibrationBody['downside_source']>(
  DOWNSIDE_SOURCES.mfeMae,
);

async function loadCalibrators() {
  loading.value = true;
  try {
    const page = await handleRequest(
      () =>
        listCalibrationArtifacts({
          kind: CALIBRATION_KINDS.modelScore,
          size: 200,
        }),
      { silent: true },
    );
    calibratorOptions.value = (page?.items ?? []).map((row) => ({
      label: `${row.artifact_id} · ${row.sample_count} samples`,
      value: row.artifact_id,
    }));
  } finally {
    loading.value = false;
  }
}

const downsideOptions = [
  {
    label: $t('enum.downsideSource.mfe_mae'),
    value: DOWNSIDE_SOURCES.mfeMae,
  },
];

const [Modal, modalApi] = useVbenModal({
  onConfirm: async () => {
    if (!payload.value) {
      return;
    }
    if (!calibratorRef.value) {
      message.warning($t('page.research.models.bindCalibration.validation'));
      return;
    }
    modalApi.setState({ confirmLoading: true });
    try {
      const ok = await payload.value.onSubmit({
        calibrator_ref: calibratorRef.value,
        downside_source: downsideSource.value,
      });
      if (ok) {
        modalApi.close();
      }
    } finally {
      modalApi.setState({ confirmLoading: false });
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelBindCalibrationPayload>();
      calibratorRef.value = undefined;
      downsideSource.value = DOWNSIDE_SOURCES.mfeMae;
      void loadCalibrators();
    } else {
      payload.value = null;
    }
  },
});
</script>

<template>
  <Modal
    :title="$t('page.research.models.bindCalibration.title')"
    class="w-full max-w-lg"
  >
    <div class="flex flex-col gap-4 py-2">
      <p class="text-muted-foreground text-sm">
        {{ $t('page.research.models.bindCalibration.summary') }}
      </p>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.bindCalibration.calibrator') }}
        </span>
        <Select
          v-model:value="calibratorRef"
          :loading="loading"
          :options="calibratorOptions"
          :placeholder="
            $t('page.research.models.bindCalibration.calibratorPlaceholder')
          "
          show-search
        />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">
          {{ $t('page.research.models.bindCalibration.downsideSource') }}
        </span>
        <Select v-model:value="downsideSource" :options="downsideOptions" />
      </div>
    </div>
  </Modal>
</template>
