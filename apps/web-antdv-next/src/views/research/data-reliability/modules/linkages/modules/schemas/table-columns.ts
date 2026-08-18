import type { MarketLinkageSummaryView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { marketLinkageOpenPath } from '#/shared/routes/research-plane';
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
            marketLinkageOpenPath(row.market_id),
        },
      },
      field: 'market_id',
      minWidth: 160,
      title: $t('page.research.marketLinkages.columns.marketId'),
    },
    {
      cellRender: { name: 'CellEnumTag', props: { enum: 'LinkageStatus' } },
      field: 'status',
      title: $t('page.research.marketLinkages.columns.status'),
      width: 130,
    },
    {
      cellRender: { name: 'CellEnumTag', props: { enum: 'ResolverTier' } },
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
      cellRender: { name: 'CellEnumTag', props: { enum: 'DomainFamily' } },
      field: 'domain_family',
      title: $t('page.research.marketLinkages.columns.family'),
      width: 110,
    },
    {
      field: 'source_bindings',
      minWidth: 260,
      showOverflow: 'tooltip',
      slots: { default: 'sourceBindings' },
      title: $t('page.research.marketLinkages.columns.sourceBindings'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'derived_at',
      title: $t('page.research.marketLinkages.columns.derivedAt'),
      width: 180,
    },
    {
      cellRender: {
        attrs: { nameField: 'market_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<MarketLinkageSummaryView>(
            'detail',
            $t('page.research.marketLinkages.actions.detail'),
          ),
          iconOp<MarketLinkageSummaryView>(
            'resolve',
            $t('page.research.marketLinkages.actions.reResolveOne'),
            { show: () => access.canMutate },
          ),
          iconOp<MarketLinkageSummaryView>(
            'override',
            $t('page.research.marketLinkages.actions.override'),
            {
              show: (row) => access.canMutate && row.domain_family === 'crypto',
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
