import type { QuantReportView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { RECOMMENDATION_REPORT_STATUSES } from '@vben/types';

import { $t } from '#/locales';
import { EMPTY_PLACEHOLDER } from '#/shared/components/format';
import {
  useQuantRuntimeModeTagOptions,
  useRecommendationReportStatusTagOptions,
} from '#/shared/components/format/tag-options';

/** Report statuses that support governed revocation. */
const REVOCABLE_STATUSES = new Set<string>([
  RECOMMENDATION_REPORT_STATUSES.published,
  RECOMMENDATION_REPORT_STATUSES.publishedEmpty,
]);

export function useReportColumns(
  onActionClick: OnActionClickFn<QuantReportView>,
  canRevoke: boolean,
): VxeTableGridOptions<QuantReportView>['columns'] {
  return [
    {
      field: 'recommendation_report_id',
      minWidth: 150,
      showOverflow: 'tooltip',
      title: $t('page.quantReports.columns.reportId'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'as_of',
      title: $t('page.quantReports.columns.asOf'),
      width: 170,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useRecommendationReportStatusTagOptions(),
      },
      field: 'status',
      title: $t('page.quantReports.columns.status'),
      width: 140,
    },
    {
      cellRender: { name: 'CellTag', options: useQuantRuntimeModeTagOptions() },
      field: 'runtime_mode',
      title: $t('page.quantReports.columns.runtimeMode'),
      width: 130,
    },
    {
      field: 'report_kind',
      formatter: ({ cellValue }: { cellValue: string }) =>
        $t(`enum.reportKind.${cellValue}`),
      title: $t('page.quantReports.columns.kind'),
      width: 120,
    },
    {
      field: 'trigger_kind',
      formatter: ({ cellValue }: { cellValue: string }) =>
        $t(`enum.reportTriggerKind.${cellValue}`),
      title: $t('page.quantReports.columns.triggerKind'),
      width: 110,
    },
    {
      align: 'right',
      field: 'top_n',
      title: $t('page.quantReports.columns.topN'),
      width: 90,
    },
    {
      align: 'right',
      field: 'published_recommendation_count',
      title: $t('page.quantReports.columns.published'),
      width: 110,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'capital_base_usd',
      title: $t('page.quantReports.columns.capitalBase'),
      width: 130,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'total_suggested_usd',
      title: $t('page.quantReports.columns.suggested'),
      width: 130,
    },
    {
      field: 'empty_reason',
      formatter: ({ cellValue }: { cellValue: null | string }) =>
        cellValue
          ? $t(`enum.emptyReportReason.${cellValue}`)
          : EMPTY_PLACEHOLDER,
      minWidth: 160,
      showOverflow: 'tooltip',
      title: $t('page.quantReports.columns.emptyReason'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'published_at',
      title: $t('page.quantReports.columns.publishedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'revoked_at',
      title: $t('page.quantReports.columns.revokedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'expired_at',
      title: $t('page.quantReports.columns.expiredAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'recommendation_report_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          { code: 'detail', text: $t('page.quantReports.actions.detail') },
          {
            code: 'revoke',
            danger: true,
            show: (row: QuantReportView) =>
              canRevoke && REVOCABLE_STATUSES.has(row.status),
            text: $t('page.quantReports.actions.revoke'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.quantReports.columns.operation'),
      width: 160,
    },
  ];
}
