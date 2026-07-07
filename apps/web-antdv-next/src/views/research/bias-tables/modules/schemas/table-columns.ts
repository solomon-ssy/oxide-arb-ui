import type { BiasTableSummaryView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { iconOp } from '#/shared/table/cell-operation-presets';

export interface BiasTableActionAccess {
  canActivate: boolean;
}

export function useBiasTableColumns(
  onActionClick: OnActionClickFn<BiasTableSummaryView>,
  access: BiasTableActionAccess,
): VxeTableGridOptions<BiasTableSummaryView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: BiasTableSummaryView) =>
            `/research/bias-tables?open=${row.bias_table_id}`,
        },
      },
      field: 'content_hash',
      minWidth: 220,
      showOverflow: 'tooltip',
      title: $t('page.research.biasTables.columns.contentHash'),
    },
    {
      field: 'category_count',
      title: $t('page.research.biasTables.columns.categoryCount'),
      width: 110,
    },
    {
      field: 'total_sample_count',
      title: $t('page.research.biasTables.columns.sampleCount'),
      width: 110,
    },
    {
      field: 'fit_window_start',
      minWidth: 260,
      slots: { default: 'fit_window' },
      title: $t('page.research.biasTables.columns.fitWindow'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.biasTables.columns.createdAt'),
      width: 180,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'bias_table_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<BiasTableSummaryView>(
            'detail',
            $t('page.research.biasTables.actions.detail'),
          ),
          iconOp<BiasTableSummaryView>(
            'activate',
            $t('page.research.biasTables.actions.activate'),
            { show: () => access.canActivate },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.biasTables.columns.operation'),
      width: 160,
    },
  ];
}
