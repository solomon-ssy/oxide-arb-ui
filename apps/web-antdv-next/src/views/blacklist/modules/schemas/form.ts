import type { BlacklistReason } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { BLACKLIST_REASONS } from '@vben/types';

import { z } from '#/adapter/form';
import { $t } from '#/locales';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

const MARKET_ID_RE = /^0x[a-fA-F0-9]{64}$/;

const REASON_OPTIONS: Array<SelectOption<BlacklistReason>> = Object.values(
  BLACKLIST_REASONS,
).map((value) => ({
  label: $t(`enum.blacklistReason.${value}`),
  value,
}));

export function useAddBlacklistFormSchema(
  roleOptions: Array<SelectOption>,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: $t('page.blacklist.form.marketPlaceholder'),
      },
      fieldName: 'market_id',
      label: $t('page.blacklist.form.marketId'),
      rules: z
        .string()
        .regex(MARKET_ID_RE, $t('page.blacklist.form.marketInvalid')),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: REASON_OPTIONS,
        placeholder: $t('page.blacklist.form.reasonPlaceholder'),
      },
      fieldName: 'blacklist_reason',
      label: $t('page.blacklist.form.blacklistReason'),
      rules: z.string().min(1, $t('page.blacklist.form.reasonRequired')),
    },
    {
      component: 'Select',
      componentProps: {
        class: 'w-full',
        options: roleOptions,
        placeholder: $t('governance.modal.actingRole'),
      },
      fieldName: 'acting_role',
      label: $t('governance.modal.actingRole'),
      rules: z.string().min(1, $t('governance.error.actingRoleRequired')),
    },
    {
      component: 'Textarea',
      componentProps: {
        maxlength: 1024,
        placeholder: $t('governance.modal.reasonPlaceholder'),
        rows: 4,
        showCount: true,
      },
      fieldName: 'reason',
      label: $t('governance.modal.reason'),
      rules: z.string().min(4, $t('governance.error.reasonTooShort')),
    },
  ];
}
