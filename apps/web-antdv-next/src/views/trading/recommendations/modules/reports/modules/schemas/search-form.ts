import type { VbenFormSchema } from '#/adapter/form';

import { $t } from '#/locales';
import {
  categoryOptions,
  enumOptions,
} from '#/shared/presentation/enum-options';

const BUY_MODEL_ROUTES = ['crypto', 'pooled', 'weather'] as const;

/** Report list filters (AND-combined; forwarded to `GET /quant/reports`). */
export function useReportSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('RecommendationReportStatus'),
      },
      fieldName: 'status',
      label: $t('page.quantReports.filters.status'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: enumOptions('ReportKind'),
      },
      fieldName: 'kind',
      label: $t('page.quantReports.filters.kind'),
    },
    {
      component: 'EnumSelect',
      componentProps: {
        allowClear: true,
        options: categoryOptions(BUY_MODEL_ROUTES).map((option) => ({
          ...option,
          label: $t(`page.quantReports.routes.${option.value}`),
        })),
      },
      fieldName: 'route',
      label: $t('page.quantReports.filters.route'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.quantReports.columns.decisionAt'),
    },
  ];
}
