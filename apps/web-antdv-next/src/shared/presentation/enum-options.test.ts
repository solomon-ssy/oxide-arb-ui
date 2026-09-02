import { ENUM_CATALOG } from '@vben/types';

import { describe, expect, it, vi } from 'vitest';

import { enumOptions } from './enum-options';
import {
  CATEGORY_ENUM_PRESENTATION,
  ENUM_PRESENTATION,
  SEMANTIC_ENUM_PRESENTATION,
} from './enum-presentation';

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

  it('classifies every generated member exactly once', () => {
    const generatedKeys = Object.entries(ENUM_CATALOG).flatMap(
      ([name, values]) => values.map((value) => `${name}.${value}`),
    );
    const semanticKeys = new Set(Object.keys(SEMANTIC_ENUM_PRESENTATION));
    const categoryKeys = new Set(Object.keys(CATEGORY_ENUM_PRESENTATION));

    expect(Object.keys(ENUM_PRESENTATION).toSorted()).toEqual(
      generatedKeys.toSorted(),
    );
    expect([...semanticKeys].filter((key) => categoryKeys.has(key))).toEqual(
      [],
    );
  });

  it('never renders failures, errors, denials, or validation failures as positive', () => {
    const negativeFamilies = [
      'PolicyValidationCode.',
      'ResolutionProjectionErrorCode.',
      'SettlementFailureCode.',
    ];
    const entries = Object.entries(ENUM_PRESENTATION).filter(([key]) =>
      negativeFamilies.some((prefix) => key.startsWith(prefix)),
    );

    expect(entries.length).toBeGreaterThan(0);
    expect(
      entries.every(([, presentation]) => presentation.tone === 'danger'),
    ).toBe(true);
    expect(
      ENUM_PRESENTATION['CapabilityReason.control_plane_not_ready'].tone,
    ).toBe('danger');
    expect(ENUM_PRESENTATION['CatalogFilterReason.inactive'].tone).toBe(
      'neutral',
    );
    expect(ENUM_PRESENTATION['CatalogFilterReason.closed'].tone).toBe(
      'neutral',
    );
  });
});
