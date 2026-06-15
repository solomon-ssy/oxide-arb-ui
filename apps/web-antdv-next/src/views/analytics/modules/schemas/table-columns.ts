import type { MarketPerformanceGridRow } from './types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';

export function useMarketPerformanceColumns(): VxeTableGridOptions<MarketPerformanceGridRow>['columns'] {
  return [
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 170,
      title: $t('page.analytics.marketPerformance.columns.market'),
    },
    {
      field: 'trade_count',
      minWidth: 110,
      title: $t('page.analytics.marketPerformance.columns.trades'),
    },
    {
      cellRender: { name: 'CellPercent', props: { fractionDigits: 1 } },
      field: 'success_rate',
      minWidth: 110,
      title: $t('page.analytics.marketPerformance.columns.winRate'),
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'net_profit_usd',
      minWidth: 130,
      title: $t('page.analytics.marketPerformance.columns.netPnl'),
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'total_cost_usd',
      minWidth: 130,
      title: $t('page.analytics.marketPerformance.columns.totalCost'),
    },
    {
      cellRender: { name: 'CellBps' },
      field: 'avg_edge_bps',
      minWidth: 130,
      title: $t('page.analytics.marketPerformance.columns.avgEdge'),
    },
  ];
}
