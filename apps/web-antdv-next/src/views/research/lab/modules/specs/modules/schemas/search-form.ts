import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';

/** Model-spec catalog filters (`GET /research/model-specs`). */
export function useModelSpecSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('ModelFamily'),
      },
      fieldName: 'model_family',
      label: $t('page.research.modelSpecs.filters.modelFamily'),
    },
  ];
}
