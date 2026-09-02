import type { PositionView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { formatShares } from '#/shared/components/format';
import { categoryOptions } from '#/shared/presentation/enum-options';
import {
  orderIntentOpenPath,
  positionOpenPath,
} from '#/shared/routes/execution-plane';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function usePositionColumns(
  onActionClick: OnActionClickFn<PositionView>,
): VxeTableGridOptions<PositionView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: PositionView) =>
            positionOpenPath(row.strategy_position_lot_id),
        },
      },
      field: 'strategy_position_lot_id',
      minWidth: 150,
      title: $t('page.quantPositions.columns.lotId'),
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'StrategyPositionOriginKind' },
      },
      field: 'origin_kind',
      title: $t('page.quantPositions.columns.origin'),
      width: 170,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: categoryOptions(['system_lot'], 'positionPlane'),
      },
      field: 'position_plane',
      title: $t('page.quantPositions.columns.positionPlane'),
      width: 120,
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: PositionView) =>
            row.order_intent_id
              ? orderIntentOpenPath(row.order_intent_id)
              : undefined,
        },
      },
      field: 'order_intent_id',
      minWidth: 150,
      title: $t('page.quantPositions.columns.orderIntentId'),
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'recovery_incident_id',
      minWidth: 160,
      title: $t('page.quantPositions.columns.recoveryIncidentId'),
    },
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 140,
      title: $t('page.quantPositions.columns.market'),
    },
    {
      field: 'token_id',
      formatter: ({ cellValue }: { cellValue: string }) => cellValue,
      minWidth: 120,
      showOverflow: 'tooltip',
      title: $t('page.quantPositions.columns.token'),
    },
    {
      cellRender: {
        name: 'CellEnumTag',
        props: { enum: 'PositionLedgerState' },
      },
      field: 'state',
      title: $t('page.quantPositions.columns.state'),
      width: 120,
    },
    {
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
      cellRender: {
        attrs: {
          nameField: 'strategy_position_lot_id',
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
