import type { VbenFormSchema } from '#/adapter/form';

import { DATASET_PURPOSES, TRAINING_DATASET_STATUSES } from '@vben/types';

import { $t } from '#/locales';

/** Prefilled filters seeded from cross-page deep links (`route.query`). */
export interface TrainingDatasetInitialFilters {
  model_spec_id?: string;
}

/** Training-dataset catalog filters (`GET /research/training-datasets`). */
export function useTrainingDatasetSearchSchema(
  initial: TrainingDatasetInitialFilters = {},
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.model_spec_id,
      fieldName: 'model_spec_id',
      label: $t('page.research.datasets.filters.modelSpec'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(DATASET_PURPOSES).map((value) => ({
          label: $t(`enum.datasetPurpose.${value}`),
          value,
        })),
      },
      fieldName: 'purpose',
      label: $t('page.research.datasets.filters.purpose'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(TRAINING_DATASET_STATUSES).map((value) => ({
          label: $t(`enum.trainingDatasetStatus.${value}`),
          value,
        })),
      },
      fieldName: 'status',
      label: $t('page.research.datasets.filters.status'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.research.datasets.filters.createdAt'),
    },
  ];
}
