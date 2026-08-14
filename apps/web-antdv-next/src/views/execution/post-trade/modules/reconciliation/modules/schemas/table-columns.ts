import type { ReconciliationView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { isReconciliationOperatorResolvable } from '@vben/types';

import { $t } from '#/locales';
import { iconOp } from '#/shared/table/cell-operation-presets';

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
        name: 'CellEnumTag',
        props: { enum: 'ReconciliationResult' },
      },
      field: 'result',
      title: $t('page.quantReconciliations.columns.result'),
      width: 140,
    },
    {
      field: 'resolution_state',
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
            `/execution/orders?module=orders&entity=execution-order&id=${row.execution_order_id}`,
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
            `/execution/orders?module=intents&entity=order-intent&id=${row.order_intent_id}`,
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
          iconOp<ReconciliationView>(
            'detail',
            $t('page.quantReconciliations.actions.detail'),
          ),
          iconOp<ReconciliationView>(
            'resolve',
            $t('page.quantReconciliations.actions.resolve'),
            {
              show: (row) =>
                canResolve && isReconciliationOperatorResolvable(row),
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.quantReconciliations.columns.operation'),
      width: 88,
    },
  ];
}
