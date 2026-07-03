import type { SettlementRedeemView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { useSettlementRedeemStateTagOptions } from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useSettlementRedeemColumns(
  onActionClick: OnActionClickFn<SettlementRedeemView>,
): VxeTableGridOptions<SettlementRedeemView>['columns'] {
  return [
    {
      field: 'settlement_redeem_id',
      minWidth: 150,
      showOverflow: 'tooltip',
      title: $t('page.quantSettlementRedeems.columns.batchId'),
    },
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 140,
      title: $t('page.quantSettlementRedeems.columns.market'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useSettlementRedeemStateTagOptions(),
      },
      field: 'state',
      title: $t('page.quantSettlementRedeems.columns.state'),
      width: 140,
    },
    {
      align: 'right',
      field: 'lot_count',
      title: $t('page.quantSettlementRedeems.columns.lotCount'),
      width: 100,
    },
    {
      cellRender: { name: 'CellUsd' },
      field: 'payout_usd',
      title: $t('page.quantSettlementRedeems.columns.payout'),
      width: 130,
    },
    {
      align: 'right',
      field: 'attempt_count',
      title: $t('page.quantSettlementRedeems.columns.attempts'),
      width: 100,
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'tx_hash',
      minWidth: 130,
      title: $t('page.quantSettlementRedeems.columns.txHash'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'submitted_at',
      title: $t('page.quantSettlementRedeems.columns.submittedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'confirmed_at',
      title: $t('page.quantSettlementRedeems.columns.confirmedAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.quantSettlementRedeems.columns.createdAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'settlement_redeem_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          iconOp('detail', $t('page.quantSettlementRedeems.actions.detail')),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.quantSettlementRedeems.columns.operation'),
      width: 72,
    },
  ];
}
