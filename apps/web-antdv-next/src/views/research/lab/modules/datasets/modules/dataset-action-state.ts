import type { TrainingDatasetView } from '@vben/types';

import { DATASET_PURPOSES, isTrainableDatasetStatus } from '@vben/types';

import { hasUsableDatasetManifest } from '#/views/research/components/dataset-manifest';

/** UI affordance for training; the server remains authoritative at submission. */
export function canTrainDataset(
  hasPermission: boolean,
  dataset: TrainingDatasetView,
): boolean {
  return (
    hasPermission &&
    isTrainableDatasetStatus(dataset.status) &&
    dataset.purpose === DATASET_PURPOSES.training &&
    hasUsableDatasetManifest(dataset)
  );
}
