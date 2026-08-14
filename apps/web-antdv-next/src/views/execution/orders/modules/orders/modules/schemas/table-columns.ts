import type { ExecutionOrderView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { EMPTY_PLACEHOLDER, formatShares } from '#/shared/components/format';
import { executionOrderOpenPath } from '#/shared/routes/execution-plane';
import { iconOp } from '#/shared/table/cell-operation-presets';

function formatVenueStatus(value: null | string | undefined): string {
  if (!value) {
    return EMPTY_PLACEHOLDER;
  }
  const key = `enum.venueOrderStatus.${value}`;
  const label = $t(key);
  return label === key ? value : label;
}

export function useExecutionOrderColumns(
  onActionClick: OnActionClickFn<ExecutionOrderView>,
): VxeTableGridOptions<ExecutionOrderView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: ExecutionOrderView) =>
            executionOrderOpenPath(row.execution_order_id),
        },
      },
      field: 'execution_order_id',
      minWidth: 150,
      title: $t('page.quantExecutionOrders.columns.executionOrderId'),
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: ExecutionOrderView) =>
            `/execution/orders?module=intents&entity=order-intent&id=${row.order_intent_id}`,
        },
      },
      field: 'order_intent_id',
      minWidth: 150,
      title: $t('page.quantExecutionOrders.columns.orderIntentId'),
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'ExecutionOrderPhase' },
      },
      field: 'order_phase',
      title: $t('page.quantExecutionOrders.columns.phase'),
      width: 90,
    },
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 140,
      title: $t('page.quantExecutionOrders.columns.market'),
    },
    {
      field: 'token_id',
      formatter: ({ cellValue }: { cellValue: string }) => cellValue,
      minWidth: 120,
      showOverflow: 'tooltip',
      title: $t('page.quantExecutionOrders.columns.token'),
    },
    {
      cellRender: { name: 'CellEnumTag', props: { enum: 'Side' } },
      field: 'side',
      title: $t('page.quantExecutionOrders.columns.side'),
      width: 90,
    },
    {
      cellRender: { name: 'CellEnumTag', props: { enum: 'OrderTypeKind' } },
      field: 'order_type',
      title: $t('page.quantExecutionOrders.columns.type'),
      width: 90,
    },
    {
      cellRender: { name: 'CellPrice' },
      field: 'price',
      title: $t('page.quantExecutionOrders.columns.price'),
      width: 100,
    },
    {
      align: 'right',
      field: 'shares',
      formatter: ({ cellValue }: { cellValue: string }) =>
        formatShares(cellValue),
      title: $t('page.quantExecutionOrders.columns.shares'),
      width: 110,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'cost_usd',
      title: $t('page.quantExecutionOrders.columns.cost'),
      width: 120,
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'ExecutionOrderState' },
      },
      field: 'state',
      title: $t('page.quantExecutionOrders.columns.state'),
      width: 140,
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'venue_order_id',
      minWidth: 120,
      title: $t('page.quantExecutionOrders.columns.venueOrderId'),
    },
    {
      field: 'venue_status',
      formatter: ({ cellValue }: { cellValue: null | string }) =>
        formatVenueStatus(cellValue),
      minWidth: 120,
      showOverflow: 'tooltip',
      title: $t('page.quantExecutionOrders.columns.venueStatus'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'submitted_at',
      title: $t('page.quantExecutionOrders.columns.submittedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'filled_at',
      title: $t('page.quantExecutionOrders.columns.filledAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'execution_order_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          iconOp('detail', $t('page.quantExecutionOrders.actions.detail')),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.quantExecutionOrders.columns.operation'),
      width: 72,
    },
  ];
}
