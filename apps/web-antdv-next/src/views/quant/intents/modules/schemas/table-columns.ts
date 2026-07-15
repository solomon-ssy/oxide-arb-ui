import type { OrderIntentView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { intentActions } from '@vben/types';

import { $t } from '#/locales';
import { formatShares, formatUsd } from '#/shared/components/format';
import {
  useApprovalStatusTagOptions,
  useOrderIntentStatusTagOptions,
  useQuantRuntimeModeTagOptions,
  useSideTagOptions,
} from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

/** Which governed actions the current operator is permitted to invoke. */
export interface IntentActionPermits {
  canApprove: boolean;
  canCancel: boolean;
  canReject: boolean;
}

export function useIntentColumns(
  onActionClick: OnActionClickFn<OrderIntentView>,
  permits: IntentActionPermits,
): VxeTableGridOptions<OrderIntentView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: OrderIntentView) => `/quant/intents/${row.order_intent_id}`,
        },
      },
      field: 'order_intent_id',
      minWidth: 150,
      title: $t('page.quantIntents.columns.intentId'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useOrderIntentStatusTagOptions(),
      },
      field: 'status',
      title: $t('page.quantIntents.columns.status'),
      width: 150,
    },
    {
      cellRender: { name: 'CellTag', options: useApprovalStatusTagOptions() },
      field: 'approval_status',
      title: $t('page.quantIntents.columns.approvalStatus'),
      width: 140,
    },
    {
      cellRender: { name: 'CellTag', options: useQuantRuntimeModeTagOptions() },
      field: 'runtime_mode',
      title: $t('page.quantIntents.columns.runtimeMode'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: useSideTagOptions() },
      field: 'entry_order.side',
      title: $t('page.quantIntents.columns.side'),
      width: 90,
    },
    {
      cellRender: { name: 'CellPrice' },
      field: 'entry_order.limit_price',
      title: $t('page.quantIntents.columns.limitPrice'),
      width: 110,
    },
    {
      align: 'right',
      field: 'entry_order.amount',
      formatter: ({ row }: { row: OrderIntentView }) =>
        row.entry_order.amount.unit === 'cash_budget'
          ? formatUsd(row.entry_order.amount.value)
          : formatShares(row.entry_order.amount.value),
      title: $t('page.quantIntents.columns.amount'),
      width: 120,
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: OrderIntentView) =>
            `/quant/recommendations/${row.recommendation_id}`,
        },
      },
      field: 'recommendation_id',
      minWidth: 150,
      title: $t('page.quantIntents.columns.recommendationId'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.quantIntents.columns.createdAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'expires_at',
      title: $t('page.quantIntents.columns.expiresAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'order_intent_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          iconOp<OrderIntentView>(
            'detail',
            $t('page.quantIntents.actions.detail'),
          ),
          iconOp<OrderIntentView>(
            'approve',
            $t('page.quantIntents.actions.approve'),
            {
              show: (row) =>
                permits.canApprove && intentActions(row.status).canApprove,
            },
          ),
          iconOp<OrderIntentView>(
            'reject',
            $t('page.quantIntents.actions.reject'),
            {
              danger: true,
              show: (row) =>
                permits.canReject && intentActions(row.status).canReject,
            },
          ),
          iconOp<OrderIntentView>(
            'cancel',
            $t('page.quantIntents.actions.cancel'),
            {
              danger: true,
              show: (row) =>
                permits.canCancel && intentActions(row.status).canCancel,
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.quantIntents.columns.operation'),
      width: 140,
    },
  ];
}
