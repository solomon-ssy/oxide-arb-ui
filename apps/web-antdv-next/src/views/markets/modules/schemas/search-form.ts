import type { VbenFormSchema } from '#/adapter/form';

import { MARKET_CATEGORIES, MARKET_STATUSES } from '@vben/types';

import { $t } from '#/locales';

/** Search form over `GET /markets` filters (keyword / status / category). */
export function useSearchFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: $t('page.markets.search.keywordPlaceholder'),
      },
      fieldName: 'keyword',
      label: $t('page.markets.search.keyword'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(MARKET_STATUSES).map((value) => ({
          label: $t(`enum.marketStatus.${value}`),
          value,
        })),
      },
      fieldName: 'status',
      label: $t('page.markets.search.status'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(MARKET_CATEGORIES).map((value) => ({
          label: $t(`enum.marketCategory.${value}`),
          value,
        })),
      },
      fieldName: 'category',
      label: $t('page.markets.search.category'),
    },
  ];
}
