import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';

/** Prefilled filters seeded from cross-page deep links (`route.query`). */
export interface BacktestReportInitialFilters {
  model_version_id?: string;
}

/** Backtest-report catalog filters (`GET /research/backtest-reports`). */
export function useBacktestReportSearchSchema(
  initial: BacktestReportInitialFilters = {},
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { allowClear: true },
      defaultValue: initial.model_version_id,
      fieldName: 'model_version_id',
      label: $t('page.research.backtests.filters.modelVersionId'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.research.backtests.filters.createdAt'),
    },
  ];
}
