import { computed, onMounted, ref } from 'vue';

import { listCalibrationArtifacts } from '#/api/calibration';
import {
  listBacktestReports,
  listModels,
  listModelSpecs,
  listResearchJobs,
  listTrainingDatasets,
} from '#/api/research';

export type ResearchLineageStageKey =
  | 'backtests'
  | 'calibration'
  | 'datasets'
  | 'models'
  | 'publication'
  | 'specs';

export interface ResearchLineageStage {
  count: number;
  entity?: string;
  entityId?: string;
  key: ResearchLineageStageKey;
  labelKey: string;
  module: string;
  occurredAt?: string;
  workspace: string;
}

const EMPTY_STAGES = [
  {
    count: 0,
    key: 'specs',
    labelKey: 'page.research.lineage.stage.specs',
    module: 'specs',
    workspace: '/research/lab',
  },
  {
    count: 0,
    key: 'datasets',
    labelKey: 'page.research.lineage.stage.datasets',
    module: 'datasets',
    workspace: '/research/lab',
  },
  {
    count: 0,
    key: 'models',
    labelKey: 'page.research.lineage.stage.models',
    module: 'models',
    workspace: '/research/lab',
  },
  {
    count: 0,
    key: 'backtests',
    labelKey: 'page.research.lineage.stage.backtests',
    module: 'evaluation',
    workspace: '/research/lab',
  },
  {
    count: 0,
    key: 'calibration',
    labelKey: 'page.research.lineage.stage.calibration',
    module: 'calibration',
    workspace: '/research/learning-policy',
  },
  {
    count: 0,
    key: 'publication',
    labelKey: 'page.research.lineage.stage.publication',
    module: 'calibration',
    workspace: '/research/learning-policy',
  },
] as const satisfies readonly ResearchLineageStage[];

export function useResearchLineage() {
  const stages = ref<ResearchLineageStage[]>(
    EMPTY_STAGES.map((stage) => ({ ...stage })),
  );
  const loading = ref(false);
  const error = ref(false);
  const runningJobs = ref(0);

  async function load() {
    loading.value = true;
    error.value = false;
    try {
      const results = await Promise.allSettled([
        listModelSpecs({ page: 1, size: 1 }),
        listTrainingDatasets({ page: 1, size: 1 }),
        listModels({ page: 1, size: 1 }),
        listBacktestReports({ page: 1, size: 1 }),
        listCalibrationArtifacts({ page: 1, size: 100 }),
        listResearchJobs({ page: 1, size: 1, status: 'running' }),
      ]);
      error.value = results.some((result) => result.status === 'rejected');

      const specs = results[0].status === 'fulfilled' ? results[0].value : null;
      const datasets =
        results[1].status === 'fulfilled' ? results[1].value : null;
      const models =
        results[2].status === 'fulfilled' ? results[2].value : null;
      const backtests =
        results[3].status === 'fulfilled' ? results[3].value : null;
      const calibrations =
        results[4].status === 'fulfilled' ? results[4].value : null;
      const jobs = results[5].status === 'fulfilled' ? results[5].value : null;
      const latestCalibration = calibrations?.items[0];
      const latestPublication = calibrations?.items.find((item) => item.active);
      runningJobs.value = jobs?.total ?? 0;

      stages.value = [
        {
          ...EMPTY_STAGES[0],
          count: specs?.total ?? 0,
          entity: 'model-spec',
          entityId: specs?.items[0]?.model_spec_id,
          occurredAt: specs?.items[0]?.created_at,
        },
        {
          ...EMPTY_STAGES[1],
          count: datasets?.total ?? 0,
          entity: 'training-dataset',
          entityId: datasets?.items[0]?.training_dataset_id,
          occurredAt: datasets?.items[0]?.created_at,
        },
        {
          ...EMPTY_STAGES[2],
          count: models?.total ?? 0,
          entity: 'model-version',
          entityId: models?.items[0]?.model_version_id,
          occurredAt: models?.items[0]?.created_at,
        },
        {
          ...EMPTY_STAGES[3],
          count: backtests?.total ?? 0,
          entity: 'backtest',
          entityId: backtests?.items[0]?.backtest_report_id,
          occurredAt: backtests?.items[0]?.created_at,
        },
        {
          ...EMPTY_STAGES[4],
          count: calibrations?.total ?? 0,
          entity: 'calibration-artifact',
          entityId: latestCalibration?.artifact_id,
          occurredAt: latestCalibration?.created_at,
        },
        {
          ...EMPTY_STAGES[5],
          count: calibrations?.items.filter((item) => item.active).length ?? 0,
          entity: 'calibration-artifact',
          entityId: latestPublication?.artifact_id,
          occurredAt: latestPublication?.created_at,
        },
      ];
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => void load());

  return {
    error,
    live: computed(() => runningJobs.value > 0),
    load,
    loading,
    runningJobs,
    stages,
  };
}
