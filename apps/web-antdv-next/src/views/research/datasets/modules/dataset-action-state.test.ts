import { DATASET_PURPOSES, TRAINING_DATASET_STATUSES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { canTrainDataset } from './dataset-action-state';
import { datasetFixture } from './dataset-test-fixture';

describe('canTrainDataset', () => {
  it('offers Train only for an authorized Ready Training dataset with v2 evidence', () => {
    const readyDataset = datasetFixture();
    for (const status of Object.values(TRAINING_DATASET_STATUSES)) {
      expect(canTrainDataset(true, { ...readyDataset, status })).toBe(
        status === TRAINING_DATASET_STATUSES.ready,
      );
    }
    expect(canTrainDataset(false, readyDataset)).toBe(false);
    expect(
      canTrainDataset(true, datasetFixture(DATASET_PURPOSES.calibration)),
    ).toBe(false);
    expect(
      canTrainDataset(true, datasetFixture(DATASET_PURPOSES.evaluation)),
    ).toBe(false);
  });

  it('fails closed for missing evidence and any manifest-ledger mismatch', () => {
    const readyDataset = datasetFixture();
    const manifest = readyDataset.manifest;
    if (!manifest) {
      throw new Error('test fixture requires a v2 manifest');
    }
    expect(canTrainDataset(true, { ...readyDataset, manifest: null })).toBe(
      false,
    );
    expect(
      canTrainDataset(true, {
        ...readyDataset,
        manifest: {
          ...manifest,
          semantic_dataset_hash: `blake3:${'9'.repeat(64)}`,
        },
      }),
    ).toBe(false);
  });
});
