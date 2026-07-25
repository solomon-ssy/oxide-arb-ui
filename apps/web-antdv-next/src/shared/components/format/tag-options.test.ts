import { DATASET_PURPOSES } from '@vben/types';

import { describe, expect, it, vi } from 'vitest';

import { useDatasetPurposeTagOptions } from './tag-options';

vi.mock('#/locales', () => ({
  $t: (key: string) =>
    key === 'enum.datasetPurpose.evaluation' ? '评估' : key,
}));

describe('dataset purpose tag options', () => {
  it('covers every closed purpose with its localized label', () => {
    const options = useDatasetPurposeTagOptions();

    expect(options.map(({ value }) => value)).toEqual(
      Object.values(DATASET_PURPOSES),
    );
    expect(options).toContainEqual({
      color: 'blue',
      label: '评估',
      value: DATASET_PURPOSES.evaluation,
    });
  });
});
