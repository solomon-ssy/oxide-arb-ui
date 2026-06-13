import type { RiskAuditEventView, TradeState, TradeView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { RISK_AUDIT_EVENT_TYPES, SIDES, TRADE_STATES } from '@vben/types';

import { $t } from '#/locales';
import { formatShares } from '#/shared/components/format';

function tradeStateTagColor(value: TradeState): string {
  if (value === 'settled') return 'success';
  if (value.startsWith('fail')) return 'error';
  return 'processing';
}

function decisionTagColor(value: RiskAuditEventView['event_type']): string {
  if (value === RISK_AUDIT_EVENT_TYPES.tradeAllowed) return 'success';
  if (value === RISK_AUDIT_EVENT_TYPES.tradeDenied) return 'error';
  return 'default';
}

const SIDE_TAG_OPTIONS = [
  { color: 'success', label: $t('enum.side.BUY'), value: SIDES.buy },
  { color: 'error', label: $t('enum.side.SELL'), value: SIDES.sell },
];

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
  color: tradeStateTagColor(value),
  label: $t(`enum.tradeState.${value}`),
  value,
}));

/** Tag color per risk audit decision type (allow green / deny red / rest neutral). */
const DECISION_TAG_OPTIONS = Object.values(RISK_AUDIT_EVENT_TYPES).map(
  (value) => ({
    color: decisionTagColor(value),
    label: $t(`enum.riskAuditEventType.${value}`),
    value,
  }),
);

export function useTradeColumns(
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
      cellRender: { name: 'CellTag', options: SIDE_TAG_OPTIONS },
      field: 'side',
      title: $t('page.trades.columns.side'),
      width: 80,
    },
    {
      field: 'shares',
      formatter: ({ cellValue }: { cellValue: string }) =>
        formatShares(cellValue),
      title: $t('page.trades.columns.shares'),
      width: 110,
    },
    {
      cellRender: { name: 'CellPrice' },
      field: 'price',
      title: $t('page.trades.columns.price'),
      width: 100,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'cost_usd',
      title: $t('page.trades.columns.cost'),
      width: 110,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'net_profit_usd',
      title: $t('page.trades.columns.pnl'),
      width: 110,
    },
    {
      cellRender: { name: 'CellTag', options: STATE_TAG_OPTIONS },
      field: 'state',
      title: $t('page.trades.columns.state'),
      width: 110,
    },
    {
      cellRender: { name: 'CellTag', options: OUTCOME_TAG_OPTIONS },
      field: 'business_outcome',
      title: $t('page.trades.columns.outcome'),
      width: 100,
    },
    {
      cellRender: { name: 'CellExecutionMode' },
      field: 'execution_mode',
      title: $t('page.trades.columns.mode'),
      width: 100,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { onClick: onActionClick },
        name: 'CellOperation',
        options: [{ code: 'detail', text: $t('common.detail') }],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.trades.columns.operation'),
      width: 100,
    },
  ];
}

export function useDecisionColumns(
  onActionClick: OnActionClickFn<RiskAuditEventView>,
): VxeTableGridOptions<RiskAuditEventView>['columns'] {
  return [
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.trades.decisions.time'),
      width: 170,
    },
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 140,
      title: $t('page.trades.decisions.market'),
    },
    {
      cellRender: { name: 'CellTag', options: DECISION_TAG_OPTIONS },
      field: 'event_type',
      title: $t('page.trades.decisions.decision'),
      width: 130,
    },
    {
      align: 'left',
      field: 'rejection_reason',
      formatter: ({ cellValue }: { cellValue: null | string }) =>
        cellValue ?? '—',
      minWidth: 220,
      title: $t('page.trades.decisions.reason'),
    },
    {
      align: 'right',
      cellRender: {
        attrs: { onClick: onActionClick },
        name: 'CellOperation',
        options: [
          {
            code: 'audit',
            show: (row: RiskAuditEventView) => Boolean(row.opportunity_id),
            text: $t('page.trades.decisions.toOpportunity'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.trades.columns.operation'),
      width: 120,
    },
  ];
}
