import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { useTimeRangeSearchField } from '#/shared/components/query/time-range';
import { enumOptions } from '#/shared/presentation/enum-options';

export function useMarketLinkageSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('LinkageStatus'),
      },
      fieldName: 'status',
      label: $t('page.research.marketLinkages.filters.status'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('DomainFamily'),
      },
      fieldName: 'family',
      label: $t('page.research.marketLinkages.filters.family'),
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: $t(
          'page.research.marketLinkages.filters.marketIdPlaceholder',
        ),
      },
      fieldName: 'market_id',
      label: $t('page.research.marketLinkages.filters.marketId'),
    },
    useTimeRangeSearchField('page.research.marketLinkages.filters.timeRange'),
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'latest_only',
      label: $t('page.research.marketLinkages.filters.latestOnly'),
    },
  ];
}
