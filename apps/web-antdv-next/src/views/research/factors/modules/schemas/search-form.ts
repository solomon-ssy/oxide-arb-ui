import type { VbenFormSchema } from '#/adapter/form';

import {
  FACTOR_DEFINITION_SCOPES,
  FACTOR_FAMILIES,
  PUBLICATION_STATUSES,
} from '@vben/types';

import { $t } from '#/locales';

/** Factor-definition catalog filters (`GET /research/factors`). */
export function useFactorDefinitionSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(FACTOR_FAMILIES).map((value) => ({
          label: $t(`enum.factorFamily.${value}`),
          value,
        })),
      },
      fieldName: 'factor_family',
      label: $t('page.research.factors.filters.family'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(FACTOR_DEFINITION_SCOPES).map((value) => ({
          label: $t(`enum.factorScope.${value}`),
          value,
        })),
      },
      fieldName: 'scope',
      label: $t('page.research.factors.filters.scope'),
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
      label: $t('page.research.factors.filters.status'),
    },
  ];
}
