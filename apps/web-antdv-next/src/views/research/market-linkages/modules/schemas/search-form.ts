import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { useTimeRangeSearchField } from '#/shared/components/query/time-range';

const LINKAGE_STATUSES = ['resolved', 'unresolved', 'overridden'] as const;
const DOMAIN_FAMILIES = ['crypto'] as const;

export function useMarketLinkageSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: LINKAGE_STATUSES.map((value) => ({
          label: $t(`enum.linkageStatus.${value}`),
          value,
        })),
      },
      fieldName: 'status',
      label: $t('page.research.marketLinkages.filters.status'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: DOMAIN_FAMILIES.map((value) => ({
          label: $t(`enum.domainFamily.${value}`),
          value,
        })),
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
