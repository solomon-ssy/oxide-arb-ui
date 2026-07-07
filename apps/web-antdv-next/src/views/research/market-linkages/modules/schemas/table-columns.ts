import type { MarketLinkageSummaryView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  useDomainFamilyTagOptions,
  useLinkageStatusTagOptions,
  useResolverTierTagOptions,
} from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

export interface MarketLinkageActionAccess {
  canMutate: boolean;
}

export function useMarketLinkageColumns(
  onActionClick: OnActionClickFn<MarketLinkageSummaryView>,
  access: MarketLinkageActionAccess,
): VxeTableGridOptions<MarketLinkageSummaryView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: MarketLinkageSummaryView) =>
            `/research/market-linkages?open=${row.market_id}`,
        },
      },
      field: 'market_id',
      minWidth: 160,
      title: $t('page.research.marketLinkages.columns.marketId'),
    },
    {
      cellRender: { name: 'CellTag', options: useLinkageStatusTagOptions() },
      field: 'status',
      title: $t('page.research.marketLinkages.columns.status'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: useResolverTierTagOptions() },
      field: 'resolver_tier',
      title: $t('page.research.marketLinkages.columns.tier'),
      width: 140,
    },
    {
      field: 'confidence',
      title: $t('page.research.marketLinkages.columns.confidence'),
      width: 110,
    },
    {
      cellRender: { name: 'CellTag', options: useDomainFamilyTagOptions() },
      field: 'domain_family',
      title: $t('page.research.marketLinkages.columns.family'),
      width: 110,
    },
    {
      field: 'instrument_key',
      minWidth: 180,
      showOverflow: 'tooltip',
      slots: { default: 'instrument' },
      title: $t('page.research.marketLinkages.columns.instrument'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'derived_at',
      title: $t('page.research.marketLinkages.columns.derivedAt'),
      width: 180,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'market_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<MarketLinkageSummaryView>(
            'detail',
            $t('page.research.marketLinkages.actions.detail'),
          ),
          iconOp<MarketLinkageSummaryView>(
            'override',
            $t('page.research.marketLinkages.actions.override'),
            {
              show: (row) => access.canMutate && row.status !== 'resolved',
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.marketLinkages.columns.operation'),
      width: 160,
    },
  ];
}
