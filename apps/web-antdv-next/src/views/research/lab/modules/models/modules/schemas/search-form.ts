import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';

/** Prefilled filters seeded from cross-page deep links (`route.query`). */
export interface ModelVersionInitialFilters {
  model_spec_id?: string;
}

/** Trained-model catalog filters (`GET /research/models`). */
export function useTrainedModelSearchSchema(
  initial: ModelVersionInitialFilters = {},
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.model_spec_id,
      fieldName: 'model_spec_id',
      label: $t('page.research.models.filters.modelSpec'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.research.models.filters.createdAt'),
    },
  ];
}
