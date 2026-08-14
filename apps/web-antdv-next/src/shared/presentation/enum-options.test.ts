import { ENUM_CATALOG } from '@vben/types';

import { describe, expect, it, vi } from 'vitest';

import { enumOptions } from './enum-options';

vi.mock('#/locales', () => ({
  $t: (key: string) =>
    key === 'enum.datasetPurpose.evaluation' ? '评估' : key,
}));

describe('enum option presentation', () => {
  it('covers every generated member with its localized label', () => {
    const options = enumOptions('DatasetPurpose');

    expect(options.map(({ value }) => value)).toEqual(
      ENUM_CATALOG.DatasetPurpose,
    );
    expect(options).toContainEqual(
      expect.objectContaining({
        color: expect.any(String),
        enumName: 'DatasetPurpose',
        label: '评估',
        value: 'evaluation',
      }),
    );
  });
});
