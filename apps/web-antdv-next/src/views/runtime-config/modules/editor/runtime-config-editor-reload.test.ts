import type { ConfigSectionMeta } from './types';

import { describe, expect, it } from 'vitest';

import {
  anyFormSectionDirty,
  editorHasUnsavedDraft,
  isAdvancedJsonDirty,
} from './runtime-config-editor-reload';

function meta(partial: Partial<ConfigSectionMeta>): ConfigSectionMeta {
  return {
    diffAcknowledged: false,
    dirty: false,
    error: '',
    requireDiffAck: false,
    ...partial,
  };
}

describe('runtime-config-editor-reload', () => {
  it('detects dirty form sections from meta', () => {
    expect(anyFormSectionDirty({})).toBe(false);
    expect(anyFormSectionDirty({ reports: meta({ dirty: false }) })).toBe(
      false,
    );
    expect(anyFormSectionDirty({ reports: meta({ dirty: true }) })).toBe(true);
  });

  it('detects advanced JSON drift', () => {
    const baseline = { reports: { max_top_n: 20 } };
    expect(isAdvancedJsonDirty(baseline, baseline)).toBe(false);
    expect(
      isAdvancedJsonDirty(baseline, {
        reports: { max_top_n: 10 },
      }),
    ).toBe(true);
  });

  it('uses mode-specific dirty detection', () => {
    const baseline = { reports: { max_top_n: 20 } };
    expect(
      editorHasUnsavedDraft({
        advancedDoc: baseline,
        baselineConfig: baseline,
        mode: 'json',
        sectionMeta: {},
      }),
    ).toBe(false);
    expect(
      editorHasUnsavedDraft({
        advancedDoc: { reports: { max_top_n: 5 } },
        baselineConfig: baseline,
        mode: 'json',
        sectionMeta: {},
      }),
    ).toBe(true);
    expect(
      editorHasUnsavedDraft({
        advancedDoc: baseline,
        baselineConfig: baseline,
        mode: 'form',
        sectionMeta: { execution: meta({ dirty: true }) },
      }),
    ).toBe(true);
  });
});
