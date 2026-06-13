import type { MarketView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { MARKET_STATUSES } from '@vben/types';

import { $t } from '#/locales';
import { formatPrice } from '#/shared/components/format';

/** Tag color per market lifecycle status. */
const STATUS_TAG_OPTIONS = [
  { color: 'default', value: MARKET_STATUSES.discovered },
  { color: 'default', value: MARKET_STATUSES.filtered },
  { color: 'success', value: MARKET_STATUSES.active },
  { color: 'warning', value: MARKET_STATUSES.paused },
  { color: 'processing', value: MARKET_STATUSES.settled },
  { color: 'error', value: MARKET_STATUSES.delisted },
].map((option) => ({
  ...option,
  label: $t(`enum.marketStatus.${option.value}`),
}));

/** Combined YES best bid·ask cell (`0.9700 · 0.9800`, placeholder per side). */
function formatYesQuote(row: MarketView): string {
  if (!row.book) {
    return '—';
  }
  return `${formatPrice(row.book.yes_best_bid)} · ${formatPrice(row.book.yes_best_ask)}`;
}

export function useColumns(
  onActionClick: OnActionClickFn<MarketView>,
  onSubscribeToggle: (
    checked: boolean,
    row: MarketView,
  ) => PromiseLike<boolean | undefined>,
  canToggleSubscription: boolean,
): VxeTableGridOptions<MarketView>['columns'] {
  return [
    {
      field: 'question',
      minWidth: 260,
      align: 'left',
      title: $t('page.markets.columns.question'),
    },
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      title: $t('page.markets.columns.marketId'),
      width: 140,
    },
    {
      field: 'book',
      formatter: ({ row }) => formatYesQuote(row),
      title: $t('page.markets.columns.yesQuote'),
      width: 150,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'book.depth_usd',
      title: $t('page.markets.columns.depth'),
      width: 120,
    },
    {
      cellRender: { name: 'CellTag', options: STATUS_TAG_OPTIONS },
      field: 'status',
      title: $t('page.markets.columns.status'),
      width: 100,
    },
    {
      cellRender: {
        attrs: { beforeChange: onSubscribeToggle },
        name: 'CellSwitch',
        props: {
          checkedChildren: $t('page.markets.columns.subscribedOn'),
          checkedValue: true,
          disabled: !canToggleSubscription,
          unCheckedChildren: $t('page.markets.columns.subscribedOff'),
          unCheckedValue: false,
        },
      },
      field: 'subscribed',
      title: $t('page.markets.columns.subscribed'),
      width: 110,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { onClick: onActionClick },
        name: 'CellOperation',
        options: [
          {
            code: 'detail',
            text: $t('common.detail'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.markets.columns.operation'),
      width: 100,
    },
  ];
}
