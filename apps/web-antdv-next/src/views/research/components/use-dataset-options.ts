import type { Ref } from 'vue';

import type { DatasetPurpose, TrainingDatasetView } from '@vben/types';

import { ref } from 'vue';

import { useRequestHandler } from '@vben/request/qp';
import { TRAINING_DATASET_STATUSES } from '@vben/types';

import { message } from 'antdv-next';

import { listAllTrainingDatasets } from '#/api/research';
import { $t } from '#/locales';

import { isDatasetSelectable } from './dataset-selection';

interface OptionItem {
  label: string;
  value: string;
}

export interface DatasetOptionsParams {
  /** Required statistical purpose; consumers cannot share an unscoped pool. */
  purpose: DatasetPurpose;
  /** Narrow the eligible pool to the selected model spec. */
  modelSpecId?: Ref<string | undefined>;
  /** Optional handoff id that must independently satisfy every eligibility gate. */
  prefillId?: Ref<string | undefined>;
}

export interface DatasetOptionsControls {
  datasetOptions: Ref<OptionItem[]>;
  datasetFor: (id: string) => TrainingDatasetView | undefined;
  loading: Ref<boolean>;
  /** Re-fetch all integrity-gated Ready datasets for the exact purpose. */
  reload: () => Promise<void>;
}

function toOption(dataset: TrainingDatasetView): OptionItem {
  return {
    label: `${dataset.training_dataset_id} · ${dataset.purpose} · ${dataset.sample_count}`,
    value: dataset.training_dataset_id,
  };
}

/**
 * Purpose-scoped dataset selector source. The API filter is repeated locally
 * and the v2 ledger/manifest binding is verified before an option is exposed.
 */
export function useDatasetOptions(
  params: DatasetOptionsParams,
): DatasetOptionsControls {
  const { handleRequest } = useRequestHandler();
  const datasetOptions = ref<OptionItem[]>([]);
  const datasetsById = new Map<string, TrainingDatasetView>();
  const loading = ref(false);

  async function reload(): Promise<void> {
    loading.value = true;
    try {
      const modelSpecId = params.modelSpecId?.value || undefined;
      const ready = await handleRequest(
        () =>
          listAllTrainingDatasets({
            model_spec_id: modelSpecId,
            purpose: params.purpose,
            status: TRAINING_DATASET_STATUSES.ready,
          }),
        { silent: true },
      );

      datasetsById.clear();
      const options: OptionItem[] = [];
      for (const dataset of ready ?? []) {
        if (
          datasetsById.has(dataset.training_dataset_id) ||
          !isDatasetSelectable(dataset, params.purpose)
        ) {
          continue;
        }
        datasetsById.set(dataset.training_dataset_id, dataset);
        options.push(toOption(dataset));
      }
      datasetOptions.value = options;

      const prefillId = params.prefillId?.value || undefined;
      if (prefillId && !datasetsById.has(prefillId)) {
        message.warning(
          $t('page.research.datasets.selector.prefillIneligible', {
            id: prefillId,
          }),
        );
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    datasetFor: (id: string) => datasetsById.get(id),
    datasetOptions,
    loading,
    reload,
  };
}
