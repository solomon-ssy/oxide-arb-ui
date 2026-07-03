import type {
  FieldWhenView,
  RuntimeConfigSchemaFieldView,
  UiText,
} from '@vben/types';

/** Build a bilingual UiText payload keyed by SPA locale id. */
export function uiText(en: string, zh = en): UiText {
  return { locales: { 'en-US': en, 'zh-CN': zh } };
}

/** Build a minimal schema field view for editor unit tests. */
export function fieldStub(
  overrides: Partial<RuntimeConfigSchemaFieldView> = {},
): RuntimeConfigSchemaFieldView {
  return {
    default: null,
    description: '',
    help: uiText('help'),
    label: uiText('label'),
    path: 'selection.max_selection_size',
    sensitive: false,
    value_type: 'string',
    ...overrides,
  };
}

/** Build a `visible if target == value` rule. */
export function whenIf(target: string, value: unknown): FieldWhenView {
  return { effect: 'if', operator: 'eq', target_path: target, value };
}

/** Build a `required when target == value` rule. */
export function whenRequire(target: string, value: unknown): FieldWhenView {
  return { effect: 'require', operator: 'eq', target_path: target, value };
}
