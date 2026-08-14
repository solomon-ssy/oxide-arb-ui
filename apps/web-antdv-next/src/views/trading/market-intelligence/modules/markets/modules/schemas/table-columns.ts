import type { MarketView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  formatPrice,
  formatUsd,
  truncateHexId,
} from '#/shared/components/format';
import { enumOptions } from '#/shared/presentation/enum-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

/** Row type: the market view plus a UI-only `resolved` flag (WS `market.resolved`). */
export type MarketRow = MarketView & { _resolved?: boolean };

export function useMarketColumns(
  onActionClick: OnActionClickFn<MarketRow>,
  canUpdate: boolean,
  onSubscriptionChange: (
    row: MarketRow,
    subscribed: boolean,
  ) => Promise<boolean>,
): VxeTableGridOptions<MarketRow>['columns'] {
  return [
    {
      field: 'question',
      minWidth: 280,
      showOverflow: 'tooltip',
      title: $t('page.markets.columns.question'),
    },
    {
      cellRender: { name: 'CellEnumTag', props: { enum: 'MarketStatus' } },
      field: 'status',
      title: $t('page.markets.columns.status'),
      width: 120,
    },
    {
      cellRender: {
        attrs: {
          emptyColor: 'default',
          emptyLabel: $t('page.markets.unknownCategory'),
        },
        name: 'CellTags',
        options: enumOptions('MarketCategory'),
      },
      field: 'categories',
      minWidth: 150,
      title: $t('page.markets.columns.category'),
    },
    {
      field: 'yes_token_id',
      formatter: ({ cellValue }: { cellValue: string }) =>
        truncateHexId(cellValue),
      minWidth: 130,
      title: $t('page.markets.columns.yesToken'),
    },
    {
      field: 'no_token_id',
      formatter: ({ cellValue }: { cellValue: string }) =>
        truncateHexId(cellValue),
      minWidth: 130,
      title: $t('page.markets.columns.noToken'),
    },
    {
      field: 'book.yes_best_bid',
      formatter: ({ row }: { row: MarketRow }) =>
        `${formatPrice(row.book?.yes_best_bid)} / ${formatPrice(row.book?.yes_best_ask)}`,
      title: $t('page.markets.columns.yesBidAsk'),
      width: 130,
    },
    {
      field: 'book.depth_usd',
      formatter: ({ row }: { row: MarketRow }) =>
        formatUsd(row.book?.depth_usd),
      title: $t('page.markets.columns.depth'),
      width: 120,
    },
    {
      cellRender: {
        attrs: {
          beforeChange: (subscribed: boolean, row: MarketRow) =>
            onSubscriptionChange(row, subscribed),
        },
        name: 'CellSwitch',
        props: {
          checkedChildren: $t('page.markets.subscribed'),
          checkedValue: true,
          disabled: !canUpdate,
          unCheckedChildren: $t('page.markets.unsubscribed'),
          unCheckedValue: false,
        },
      },
      field: 'subscribed',
      title: $t('page.markets.columns.subscribed'),
      width: 120,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'updated_at',
      title: $t('page.markets.columns.updatedAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'market_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<MarketRow>('detail', $t('page.markets.actions.detail')),
          iconOp<MarketRow>('block', $t('page.markets.actions.block'), {
            show: (row) => canUpdate && row.status !== 'manually_blocked',
          }),
          iconOp<MarketRow>('unblock', $t('page.markets.actions.unblock'), {
            show: (row) => canUpdate && row.status === 'manually_blocked',
          }),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.markets.columns.operation'),
      width: 104,
    },
  ];
}
