import type { TradePolicySummaryView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  tradePolicyOpenPath,
  trainingDatasetOpenPath,
} from '#/shared/routes/research-plane';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useTradePolicyColumns(
  onActionClick: OnActionClickFn<TradePolicySummaryView>,
): VxeTableGridOptions<TradePolicySummaryView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: TradePolicySummaryView) =>
            tradePolicyOpenPath(row.artifact_id),
        },
      },
      field: 'artifact_id',
      minWidth: 180,
      title: $t('page.research.tradePolicies.columns.artifactId'),
    },
    {
      cellRender: { name: 'CellEnumTag', props: { enum: 'TradePolicyStatus' } },
      field: 'status',
      title: $t('page.research.tradePolicies.columns.status'),
      width: 120,
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: TradePolicySummaryView) =>
            trainingDatasetOpenPath(row.source_dataset_id),
        },
      },
      field: 'source_dataset_id',
      minWidth: 180,
      title: $t('page.research.tradePolicies.columns.dataset'),
    },
    {
      className: 'font-mono tabular-nums',
      field: 'cohort_count',
      title: $t('page.research.tradePolicies.columns.cohorts'),
      width: 100,
    },
    {
      className: 'font-mono tabular-nums',
      field: 'executable_coverage',
      title: $t('page.research.tradePolicies.columns.coverage'),
      width: 120,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.tradePolicies.columns.createdAt'),
      width: 170,
    },
    {
      cellRender: {
        attrs: { nameField: 'artifact_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<TradePolicySummaryView>('detail', $t('common.detail')),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.tradePolicies.columns.operation'),
      width: 72,
    },
  ];
}
