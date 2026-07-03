import type {
  RuntimeConfigDocument,
  RuntimeConfigPatch,
  RuntimeConfigSchemaFieldView,
  RuntimeConfigSchemaView,
  SchemaSection,
} from '@vben/types';

export type RuntimeConfigFieldIndex = Map<string, RuntimeConfigSchemaFieldView>;

export interface RuntimeConfigFieldDiff {
  field: RuntimeConfigSchemaFieldView;
  next: unknown;
  path: string;
  previous: unknown;
}

export interface RuntimeConfigApplyPayload {
  diffs: RuntimeConfigFieldDiff[];
  patch: RuntimeConfigPatch;
  section: SchemaSection;
}

/** Live header chrome synced from a section draft card. */
export interface ConfigSectionMeta {
  dirty: boolean;
  error: string;
  requireDiffAck: boolean;
  diffAcknowledged: boolean;
}

export type { RuntimeConfigDocument, RuntimeConfigSchemaView };
