import type { VbenFormSchema } from '#/adapter/form';

import { MARKET_CATEGORY_UNKNOWN_FILTER } from '@vben/types';

import { $t } from '#/locales';
import { enumOptions } from '#/shared/presentation/enum-options';

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
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('MarketStatus'),
      },
      fieldName: 'status',
      label: $t('page.markets.search.status'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: [
          {
            color: 'default',
            label: $t('page.markets.unknownCategory'),
            swatch: 'hsl(var(--qp-status-neutral))',
            value: MARKET_CATEGORY_UNKNOWN_FILTER,
          },
          ...enumOptions('MarketCategory'),
        ],
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
