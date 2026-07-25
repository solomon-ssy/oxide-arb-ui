import { DATASET_PURPOSES, TRAINING_DATASET_STATUSES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { datasetFixture } from '../datasets/modules/dataset-test-fixture';
import { isDatasetSelectable } from './dataset-selection';

describe('purpose-scoped dataset selection', () => {
  it('requires Ready status, exact purpose, and a verified v2 manifest', () => {
    const evaluation = datasetFixture(DATASET_PURPOSES.evaluation);
    expect(isDatasetSelectable(evaluation, DATASET_PURPOSES.evaluation)).toBe(
      true,
    );
    expect(isDatasetSelectable(evaluation, DATASET_PURPOSES.training)).toBe(
      false,
    );
    expect(
      isDatasetSelectable(
        { ...evaluation, status: TRAINING_DATASET_STATUSES.expired },
        DATASET_PURPOSES.evaluation,
      ),
    ).toBe(false);
    expect(
      isDatasetSelectable(
        { ...evaluation, manifest: null },
        DATASET_PURPOSES.evaluation,
      ),
    ).toBe(false);
  });

  it('rejects a server response whose normalized cohort diverges from manifest', () => {
    const evaluation = datasetFixture(DATASET_PURPOSES.evaluation);
    evaluation.cohort_manifest = null;
    expect(isDatasetSelectable(evaluation, DATASET_PURPOSES.evaluation)).toBe(
      false,
    );
  });
});
