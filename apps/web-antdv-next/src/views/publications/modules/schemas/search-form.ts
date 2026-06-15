import type { VbenFormSchema } from '#/adapter/form';

import { PUBLICATION_MODES, PUBLICATION_STATUSES } from '@vben/types';

import { $t } from '#/locales';

export function usePublicationSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(PUBLICATION_MODES).map((value) => ({
          label: $t(`enum.publicationMode.${value}`),
          value,
        })),
        placeholder: $t('page.publications.search.allModes'),
      },
      fieldName: 'mode',
      label: $t('page.publications.search.mode'),
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
      label: $t('page.publications.search.status'),
    },
    {
      component: 'InputNumber',
      componentProps: { max: 200, min: 1 },
      defaultValue: 50,
      fieldName: 'limit',
      label: $t('page.publications.search.limit'),
    },
  ];
}
