import type { TrainedModelView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import { usePublicationStatusTagOptions } from '#/shared/components/format/tag-options';
import { iconOp } from '#/shared/table/cell-operation-presets';

import { canOfferModelPublish } from '../model-action-state';

/** Row-action permission gates for the model governance controls. */
export interface ModelActionAccess {
  canBacktest: boolean;
  canCpcv: boolean;
  canPublish: boolean;
  canRetire: boolean;
}

export function useTrainedModelColumns(
  onActionClick: OnActionClickFn<TrainedModelView>,
  access: ModelActionAccess,
): VxeTableGridOptions<TrainedModelView>['columns'] {
  return [
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: TrainedModelView) =>
            `/research/models?open=${row.model_version_id}`,
        },
      },
      field: 'model_version_id',
      minWidth: 150,
      title: $t('page.research.models.columns.modelVersionId'),
    },
    {
      field: 'model_spec_id',
      minWidth: 140,
      showOverflow: 'tooltip',
      title: $t('page.research.models.columns.modelSpec'),
    },
    {
      align: 'right',
      field: 'version',
      title: $t('page.research.models.columns.version'),
      width: 90,
    },
    {
      cellRender: {
        name: 'CellTag',
        options: usePublicationStatusTagOptions(),
      },
      field: 'publication_status',
      title: $t('page.research.models.columns.status'),
      width: 120,
    },
    {
      cellRender: { name: 'CellCopy' },
      field: 'artifact_hash',
      minWidth: 130,
      title: $t('page.research.models.columns.artifactHash'),
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: TrainedModelView) =>
            row.training_dataset_id
              ? `/research/datasets?open=${row.training_dataset_id}`
              : undefined,
        },
      },
      field: 'training_dataset_id',
      minWidth: 150,
      title: $t('page.research.models.columns.dataset'),
    },
    {
      cellRender: { name: 'CellDateTime' },
      field: 'created_at',
      title: $t('page.research.models.columns.createdAt'),
      width: 170,
    },
    {
      align: 'right',
      cellRender: {
        attrs: {
          nameField: 'model_version_id',
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: [
          iconOp<TrainedModelView>(
            'detail',
            $t('page.research.models.actions.detail'),
          ),
          iconOp<TrainedModelView>(
            'backtest',
            $t('page.research.models.actions.backtest'),
            {
              show: (row) =>
                access.canBacktest &&
                row.model_family !== 'hold_vs_exit_weighted',
            },
          ),
          iconOp<TrainedModelView>(
            'cpcv',
            $t('page.research.models.actions.cpcv'),
            { show: () => access.canCpcv },
          ),
          iconOp<TrainedModelView>(
            'publish',
            $t('page.research.models.actions.publish'),
            {
              show: (row) =>
                canOfferModelPublish(access.canPublish, row.publication_status),
            },
          ),
          iconOp<TrainedModelView>(
            'retire',
            $t('page.research.models.actions.retire'),
            {
              danger: true,
              show: (row) =>
                access.canRetire && row.publication_status === 'published',
            },
          ),
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.models.columns.operation'),
      width: 180,
    },
  ];
}
