import type { PositionView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { formatShares } from '#/shared/components/format';
import { usePositionLedgerStateTagOptions } from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function usePositionColumns(
  onActionClick: OnActionClickFn<PositionView>,
): VxeTableGridOptions<PositionView>['columns'] {
  return [
    {
      field: 'position_id',
      minWidth: 150,
      showOverflow: 'tooltip',
      title: $t('page.quantPositions.columns.positionId'),
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: PositionView) => `/quant/intents/${row.order_intent_id}`,
        },
      },
      field: 'order_intent_id',
      minWidth: 150,
      title: $t('page.quantPositions.columns.orderIntentId'),
    },
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 140,
      title: $t('page.quantPositions.columns.market'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: usePositionLedgerStateTagOptions(),
      },
      field: 'state',
      title: $t('page.quantPositions.columns.state'),
      width: 120,
    },
    {
      align: 'right',
      field: 'shares',
      formatter: ({ cellValue }: { cellValue: string }) =>
        formatShares(cellValue),
      title: $t('page.quantPositions.columns.shares'),
      width: 120,
    },
    {
      cellRender: { name: 'CellPrice' },
      field: 'avg_price',
      title: $t('page.quantPositions.columns.avgPrice'),
      width: 110,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'cost_usd',
      title: $t('page.quantPositions.columns.cost'),
      width: 120,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'realized_pnl_usd',
      title: $t('page.quantPositions.columns.realizedPnl'),
      width: 130,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'opened_at',
      title: $t('page.quantPositions.columns.openedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'closed_at',
      title: $t('page.quantPositions.columns.closedAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'position_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [iconOp('detail', $t('page.quantPositions.actions.detail'))],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.quantPositions.columns.operation'),
      width: 72,
    },
  ];
}
