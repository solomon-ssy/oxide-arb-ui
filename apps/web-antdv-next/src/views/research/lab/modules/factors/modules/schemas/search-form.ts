import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';

/** Factor-definition catalog filters (`GET /research/factors`). */
export function useFactorDefinitionSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('FactorFamily'),
      },
      fieldName: 'factor_family',
      label: $t('page.research.factors.filters.family'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('FactorDefinitionScope'),
      },
      fieldName: 'scope',
      label: $t('page.research.factors.filters.scope'),
    },
  ];
}
