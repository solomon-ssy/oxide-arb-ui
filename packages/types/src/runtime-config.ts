import type { IsoDateTime, UuidString } from './common';
import type {
  RuntimeConfigActivationKind,
  RuntimeConfigVersionSource,
} from './enums';

/** JSON scalar/object category exposed by `GET /runtime-config/schema`. */
export type JsonValueType =
  | 'array'
  | 'boolean'
  | 'enum'
  | 'enum_array'
  | 'enum_decimal_map'
  | 'number'
  | 'object'
  | 'string'
  | 'string_array';

/** Wire format hint for schema leaves (decimal money stays `string`). */
export type SchemaFieldFormat = 'decimal' | 'duration_ms' | 'integer';

/** Server-side widget hint for the preferences form renderer. */
export type FieldWidget =
  | 'boolean'
  | 'decimal_string'
  | 'duration_ms'
  | 'enum_decimal_map'
  | 'enum_select'
  | 'enum_set'
  | 'integer'
  | 'json_tree'
  | 'plain_string'
  | 'secret_string'
  | 'string_list';

/** Domain semantics beyond raw JSON Schema type information. */
export type FieldSemantics = 'empty_means_all';

/** Comparison operator for cross-field UI rules. */
export type WhenOperator =
  | 'between'
  | 'contains'
  | 'eq'
  | 'gt'
  | 'gte'
  | 'in'
  | 'lt'
  | 'lte'
  | 'ne'
  | 'neq'
  | 'not_between'
  | 'not_in'
  | 'not_null'
  | 'prefix'
  | 'regex'
  | 'suffix';

/** Effect applied when a `when` rule matches. */
export type WhenEffect =
  | 'disable'
  | 'enable'
  | 'if'
  | 'if_not'
  | 'invisible'
  | 'optional'
  | 'require'
  | 'visible';

/** Localized or plain text embedded in the schema envelope. */
export type UiText =
  | { kind: 'localized'; locales: Record<string, string> }
  | { kind: 'simple'; value: string };

/** One selectable enum wire value with localized label. */
export interface EnumItemView {
  key: unknown;
  label: UiText;
}

/** One conditional rule referencing another schema leaf. */
export interface FieldWhenView {
  effect: WhenEffect;
  operator: WhenOperator;
  target_path: string;
  value: unknown;
}

/** Server-extracted JSON Schema constraints for client-side validation. */
export interface SchemaFieldConstraints {
  enum_values?: unknown[];
  exclusive_maximum?: number;
  exclusive_minimum?: number;
  max_length?: number;
  maximum?: number;
  min_length?: number;
  minimum?: number;
  pattern?: string;
}

/** One schema leaf for the runtime-config form renderer. */
export interface RuntimeConfigSchemaFieldView {
  constraints?: SchemaFieldConstraints;
  default: unknown;
  description: string;
  enum_items?: EnumItemView[];
  format?: SchemaFieldFormat;
  group: string;
  help: UiText;
  label: UiText;
  money_critical: boolean;
  order: number;
  path: string;
  semantics?: FieldSemantics;
  sensitive: boolean;
  value_type: JsonValueType;
  when?: FieldWhenView[];
  widget?: FieldWidget;
}

/** One preferences group in `GET /runtime-config/schema`. */
export interface RuntimeConfigSchemaGroupView {
  description?: UiText;
  id: string;
  label: UiText;
  order: number;
}

/** Envelope returned by `GET /runtime-config/schema`. */
export interface RuntimeConfigSchemaView {
  fields: RuntimeConfigSchemaFieldView[];
  groups: RuntimeConfigSchemaGroupView[];
}

/** Masked immutable runtime-config version row. */
export interface RuntimeConfigVersionView {
  config_hash: string;
  config_json: RuntimeConfigDocument;
  created_at: IsoDateTime;
  created_by: string;
  reason: string;
  runtime_config_version_id: UuidString;
  schema_version: number;
  source: RuntimeConfigVersionSource;
}

/** Live runtime-config snapshot plus active version and activation metadata. */
export interface RuntimeConfigCurrentView {
  activation: null | RuntimeConfigActivationInfo;
  config: RuntimeConfigDocument;
  version: null | RuntimeConfigVersionView;
}

/** Activation/rollback lineage record returned by governed transitions. */
export interface RuntimeConfigActivationInfo {
  activated_at: IsoDateTime;
  activated_by: string;
  activation_kind: RuntimeConfigActivationKind;
  audit_event_id: null | UuidString;
  created_at: IsoDateTime;
  previous_runtime_config_version_id: null | UuidString;
  reason: string;
  rollback_target_version_id: null | UuidString;
  runtime_config_activation_id: UuidString;
  runtime_config_version_id: UuidString;
}

/** Runtime config document is schema-driven; field-level typing lives server-side. */
export type RuntimeConfigDocument = Record<string, unknown> & {
  risk?: {
    max_daily_loss_usd?: string;
  };
};

/** Sparse patch body for preferences Apply (`POST /runtime-config/versions`). */
export type RuntimeConfigPatch = Record<string, unknown>;
