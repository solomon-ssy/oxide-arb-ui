import type { VbenFormSchema } from '#/adapter/form';

import { CONTROL_FACTOR_TYPES, FACTOR_STATUSES } from '@vben/types';

import { $t } from '#/locales';

export function useControlFactorSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        options: Object.values(FACTOR_STATUSES).map((value) => ({
          label: $t(`enum.factorStatus.${value}`),
          value,
        })),
      },
      defaultValue: FACTOR_STATUSES.candidate,
      fieldName: 'status',
      label: $t('page.controlFactors.search.status'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(CONTROL_FACTOR_TYPES).map((value) => ({
          label: $t(`enum.controlFactorType.${value}`),
          value,
        })),
      },
      fieldName: 'factor_type',
      label: $t('page.controlFactors.search.factorType'),
    },
  ];
}
