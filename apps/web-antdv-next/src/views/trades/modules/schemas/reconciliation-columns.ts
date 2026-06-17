import type { TradeView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { TRADE_RECONCILE_RESOLUTIONS, TRADE_STATES } from '@vben/types';

import { $t } from '#/locales';

const OUTCOME_TAG_OPTIONS = [
  {
    color: 'success',
    label: $t('enum.tradeOutcome.success'),
    value: 'success',
  },
  { color: 'warning', label: $t('enum.tradeOutcome.miss'), value: 'miss' },
  { color: 'error', label: $t('enum.tradeOutcome.failed'), value: 'failed' },
];

const STATE_TAG_OPTIONS = Object.values(TRADE_STATES).map((value) => ({
  color: value.startsWith('fail') ? 'error' : 'processing',
  label: $t(`enum.tradeState.${value}`),
  value,
}));

/** Reconciliation queue columns (unknown venue outcomes awaiting operator action). */
export function useReconciliationColumns(
  onActionClick: OnActionClickFn<TradeView>,
): VxeTableGridOptions<TradeView>['columns'] {
  return [
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.trades.columns.time'),
      width: 170,
    },
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 140,
      title: $t('page.trades.columns.market'),
    },
    {
      cellRender: { name: 'CellExecutionMode' },
      field: 'execution_mode',
      title: $t('page.trades.columns.mode'),
      width: 100,
    },
    {
      cellRender: { name: 'CellTag', options: STATE_TAG_OPTIONS },
      field: 'state',
      title: $t('page.trades.columns.state'),
      width: 120,
    },
    {
      cellRender: { name: 'CellTag', options: OUTCOME_TAG_OPTIONS },
      field: 'business_outcome',
      title: $t('page.trades.columns.outcome'),
      width: 100,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'cost_usd',
      title: $t('page.trades.columns.cost'),
      width: 110,
    },
    {
      align: 'left',
      field: 'error_message',
      formatter: ({ cellValue }: { cellValue: null | string }) =>
        cellValue ?? '—',
      minWidth: 180,
      title: $t('page.trades.reconcile.errorMessage'),
    },
    {
      formatter: ({ cellValue }: { cellValue: boolean }) =>
        cellValue ? $t('common.yes') : $t('common.no'),
      field: 'needs_reconcile',
      title: $t('page.trades.columns.needsReconcile'),
      width: 100,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { onClick: onActionClick },
        name: 'CellOperation',
        options: [
          { code: 'detail', text: $t('common.detail') },
          {
            code: 'reconcile',
            danger: true,
            show: (row: TradeView) => row.needs_reconcile,
            text: $t('page.trades.reconcile.action'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.trades.columns.operation'),
      width: 160,
    },
  ];
}

/** Fixed resolution for manual operator reconciliation. */
export const RECONCILE_UNRESOLVABLE = TRADE_RECONCILE_RESOLUTIONS.unresolvable;
