import type { DatasetPurpose, TrainingDatasetView } from '@vben/types';

import { TRAINING_DATASET_STATUSES } from '@vben/types';

import { hasUsableDatasetManifest } from './dataset-manifest';

/** Defense-in-depth predicate for a purpose-scoped dataset selector. */
export function isDatasetSelectable(
  dataset: TrainingDatasetView,
  purpose: DatasetPurpose,
): boolean {
  return (
    dataset.status === TRAINING_DATASET_STATUSES.ready &&
    dataset.purpose === purpose &&
    hasUsableDatasetManifest(dataset)
  );
}
