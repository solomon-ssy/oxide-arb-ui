import type { DomainSourceCursorView } from '@vben/types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { useDomainCursorStatusTagOptions } from '#/shared/components/format/tag-options';

export function useDomainSourceColumns(): VxeTableGridOptions<DomainSourceCursorView>['columns'] {
  return [
    {
      field: 'source_id',
      title: $t('page.research.domainSources.table.source'),
      width: 120,
    },
    {
      field: 'instrument_key',
      minWidth: 220,
      showOverflow: 'tooltip',
      slots: { default: 'instrument' },
      title: $t('page.research.domainSources.table.instrument'),
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useDomainCursorStatusTagOptions(),
      },
      field: 'status',
      title: $t('page.research.domainSources.table.status'),
      width: 130,
    },
    {
      field: 'lag_secs',
      slots: { default: 'lag' },
      title: $t('page.research.domainSources.table.lag'),
      width: 100,
    },
    {
      field: 'last_error',
      minWidth: 240,
      showOverflow: 'tooltip',
      slots: { default: 'lastError' },
      title: $t('page.research.domainSources.table.lastError'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'last_event_time',
      title: $t('page.research.domainSources.table.lastEvent'),
      width: 180,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'updated_at',
      title: $t('page.research.domainSources.table.cursorUpdated'),
      width: 180,
    },
  ];
}
