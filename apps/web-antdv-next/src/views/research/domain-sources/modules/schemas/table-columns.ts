import type { DomainSourceExpectationView } from '@vben/types';

import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { useDomainSourceExpectationStatusTagOptions } from '#/shared/components/format/tag-options';

export function useDomainSourceColumns(): VxeTableGridOptions<DomainSourceExpectationView>['columns'] {
  return [
    {
      field: 'family',
      title: $t('page.research.domainSources.table.family'),
      width: 100,
    },
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
      field: 'status',
      cellRender: {
        name: 'CellTag',
        options: useDomainSourceExpectationStatusTagOptions(),
      },
      title: $t('page.research.domainSources.table.status'),
      width: 160,
    },
    {
      field: 'cursor_status',
      slots: { default: 'cursorStatus' },
      title: $t('page.research.domainSources.table.cursorStatus'),
      width: 130,
    },
    {
      field: 'required',
      slots: { default: 'required' },
      title: $t('page.research.domainSources.table.required'),
      width: 120,
    },
    {
      field: 'status_reason',
      minWidth: 240,
      showOverflow: 'tooltip',
      slots: { default: 'statusReason' },
      title: $t('page.research.domainSources.table.statusReason'),
    },
    {
      field: 'freshness_secs',
      title: $t('page.research.domainSources.table.freshness'),
      width: 130,
    },
    {
      field: 'lag_secs',
      slots: { default: 'lag' },
      title: $t('page.research.domainSources.table.lag'),
      width: 110,
    },
    {
      field: 'checkpoint_hash',
      minWidth: 240,
      slots: { default: 'checkpoint' },
      title: $t('page.research.domainSources.table.checkpoint'),
    },
    {
      field: 'last_event_time',
      slots: { default: 'lastEvent' },
      title: $t('page.research.domainSources.table.lastEvent'),
      width: 180,
    },
    {
      field: 'cursor_updated_at',
      slots: { default: 'cursorUpdated' },
      title: $t('page.research.domainSources.table.cursorUpdated'),
      width: 180,
    },
    {
      field: 'affected_market_ids',
      minWidth: 180,
      slots: { default: 'affected' },
      title: $t('page.research.domainSources.table.affected'),
    },
  ];
}
