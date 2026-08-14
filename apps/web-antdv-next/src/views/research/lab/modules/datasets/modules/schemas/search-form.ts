import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';

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
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('DatasetPurpose'),
      },
      fieldName: 'purpose',
      label: $t('page.research.datasets.filters.purpose'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('TrainingDatasetStatus'),
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
