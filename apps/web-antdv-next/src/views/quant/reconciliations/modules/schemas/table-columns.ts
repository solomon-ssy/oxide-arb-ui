import type { ReconciliationView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { isReconciliationOperatorResolvable } from '@vben/types';

import { $t } from '#/locales';
import { useReconciliationResultTagOptions } from '#/shared/components/format/tag-options';

export function useReconciliationColumns(
  onActionClick: OnActionClickFn<ReconciliationView>,
  canResolve: boolean,
): VxeTableGridOptions<ReconciliationView>['columns'] {
  return [
    {
      field: 'reconciliation_id',
      minWidth: 150,
      showOverflow: 'tooltip',
      title: $t('page.quantReconciliations.columns.reconciliationId'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useReconciliationResultTagOptions(),
      },
      field: 'result',
      title: $t('page.quantReconciliations.columns.result'),
      width: 140,
    },
    {
      field: 'resolved_at',
      formatter: ({ row }: { row: ReconciliationView }) =>
        row.resolved_at
          ? $t('page.quantReconciliations.resolvedState.resolved')
          : $t('page.quantReconciliations.resolvedState.unresolved'),
      title: $t('page.quantReconciliations.columns.resolvedState'),
      width: 110,
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: ReconciliationView) =>
            `/quant/execution-orders?open=${row.execution_order_id}`,
        },
      },
      field: 'execution_order_id',
      minWidth: 150,
      title: $t('page.quantReconciliations.columns.executionOrderId'),
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: ReconciliationView) =>
            `/quant/intents/${row.order_intent_id}`,
        },
      },
      field: 'order_intent_id',
      minWidth: 150,
      title: $t('page.quantReconciliations.columns.orderIntentId'),
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'discrepancy_usd',
      title: $t('page.quantReconciliations.columns.discrepancy'),
      width: 130,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.quantReconciliations.columns.detectedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'resolved_at',
      title: $t('page.quantReconciliations.columns.resolvedAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'reconciliation_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          {
            code: 'detail',
            text: $t('page.quantReconciliations.actions.detail'),
          },
          {
            code: 'resolve',
            show: (row: ReconciliationView) =>
              canResolve && isReconciliationOperatorResolvable(row),
            text: $t('page.quantReconciliations.actions.resolve'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.quantReconciliations.columns.operation'),
      width: 140,
    },
  ];
}
