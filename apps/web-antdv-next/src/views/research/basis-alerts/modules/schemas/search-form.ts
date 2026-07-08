import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import { useTimeRangeSearchField } from '#/shared/components/query/time-range';

export function useBasisAlertSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: $t(
          'page.research.basisAlerts.filters.marketIdPlaceholder',
        ),
      },
      fieldName: 'market_id',
      label: $t('page.research.basisAlerts.filters.marketId'),
    },
    useTimeRangeSearchField('page.research.basisAlerts.filters.timeRange'),
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'open_only',
      label: $t('page.research.basisAlerts.filters.openOnly'),
    },
  ];
}
