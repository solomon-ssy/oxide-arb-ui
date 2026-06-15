import type {
  BlacklistEntryView,
  BlacklistReason,
  BlacklistScope,
} from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { BLACKLIST_REASONS, BLACKLIST_SCOPES } from '@vben/types';

import { $t } from '#/locales';

const SCOPE_TAG_OPTIONS: Array<{
  color: string;
  label: string;
  value: BlacklistScope;
}> = [
  {
    color: 'warning',
    label: $t('enum.blacklistScope.data_path'),
    value: BLACKLIST_SCOPES.dataPath,
  },
  {
    color: 'error',
    label: $t('enum.blacklistScope.trading_path'),
    value: BLACKLIST_SCOPES.tradingPath,
  },
  {
    color: 'magenta',
    label: $t('enum.blacklistScope.full'),
    value: BLACKLIST_SCOPES.full,
  },
];

const REASON_TAG_OPTIONS: Array<{
  color: string;
  label: string;
  value: BlacklistReason;
}> = Object.values(BLACKLIST_REASONS).map((value) => ({
  color: value === BLACKLIST_REASONS.manual ? 'processing' : 'warning',
  label: $t(`enum.blacklistReason.${value}`),
  value,
}));

export function useBlacklistColumns(
  onActionClick: OnActionClickFn<BlacklistEntryView>,
  canDelete: boolean,
): VxeTableGridOptions<BlacklistEntryView>['columns'] {
  return [
    {
      cellRender: { name: 'CellMarketId' },
      field: 'market_id',
      minWidth: 150,
      title: $t('page.blacklist.columns.market'),
    },
    {
      cellRender: { name: 'CellTag', options: SCOPE_TAG_OPTIONS },
      field: 'scope',
      title: $t('page.blacklist.columns.scope'),
      width: 130,
    },
    {
      cellRender: { name: 'CellTag', options: REASON_TAG_OPTIONS },
      field: 'blacklist_reason',
      title: $t('page.blacklist.columns.reason'),
      width: 190,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'expires_at',
      title: $t('page.blacklist.columns.expiresAt'),
      width: 170,
    },
    {
      field: 'miss_count',
      title: $t('page.blacklist.columns.missCount'),
      width: 100,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.blacklist.columns.createdAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'updated_at',
      title: $t('page.blacklist.columns.updatedAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { onClick: onActionClick },
        name: 'CellOperation',
        options: [
          {
            code: 'remove',
            show: canDelete,
            text: $t('page.blacklist.actions.remove'),
          },
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.blacklist.columns.operation'),
      width: 110,
    },
  ];
}
