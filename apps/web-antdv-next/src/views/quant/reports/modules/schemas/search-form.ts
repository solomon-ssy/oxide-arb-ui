import type { VbenFormSchema } from '#/adapter/form';

import {
  QUANT_RUNTIME_MODES,
  RECOMMENDATION_REPORT_STATUSES,
  REPORT_KINDS,
} from '@vben/types';

import { $t } from '#/locales';

const BUY_MODEL_ROUTES = ['crypto', 'pooled', 'weather'] as const;

/** Report list filters (AND-combined; forwarded to `GET /quant/reports`). */
export function useReportSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(RECOMMENDATION_REPORT_STATUSES).map((value) => ({
          label: $t(`enum.recommendationReportStatus.${value}`),
          value,
        })),
      },
      fieldName: 'status',
      label: $t('page.quantReports.filters.status'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(REPORT_KINDS).map((value) => ({
          label: $t(`enum.reportKind.${value}`),
          value,
        })),
      },
      fieldName: 'kind',
      label: $t('page.quantReports.filters.kind'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: BUY_MODEL_ROUTES.map((value) => ({
          label: $t(`page.quantReports.routes.${value}`),
          value,
        })),
      },
      fieldName: 'route',
      label: $t('page.quantReports.filters.route'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(QUANT_RUNTIME_MODES).map((value) => ({
          label: $t(`enum.quantRuntimeMode.${value}`),
          value,
        })),
      },
      fieldName: 'runtime_mode',
      label: $t('page.quantReports.filters.runtimeMode'),
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
