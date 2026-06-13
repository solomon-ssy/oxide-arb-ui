import type { OpportunityListView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { SIDES } from '@vben/types';

import { $t } from '#/locales';
import { formatShares } from '#/shared/components/format';

const SIDE_TAG_OPTIONS = [
  { color: 'success', label: $t('enum.side.BUY'), value: SIDES.buy },
  { color: 'error', label: $t('enum.side.SELL'), value: SIDES.sell },
];

/** Shared column set for the `recent` and `history` detection grids. */
export function useDetectionColumns(
  onActionClick: OnActionClickFn<OpportunityListView>,
): VxeTableGridOptions<OpportunityListView>['columns'] {
  return [
    {
      cellRender: { name: 'CellDateTime' },
      field: 'detected_at',
      title: $t('page.opportunities.columns.detectedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 140,
      title: $t('page.opportunities.columns.market'),
    },
    {
      cellRender: { name: 'CellTag', options: SIDE_TAG_OPTIONS },
      field: 'side',
      title: $t('page.opportunities.columns.side'),
      width: 80,
    },
    {
      cellRender: { name: 'CellPrice' },
      field: 'entry_price',
      title: $t('page.opportunities.columns.entryPrice'),
      width: 100,
    },
    {
      field: 'shares',
      formatter: ({ cellValue }: { cellValue: string }) =>
        formatShares(cellValue),
      title: $t('page.opportunities.columns.shares'),
      width: 110,
    },
    {
      cellRender: { name: 'CellBps' },
      field: 'edge_bps',
      title: $t('page.opportunities.columns.edge'),
      width: 110,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'expected_net_profit_usd',
      title: $t('page.opportunities.columns.expectedProfit'),
      width: 120,
    },
    {
      cellRender: { name: 'CellPercent' },
      field: 'confidence',
      title: $t('page.opportunities.columns.confidence'),
      width: 100,
    },
    {
      field: 'score',
      formatter: ({ cellValue }: { cellValue: null | string }) =>
        cellValue ?? '—',
      title: $t('page.opportunities.columns.score'),
      width: 90,
    },
    {
      field: 'price_zone',
      formatter: ({ cellValue }: { cellValue: string }) =>
        $t(`enum.priceZone.${cellValue}`),
      title: $t('page.opportunities.columns.priceZone'),
      width: 110,
    },
    {
      field: 'category',
      formatter: ({ cellValue }: { cellValue: string }) =>
        $t(`enum.marketCategory.${cellValue}`),
      title: $t('page.opportunities.columns.category'),
      width: 110,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { onClick: onActionClick },
        name: 'CellOperation',
        options: [
          {
            code: 'audit',
            text: $t('page.opportunities.actions.audit'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.opportunities.columns.operation'),
      width: 110,
    },
  ];
}

/** Funnel stage row shape rendered by the stats grid. */
export interface FunnelStageRow {
  stage: string;
  count: number;
  rate: null | string;
}

export function useFunnelColumns(): VxeTableGridOptions<FunnelStageRow>['columns'] {
  return [
    {
      field: 'stage',
      formatter: ({ cellValue }: { cellValue: string }) =>
        $t(`enum.opportunityAuditStage.${cellValue}`),
      minWidth: 160,
      title: $t('page.opportunities.funnel.stage'),
    },
    {
      field: 'count',
      title: $t('page.opportunities.funnel.count'),
      width: 120,
    },
    {
      cellRender: { name: 'CellPercent' },
      field: 'rate',
      title: $t('page.opportunities.funnel.rate'),
      width: 140,
    },
  ];
}
