import type { VbenFormSchema } from '#/adapter/form';

import { MARKET_CATEGORIES, MARKET_STATUSES } from '@vben/types';

import { $t } from '#/locales';

/** Market catalog search filters (AND-combined; forwarded to `GET /markets`). */
export function useMarketSearchSchema(): VbenFormSchema[] {
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
    {
      component: 'Input',
      componentProps: { allowClear: true },
      fieldName: 'event_id',
      label: $t('page.markets.search.eventId'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: $t('page.markets.search.subscribedOnly'), value: 'true' },
          { label: $t('page.markets.search.unsubscribedOnly'), value: 'false' },
        ],
      },
      fieldName: 'subscribed',
      label: $t('page.markets.search.subscribed'),
    },
  ];
}
