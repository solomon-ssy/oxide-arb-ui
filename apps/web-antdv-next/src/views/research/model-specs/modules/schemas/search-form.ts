import type { VbenFormSchema } from '#/adapter/form';

import { MODEL_FAMILIES, PUBLICATION_STATUSES } from '@vben/types';

import { $t } from '#/locales';

/** Model-spec catalog filters (`GET /research/model-specs`). */
export function useModelSpecSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(MODEL_FAMILIES).map((value) => ({
          label: $t(`enum.modelFamily.${value}`),
          value,
        })),
      },
      fieldName: 'model_family',
      label: $t('page.research.modelSpecs.filters.modelFamily'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(PUBLICATION_STATUSES).map((value) => ({
          label: $t(`enum.publicationStatus.${value}`),
          value,
        })),
      },
      fieldName: 'status',
      label: $t('page.research.modelSpecs.filters.status'),
    },
  ];
}
