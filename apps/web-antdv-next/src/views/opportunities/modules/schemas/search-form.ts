import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';

/** History tab filters: time window + market id. */
export function useHistorySearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
      },
      fieldName: 'range',
      label: $t('page.opportunities.search.range'),
    },
    {
      component: 'Input',
      componentProps: {
        allowClear: true,
        placeholder: '0x…',
      },
      fieldName: 'market_id',
      label: $t('page.opportunities.search.marketId'),
    },
  ];
}

/** Funnel tab filters: time window only (aggregation has no market scope). */
export function useFunnelSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
      },
      fieldName: 'range',
      label: $t('page.opportunities.search.range'),
    },
  ];
}
