import type { RuntimeConfigDocument } from '@vben/types';

import { cloneDocument } from './schema-mapper';

export interface RuntimeConfigEditorReloadOptions {
  /** Skip the unsaved-draft confirm (e.g. after a successful apply). */
  force?: boolean;
}

export function anyFormSectionDirty(
  sectionMeta: Record<string, undefined | { dirty?: boolean }>,
): boolean {
  return Object.values(sectionMeta).some((meta) => meta?.dirty);
}

export function isAdvancedJsonDirty(
  baseline: RuntimeConfigDocument,
  draft: RuntimeConfigDocument,
): boolean {
  return (
    JSON.stringify(cloneDocument(baseline)) !==
    JSON.stringify(cloneDocument(draft))
  );
}

export function editorHasUnsavedDraft(input: {
  advancedDoc: RuntimeConfigDocument;
  baselineConfig: RuntimeConfigDocument;
  mode: 'form' | 'json';
  sectionMeta: Record<string, undefined | { dirty?: boolean }>;
}): boolean {
  if (input.mode === 'json') {
    return isAdvancedJsonDirty(input.baselineConfig, input.advancedDoc);
  }
  return anyFormSectionDirty(input.sectionMeta);
}
