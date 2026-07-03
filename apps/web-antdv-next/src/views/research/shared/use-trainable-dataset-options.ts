import type { Ref } from 'vue';

import type { TrainingDatasetView } from '@vben/types';

import { ref } from 'vue';

import { useRequestHandler } from '@vben/request/qp';
import { TRAINING_DATASET_STATUSES } from '@vben/types';

import { message } from 'antdv-next';

import { listTrainingDatasets } from '#/api/research';
import { $t } from '#/locales';

interface OptionItem {
  label: string;
  value: string;
}

export interface TrainableDatasetOptionsParams {
  /** Narrow the trainable pool to a selected model spec (form linkage). */
  modelSpecId?: Ref<string | undefined>;
  /** A preselected dataset id (e.g. a model's `training_dataset_id`). */
  prefillId?: Ref<string | undefined>;
}

export interface TrainableDatasetOptionsControls {
  datasetOptions: Ref<OptionItem[]>;
  loading: Ref<boolean>;
  /** Re-fetch built + ready datasets (call on modal open / spec change). */
  reload: () => Promise<void>;
}

const DATASET_OPTION_SIZE = 200;

function toOption(dataset: TrainingDatasetView): OptionItem {
  return {
    label: `${dataset.training_dataset_id} · ${dataset.status} · ${dataset.sample_count}`,
    value: dataset.training_dataset_id,
  };
}

/**
 * Trainable dataset selector source. The list API filters by a single status,
 * so `built` and `ready` are fetched in parallel and merged (deduped by id,
 * newest-first). An out-of-pool `prefillId` (e.g. an expired dataset on a model
 * row) is injected as a labelled option so the selection is never silently lost.
 */
export function useTrainableDatasetOptions(
  params: TrainableDatasetOptionsParams = {},
): TrainableDatasetOptionsControls {
  const { handleRequest } = useRequestHandler();
  const datasetOptions = ref<OptionItem[]>([]);
  const loading = ref(false);

  async function reload(): Promise<void> {
    loading.value = true;
    const modelSpecId = params.modelSpecId?.value || undefined;
    const [built, ready] = await Promise.all([
      handleRequest(
        () =>
          listTrainingDatasets({
            model_spec_id: modelSpecId,
            size: DATASET_OPTION_SIZE,
            status: TRAINING_DATASET_STATUSES.built,
          }),
        { silent: true },
      ),
      handleRequest(
        () =>
          listTrainingDatasets({
            model_spec_id: modelSpecId,
            size: DATASET_OPTION_SIZE,
            status: TRAINING_DATASET_STATUSES.ready,
          }),
        { silent: true },
      ),
    ]);

    const seen = new Set<string>();
    const options: OptionItem[] = [];
    for (const dataset of [...(built?.items ?? []), ...(ready?.items ?? [])]) {
      if (seen.has(dataset.training_dataset_id)) {
        continue;
      }
      seen.add(dataset.training_dataset_id);
      options.push(toOption(dataset));
    }

    const prefillId = params.prefillId?.value || undefined;
    if (prefillId && !seen.has(prefillId)) {
      options.unshift({
        label: `${prefillId} · ${$t('page.research.datasets.selector.notTrainable')}`,
        value: prefillId,
      });
      message.warning(
        $t('page.research.datasets.selector.prefillOrphan', { id: prefillId }),
      );
    }

    datasetOptions.value = options;
    loading.value = false;
  }

  return { datasetOptions, loading, reload };
}
