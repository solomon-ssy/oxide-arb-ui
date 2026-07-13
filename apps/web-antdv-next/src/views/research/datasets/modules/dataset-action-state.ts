import type { TrainingDatasetView } from '@vben/types';

import { isTrainableDatasetStatus } from '@vben/types';

import { hasUsableDatasetManifest } from './dataset-manifest';

/** UI affordance for training; the server remains authoritative at submission. */
export function canTrainDataset(
  hasPermission: boolean,
  dataset: TrainingDatasetView,
): boolean {
  return (
    hasPermission &&
    isTrainableDatasetStatus(dataset.status) &&
    hasUsableDatasetManifest(dataset)
  );
}
