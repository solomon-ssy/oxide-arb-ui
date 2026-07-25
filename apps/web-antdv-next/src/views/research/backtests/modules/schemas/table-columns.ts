import type { BacktestReportView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useBacktestReportColumns(
  onActionClick: OnActionClickFn<BacktestReportView>,
): VxeTableGridOptions<BacktestReportView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: BacktestReportView) =>
            `/research/backtests?open=${row.backtest_report_id}`,
        },
      },
      field: 'backtest_report_id',
      minWidth: 150,
      title: $t('page.research.backtests.columns.backtestReportId'),
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: BacktestReportView) =>
            `/research/models?open=${row.model_version_id}`,
        },
      },
      field: 'model_version_id',
      minWidth: 150,
      title: $t('page.research.backtests.columns.modelVersionId'),
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: BacktestReportView) =>
            `/research/datasets?open=${row.evaluation_dataset_id}`,
        },
      },
      field: 'evaluation_dataset_id',
      minWidth: 150,
      title: $t('page.research.backtests.columns.evaluationDataset'),
    },
    {
      align: 'right',
      field: 'rank_ic',
      title: $t('page.research.backtests.columns.rankIc'),
      width: 100,
    },
    {
      align: 'right',
      field: 'hit_rate',
      title: $t('page.research.backtests.columns.hitRate'),
      width: 100,
    },
    {
      align: 'right',
      field: 'coverage',
      title: $t('page.research.backtests.columns.coverage'),
      width: 100,
    },
    {
      align: 'right',
      field: 'sample_count',
      title: $t('page.research.backtests.columns.sampleCount'),
      width: 110,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.backtests.columns.createdAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'backtest_report_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          iconOp<BacktestReportView>(
            'detail',
            $t('page.research.backtests.actions.detail'),
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.backtests.columns.operation'),
      width: 72,
    },
  ];
}
