import type { ExecutionOrderView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { formatShares } from '#/shared/components/format';
import {
  useExecutionOrderPhaseTagOptions,
  useExecutionOrderStateTagOptions,
  useOrderTypeKindTagOptions,
  useSideTagOptions,
} from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useExecutionOrderColumns(
  onActionClick: OnActionClickFn<ExecutionOrderView>,
): VxeTableGridOptions<ExecutionOrderView>['columns'] {
  return [
    {
      field: 'execution_order_id',
      minWidth: 150,
      showOverflow: 'tooltip',
      title: $t('page.quantExecutionOrders.columns.executionOrderId'),
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: ExecutionOrderView) =>
            `/quant/intents/${row.order_intent_id}`,
        },
      },
      field: 'order_intent_id',
      minWidth: 150,
      title: $t('page.quantExecutionOrders.columns.orderIntentId'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useExecutionOrderPhaseTagOptions(),
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
      cellRender: { name: 'CellTag', options: useSideTagOptions() },
      field: 'side',
      title: $t('page.quantExecutionOrders.columns.side'),
      width: 90,
    },
    {
      cellRender: { name: 'CellTag', options: useOrderTypeKindTagOptions() },
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
        name: 'CellTag',
        options: useExecutionOrderStateTagOptions(),
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
