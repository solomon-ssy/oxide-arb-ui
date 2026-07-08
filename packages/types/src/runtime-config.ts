import type { IsoDateTime, UuidString } from './common';
import type {
  MarketCategory,
  RuntimeConfigActivationKind,
  RuntimeConfigVersionSource,
} from './enums';

/** JSON scalar/object category exposed by `GET /runtime-config/schema`. */
export type JsonValueType =
  | 'array'
  | 'boolean'
  | 'decimal_map'
  | 'enum'
  | 'enum_array'
  | 'enum_decimal_map'
  | 'number'
  | 'object'
  | 'string'
  | 'string_array';

/** Wire format hint for schema leaves (decimal money stays `string`). */
export type SchemaFieldFormat = 'decimal' | 'duration_ms' | 'integer';

/** Homogeneous JSON-array element type for compact table editors. */
export type ArrayItemType = 'integer' | 'string' | 'unknown';

/** Server-side widget hint for the preferences form renderer. */
export type FieldWidget =
  | 'boolean'
  | 'decimal_map'
  | 'decimal_string'
  | 'duration_ms'
  | 'enum_decimal_map'
  | 'enum_select'
  | 'enum_set'
  | 'integer'
  | 'json_tree'
  | 'model_version_select'
  | 'plain_string'
  | 'ratio_slider'
  | 'schedule_list'
  | 'secret_string'
  | 'string_list'
  | 'weight_map';

/** Which model-runtime slot a `model_version_select` field fills. */
export type ModelPickerSide = 'buy' | 'sell';

/** Category/side filtering for a `model_version_select` field. */
export interface ModelPickerProps {
  /** Restrict candidates to this category's scope (or an unscoped/generic
   * artifact); absent = no category filter (the generic pointer fields). */
  category?: MarketCategory;
  side: ModelPickerSide;
}

/** Field behavior/governance hint (distinct from the render `widget`). */
export type FieldSemantics =
  | 'credential'
  | 'empty_means_all'
  | 'governance_critical';

/** Comparison operator for cross-field UI rules. */
export type WhenOperator = 'eq' | 'ne';

/** Effect applied when a `when` rule matches. */
export type WhenEffect = 'if' | 'require';

/** Presentation hints for a field (unit suffix, grid width, read-only). */
export interface UiProps {
  col_span?: number;
  placeholder?: UiText;
  prefix?: string;
  read_only?: boolean;
  slider_max?: number;
  slider_min?: number;
  slider_step?: number;
  suffix?: string;
}

/** Localized text embedded in the schema envelope, keyed by SPA locale id. */
export interface UiText {
  locales: Record<string, string>;
}

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

/** One schema leaf (dictionary entry) for the runtime-config form renderer. */
export interface RuntimeConfigSchemaFieldView {
  array_item_type?: ArrayItemType;
  constraints?: SchemaFieldConstraints;
  default: unknown;
  description: string;
  enum_items?: EnumItemView[];
  format?: SchemaFieldFormat;
  help: UiText;
  label: UiText;
  model_picker?: ModelPickerProps;
  path: string;
  semantics?: FieldSemantics;
  sensitive: boolean;
  ui_props?: UiProps;
  value_type: JsonValueType;
  when?: FieldWhenView[];
  widget?: FieldWidget;
}

/** A (possibly nested) group of layout nodes rendered as a collapsible card. */
export interface SchemaSection {
  children: SchemaNode[];
  collapsible: boolean;
  description?: UiText;
  /** Iconify icon id (same convention as RBAC menu icons, e.g. `lucide:wallet`). */
  icon?: string;
  id: string;
  kind: 'section';
  label: UiText;
  order: number;
}

/** A reference to one field in the field dictionary, keyed by dotted path. */
export interface SchemaFieldRef {
  kind: 'field';
  order: number;
  path: string;
}

/** One case of a discriminated union node. */
export interface SchemaUnionCase {
  case_value: unknown;
  children: SchemaNode[];
}

/** A discriminated group: only the case matching the live discriminator renders. */
export interface SchemaUnion {
  cases: SchemaUnionCase[];
  discriminator: string;
  kind: 'union';
  label?: UiText;
  order: number;
}

/** One node of the runtime-config layout tree. */
export type SchemaNode = SchemaFieldRef | SchemaSection | SchemaUnion;

/** Envelope returned by `GET /runtime-config/schema`. */
export interface RuntimeConfigSchemaView {
  fields: RuntimeConfigSchemaFieldView[];
  tree: SchemaNode[];
}

/** Report-schedule cadence (tagged union on `kind`). */
export type ScheduleCadence =
  | { expr: string; kind: 'cron'; timezone?: null | string }
  | { interval_secs: number; kind: 'interval' };

/** One report schedule row edited by the `schedule_list` widget. */
export interface ReportScheduleConfig {
  cadence: ScheduleCadence;
  enabled: boolean;
  schedule_id: string;
  source_delay_secs: number;
  top_n: number;
}

/** Body for `POST /runtime-config/schedule-preview`. */
export interface SchedulePreviewRequest {
  cadence: ScheduleCadence;
  count?: number;
}

/** Response of `POST /runtime-config/schedule-preview`. */
export interface SchedulePreviewView {
  next_fire_times: IsoDateTime[];
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
export type RuntimeConfigDocument = Record<string, unknown>;

/** Sparse patch body for preferences Apply (`POST /runtime-config/versions`). */
export type RuntimeConfigPatch = Record<string, unknown>;
