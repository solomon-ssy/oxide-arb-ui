import type { FieldWidget, RuntimeConfigSchemaFieldView } from '@vben/types';

/** Infer widget from schema leaf metadata when the server omits an explicit hint. */
export function inferWidget(field: RuntimeConfigSchemaFieldView): FieldWidget {
  if (field.sensitive) {
    return 'secret_string';
  }
  switch (field.value_type) {
    case 'array':
    case 'object': {
      return 'json_tree';
    }
    case 'boolean': {
      return 'boolean';
    }
    case 'enum': {
      return 'enum_select';
    }
    case 'enum_array': {
      return 'enum_set';
    }
    case 'enum_decimal_map': {
      return 'enum_decimal_map';
    }
    case 'number': {
      if (field.format === 'duration_ms') {
        return 'duration_ms';
      }
      return 'integer';
    }
    case 'string': {
      if (field.format === 'decimal') {
        return 'decimal_string';
      }
      if (field.format === 'duration_ms') {
        return 'duration_ms';
      }
      if (field.format === 'integer') {
        return 'integer';
      }
      return 'plain_string';
    }
    case 'string_array': {
      return 'string_list';
    }
    default: {
      return 'plain_string';
    }
  }
}

/** Resolve the widget used to render one schema leaf. */
export function resolveWidget(
  field: RuntimeConfigSchemaFieldView,
): FieldWidget {
  return field.widget ?? inferWidget(field);
}
