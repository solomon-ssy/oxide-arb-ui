import type { EnumName } from '@vben/types';

export interface ObjectInspectorEnumValue {
  context?: string;
  label?: string;
  name: EnumName;
  value: null | string | undefined;
}

export interface ObjectInspectorField {
  copyable?: boolean;
  enum?: ObjectInspectorEnumValue;
  label: string;
  mono?: boolean;
  routeTo?: string;
  span?: 1 | 2;
  value?: null | number | string;
}

export interface ObjectInspectorSectionModel {
  fields: readonly ObjectInspectorField[];
  key: string;
  title: string;
}

export type ObjectInspectorStatus = ObjectInspectorEnumValue;

export interface ObjectInspectorAction {
  danger?: boolean;
  disabled?: boolean;
  icon?: string;
  key: string;
  label: string;
  loading?: boolean;
  primary?: boolean;
}

export interface ObjectInspectorTimelineItem {
  description?: string;
  key: string;
  occurredAt?: null | string;
  status?: ObjectInspectorEnumValue;
  title: string;
}
