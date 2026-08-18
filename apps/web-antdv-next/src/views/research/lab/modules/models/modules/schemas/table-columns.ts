import type { TrainedModelView } from '@vben/types';

import type { OnActionClickFn, VxeTableGridOptions } from '#/adapter/vxe-table';

import { $t } from '#/locales';
import {
  modelSpecOpenPath,
  modelVersionOpenPath,
  trainingDatasetOpenPath,
} from '#/shared/routes/research-plane';
import { iconOp } from '#/shared/table/cell-operation-presets';

/** Row-action permission gates for the model governance controls. */
export interface ModelActionAccess {
  canBacktest: boolean;
  canCpcv: boolean;
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
            modelVersionOpenPath(row.model_version_id),
        },
      },
      field: 'model_version_id',
      minWidth: 150,
      title: $t('page.research.models.columns.modelVersionId'),
    },
    {
      cellRender: {
        name: 'CellEntityRoute',
        props: {
          mono: true,
          to: (row: TrainedModelView) => modelSpecOpenPath(row.model_spec_id),
        },
      },
      field: 'model_spec_id',
      minWidth: 140,
      title: $t('page.research.models.columns.modelSpec'),
    },
    {
      className: 'font-mono tabular-nums',
      field: 'version',
      title: $t('page.research.models.columns.version'),
      width: 90,
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
              ? trainingDatasetOpenPath(row.training_dataset_id)
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
        ],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('page.research.models.columns.operation'),
      width: 140,
    },
  ];
}
