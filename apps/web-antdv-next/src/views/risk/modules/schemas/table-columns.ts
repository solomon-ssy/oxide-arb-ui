import type {
  PositionStatus,
  PositionView,
  Side,
  UsdString,
} from '@vben/types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { POSITION_STATUSES, SIDES } from '@vben/types';

import { $t } from '#/locales';
import {
  formatShares,
  positionCurrentValueUsd,
} from '#/shared/components/format';

/** Grid row with a derived mark-to-market column for `CellUsd`. */
export type PositionGridRow = PositionView & {
  current_value_usd: null | UsdString;
};

export function toPositionGridRows(items: PositionView[]): PositionGridRow[] {
  return items.map((row) => ({
    ...row,
    current_value_usd: positionCurrentValueUsd(row),
  }));
}

const SIDE_TAG_OPTIONS = [
  { color: 'success', label: $t('enum.side.BUY'), value: SIDES.buy },
  { color: 'error', label: $t('enum.side.SELL'), value: SIDES.sell },
];

const STATUS_TAG_OPTIONS: Array<{
  color: string;
  label: string;
  value: PositionStatus;
}> = [
  {
    color: 'success',
    label: $t('enum.positionStatus.open'),
    value: POSITION_STATUSES.open,
  },
  {
    color: 'processing',
    label: $t('enum.positionStatus.closed'),
    value: POSITION_STATUSES.closed,
  },
  {
    color: 'default',
    label: $t('enum.positionStatus.settled'),
    value: POSITION_STATUSES.settled,
  },
];

function formatSide(side: Side): string {
  return $t(`enum.side.${side}`);
}

/** Position grid columns. Data is store-driven; no remote proxy is required. */
export function usePositionColumns(): VxeTableGridOptions<PositionGridRow>['columns'] {
  return [
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 150,
      title: $t('page.risk.positions.columns.market'),
    },
    {
      cellRender: { name: 'CellTag', options: SIDE_TAG_OPTIONS },
      field: 'side',
      formatter: ({ cellValue }: { cellValue: Side }) => formatSide(cellValue),
      title: $t('page.risk.positions.columns.side'),
      width: 90,
    },
    {
      field: 'shares',
      formatter: ({ cellValue }: { cellValue: string }) =>
        formatShares(cellValue),
      title: $t('page.risk.positions.columns.shares'),
      width: 120,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'total_cost_usd',
      title: $t('page.risk.positions.columns.cost'),
      width: 130,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'current_value_usd',
      title: $t('page.risk.positions.columns.currentValue'),
      width: 140,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'unrealized_pnl',
      title: $t('page.risk.positions.columns.unrealizedPnl'),
      width: 140,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'realized_pnl',
      title: $t('page.risk.positions.columns.realizedPnl'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: STATUS_TAG_OPTIONS },
      field: 'status',
      title: $t('page.risk.positions.columns.status'),
      width: 110,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'opened_at',
      title: $t('page.risk.positions.columns.openedAt'),
      width: 170,
    },
  ];
}
