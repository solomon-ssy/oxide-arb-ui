import type { SettlementRedeemView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { formatUsd } from '#/shared/components/format';
import {
  useSettlementCaseStateTagOptions,
  useSettlementEffectivePolicyTagOptions,
} from '#/shared/components/format/tag-options';
import { settlementRedeemOpenPath } from '#/shared/routes/execution-plane';
import { iconOp } from '#/shared/table/cell-operation-presets';

export function useSettlementRedeemColumns(
  onActionClick: OnActionClickFn<SettlementRedeemView>,
): VxeTableGridOptions<SettlementRedeemView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: SettlementRedeemView) =>
            settlementRedeemOpenPath(row.settlement_redeem_id),
        },
      },
      field: 'settlement_redeem_id',
      minWidth: 150,
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
        options: useSettlementCaseStateTagOptions(),
      },
      field: 'state',
      title: $t('page.quantSettlementRedeems.columns.state'),
      width: 140,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useSettlementEffectivePolicyTagOptions(),
      },
      field: 'effective_policy',
      title: $t('page.quantSettlementRedeems.columns.effectivePolicy'),
      width: 150,
    },
    {
      align: 'right',
      field: 'inventory_lot_count',
      title: $t('page.quantSettlementRedeems.columns.inventoryLotCount'),
      width: 100,
    },
    {
      align: 'right',
      field: 'actual_payout_usd',
      formatter: ({ row }) =>
        `${formatUsd(row.actual_payout_usd)} / ${formatUsd(row.expected_payout_usd)}`,
      minWidth: 160,
      title: $t('page.quantSettlementRedeems.columns.payout'),
    },
    {
      align: 'right',
      field: 'attempt_count',
      title: $t('page.quantSettlementRedeems.columns.attempts'),
      width: 100,
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'deployment_digest',
      minWidth: 130,
      title: $t('page.quantSettlementRedeems.columns.deploymentDigest'),
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
