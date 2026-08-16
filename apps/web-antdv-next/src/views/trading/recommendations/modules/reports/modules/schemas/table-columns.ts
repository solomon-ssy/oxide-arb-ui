import type { QuantReportView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { RECOMMENDATION_REPORT_STATUSES } from '@vben/types';

import { $t } from '#/locales';
import { EMPTY_PLACEHOLDER } from '#/shared/components/format';
import { iconOp } from '#/shared/table/cell-operation-presets';

/** Report statuses that support governed revocation. */
const REVOCABLE_STATUSES = new Set<string>([
  RECOMMENDATION_REPORT_STATUSES.published,
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
      field: 'decision_at',
      title: $t('page.quantReports.columns.decisionAt'),
      width: 170,
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'RecommendationReportStatus' },
      },
      field: 'status',
      title: $t('page.quantReports.columns.status'),
      width: 140,
    },
    {
      cellRender: { name: 'CellEnumTag', props: { enum: 'QuantRuntimeMode' } },
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
      field: 'represented_routes',
      formatter: ({
        cellValue,
      }: {
        cellValue: QuantReportView['represented_routes'];
      }) =>
        cellValue.routes
          .map((route) => $t(`page.quantReports.routes.${route}`))
          .join(' · '),
      minWidth: 180,
      showOverflow: 'tooltip',
      title: $t('page.quantReports.columns.routes'),
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
      field: 'total_hard_reserved_cash_usd',
      title: $t('page.quantReports.columns.hardReservedCash'),
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
          iconOp<QuantReportView>(
            'detail',
            $t('page.quantReports.actions.detail'),
          ),
          iconOp<QuantReportView>(
            'revoke',
            $t('page.quantReports.actions.revoke'),
            {
              danger: true,
              show: (row) => canRevoke && REVOCABLE_STATUSES.has(row.status),
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.quantReports.columns.operation'),
      width: 88,
    },
  ];
}
