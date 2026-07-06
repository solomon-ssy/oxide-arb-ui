import type { ResearchJobView } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import {
  isActiveResearchJobStatus,
  isTerminalResearchJobStatus,
  RESEARCH_JOB_KINDS,
  RESEARCH_JOB_STATUSES,
} from '@vben/types';

import { $t } from '#/locales';
import {
  useResearchJobKindTagOptions,
  useResearchJobStatusTagOptions,
} from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

/** Human-readable progress cell: phase + completion percent. */
function formatProgress(row: ResearchJobView): string {
  if (row.status === RESEARCH_JOB_STATUSES.queued) {
    return $t('page.research.jobs.progress.queued');
  }
  if (row.status === RESEARCH_JOB_STATUSES.succeeded) {
    return '100%';
  }
  const phase = row.progress?.phase ?? '';
  const progressPct = row.progress_pct;
  const pct =
    typeof progressPct === 'number' ? `${Math.round(progressPct * 100)}%` : '';
  const label = [phase, pct].filter(Boolean).join(' ');
  return label || $t('page.research.jobs.progress.pending');
}

/** Deep-link route to a terminal job's result artifact, by kind. */
export function jobResultRoute(row: ResearchJobView): string | undefined {
  if (!row.result_ref) {
    return undefined;
  }
  switch (row.kind) {
    case RESEARCH_JOB_KINDS.backtest: {
      return `/research/backtests?open=${row.result_ref}`;
    }
    case RESEARCH_JOB_KINDS.biasTableFit: {
      return `/research/bias-tables?open=${row.result_ref}`;
    }
    case RESEARCH_JOB_KINDS.datasetBuild: {
      return `/research/datasets?open=${row.result_ref}`;
    }
    case RESEARCH_JOB_KINDS.modelTrain: {
      return `/research/models?open=${row.result_ref}`;
    }
    default: {
      return undefined;
    }
  }
}

export function useResearchJobColumns(
  onActionClick: OnActionClickFn<ResearchJobView>,
  canMutate: boolean,
): VxeTableGridOptions<ResearchJobView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: ResearchJobView) => `/research/jobs?open=${row.job_id}`,
        },
      },
      field: 'job_id',
      minWidth: 150,
      title: $t('page.research.jobs.columns.jobId'),
    },
    {
      cellRender: { name: 'CellTag', options: useResearchJobKindTagOptions() },
      field: 'kind',
      title: $t('page.research.jobs.columns.kind'),
      width: 130,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: useResearchJobStatusTagOptions(),
      },
      field: 'status',
      title: $t('page.research.jobs.columns.status'),
      width: 120,
    },
    {
      field: 'progress',
      formatter: ({ row }: { row: ResearchJobView }) => formatProgress(row),
      minWidth: 160,
      title: $t('page.research.jobs.columns.progress'),
    },
    {
      field: 'acting_role',
      title: $t('page.research.jobs.columns.submittedBy'),
      width: 130,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.jobs.columns.createdAt'),
      width: 170,
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'finished_at',
      title: $t('page.research.jobs.columns.finishedAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: { nameField: 'job_id', onClick: onActionClick },
        name: 'CellOperation',
        options: [
          iconOp<ResearchJobView>(
            'detail',
            $t('page.research.jobs.actions.detail'),
          ),
          iconOp<ResearchJobView>(
            'result',
            $t('page.research.jobs.actions.openResult'),
            { show: (row) => Boolean(jobResultRoute(row)) },
          ),
          iconOp<ResearchJobView>(
            'cancel',
            $t('page.research.jobs.actions.cancel'),
            {
              show: (row) => canMutate && isActiveResearchJobStatus(row.status),
            },
          ),
          iconOp<ResearchJobView>(
            'retry',
            $t('page.research.jobs.actions.retry'),
            {
              show: (row) =>
                canMutate && isTerminalResearchJobStatus(row.status),
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.jobs.columns.operation'),
      width: 140,
    },
  ];
}

export function useResearchJobSearchSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(RESEARCH_JOB_KINDS).map((value) => ({
          label: $t(`enum.researchJobKind.${value}`),
          value,
        })),
      },
      fieldName: 'kind',
      label: $t('page.research.jobs.filters.kind'),
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: Object.values(RESEARCH_JOB_STATUSES).map((value) => ({
          label: $t(`enum.researchJobStatus.${value}`),
          value,
        })),
      },
      fieldName: 'status',
      label: $t('page.research.jobs.filters.status'),
    },
    {
      component: 'RangePicker',
      componentProps: {
        allowClear: true,
        showTime: true,
        valueFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      },
      fieldName: 'range',
      label: $t('page.research.jobs.filters.createdAt'),
    },
  ];
}
