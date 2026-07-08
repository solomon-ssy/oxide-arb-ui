import type { BasisAlertView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { iconOp } from '#/shared/table/cell-operation-presets';

export interface BasisAlertActionAccess {
  canMutate: boolean;
}

export function useBasisAlertColumns(
  onActionClick: OnActionClickFn<BasisAlertView>,
  access: BasisAlertActionAccess,
): VxeTableGridOptions<BasisAlertView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: BasisAlertView) =>
            `/research/market-linkages?open=${row.market_id}`,
        },
      },
      field: 'market_id',
      minWidth: 160,
      title: $t('page.research.basisAlerts.columns.marketId'),
    },
    {
      field: 'instrument_key',
      minWidth: 180,
      showOverflow: 'tooltip',
      title: $t('page.research.basisAlerts.columns.instrument'),
    },
    {
      field: 'oracle_instrument_key',
      minWidth: 180,
      showOverflow: 'tooltip',
      title: $t('page.research.basisAlerts.columns.oracleInstrument'),
    },
    {
      field: 'basis_bps',
      slots: { default: 'basisBps' },
      title: $t('page.research.basisAlerts.columns.basisBps'),
      width: 130,
    },
    {
      field: 'threshold_bps',
      slots: { default: 'thresholdBps' },
      title: $t('page.research.basisAlerts.columns.thresholdBps'),
      width: 130,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'as_of',
      title: $t('page.research.basisAlerts.columns.asOf'),
      width: 180,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.basisAlerts.columns.createdAt'),
      width: 180,
    },
    {
      field: 'acknowledged',
      slots: { default: 'acknowledged' },
      title: $t('page.research.basisAlerts.columns.acknowledged'),
      width: 160,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'alert_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<BasisAlertView>(
            'acknowledge',
            $t('page.research.basisAlerts.actions.acknowledge'),
            {
              show: (row: BasisAlertView) =>
                access.canMutate && !row.acknowledged,
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.basisAlerts.columns.operation'),
      width: 120,
    },
  ];
}
