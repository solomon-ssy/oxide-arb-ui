<script lang="ts" setup>
import type { BindCalibrationRequest } from '@vben/types';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { CALIBRATION_KINDS, DOWNSIDE_SOURCES } from '@vben/types';

import { useVbenForm } from '#/adapter/form';
import { listAllCalibrationArtifacts } from '#/api/calibration';
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

const downsideOptions = [
  {
    label: $t('enum.downsideSource.mfe_mae'),
    value: DOWNSIDE_SOURCES.mfeMae,
  },
];

async function loadCalibrators() {
  const rows = await handleRequest(
    () =>
      listAllCalibrationArtifacts({
        kind: CALIBRATION_KINDS.modelScore,
      }),
    { silent: true },
  );
  const options: OptionItem[] = (rows ?? []).map((row) => ({
    label: `${row.artifact_id} · ${row.sample_count} samples`,
    value: row.artifact_id,
  }));
  formApi.updateSchema([
    {
      componentProps: { loading: false, options },
      fieldName: 'calibrator_ref',
    },
  ]);
}

async function onSubmit(values: Record<string, unknown>) {
  if (!payload.value) {
    return;
  }
  modalApi.setState({ confirmLoading: true });
  try {
    const ok = await payload.value.onSubmit({
      calibrator_ref: values.calibrator_ref as string,
      downside_source:
        values.downside_source as BindCalibrationBody['downside_source'],
    });
    if (ok) {
      modalApi.close();
    }
  } finally {
    modalApi.setState({ confirmLoading: false });
  }
}

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  handleSubmit: onSubmit,
  schema: [
    {
      component: 'Select',
      componentProps: {
        loading: false,
        optionFilterProp: 'label',
        options: [],
        placeholder: $t(
          'page.research.models.bindCalibration.calibratorPlaceholder',
        ),
        showSearch: true,
      },
      fieldName: 'calibrator_ref',
      label: $t('page.research.models.bindCalibration.calibrator'),
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: { options: downsideOptions },
      defaultValue: DOWNSIDE_SOURCES.mfeMae,
      fieldName: 'downside_source',
      label: $t('page.research.models.bindCalibration.downsideSource'),
      rules: 'selectRequired',
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  onConfirm: () => formApi.validateAndSubmitForm(),
  onOpenChange(isOpen) {
    if (isOpen) {
      payload.value = modalApi.getData<ModelBindCalibrationPayload>();
      formApi.resetForm();
      formApi.setValues({ downside_source: DOWNSIDE_SOURCES.mfeMae });
      formApi.updateSchema([
        {
          componentProps: { loading: true, options: [] },
          fieldName: 'calibrator_ref',
        },
      ]);
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
    <p class="text-muted-foreground mb-4 text-sm">
      {{ $t('page.research.models.bindCalibration.summary') }}
    </p>
    <Form />
  </Modal>
</template>
