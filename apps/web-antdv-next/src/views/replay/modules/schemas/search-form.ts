import type { VbenFormSchema } from '#/adapter/form';

import { MATERIALIZATION_RUN_STATUSES } from '@vben/types';

import { $t } from '#/locales';

/** Status filter for the replay run grid. */
export function useReplaySearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(MATERIALIZATION_RUN_STATUSES).map((value) => ({
          label: $t(`enum.materializationRunStatus.${value}`),
          value,
        })),
        placeholder: $t('page.replay.search.statusPlaceholder'),
      },
      fieldName: 'status',
      label: $t('page.replay.search.status'),
    },
  ];
}
