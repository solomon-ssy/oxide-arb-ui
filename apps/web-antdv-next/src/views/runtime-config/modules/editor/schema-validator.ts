import type {
  RuntimeConfigDocument,
  RuntimeConfigSchemaFieldView,
} from '@vben/types';

import Decimal from 'decimal.js';
import { z } from 'zod';

import { isFieldRequired, isFieldVisible } from './field-when';
import {
  isDecimalMapField,
  isNullableField,
  isSparseDecimalMapField,
  schemaEnumValues,
} from './schema-mapper';

/** Build a Zod schema for one runtime-config leaf from server constraints. */
export function fieldZodSchema(
  field: RuntimeConfigSchemaFieldView,
): z.ZodTypeAny {
  const constraints = field.constraints;
  if (field.value_type === 'boolean') {
    return z.boolean();
  }
  if (field.value_type === 'enum') {
    const values = schemaEnumValues(field);
    return values.length > 0
      ? z.enum(values as [string, ...string[]])
      : z.string();
  }
  if (field.value_type === 'enum_array') {
    const values = schemaEnumValues(field);
    return values.length > 0
      ? z.array(z.enum(values as [string, ...string[]]))
      : z.array(z.string());
  }
  if (field.value_type === 'string_array') {
    let item = z.string().trim().min(1);
    if (constraints?.pattern) {
      item = item.regex(new RegExp(constraints.pattern));
    }
    return z.array(item);
  }
  if (isDecimalMapField(field)) {
    const keys = schemaEnumValues(field);
    const sparse = isSparseDecimalMapField(field);
    if (keys.length === 0) {
      return z.record(z.string(), z.string());
    }
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const key of keys) {
      const message = `${field.path}.${String(key)} must be a decimal string`;
      shape[String(key)] = sparse
        ? z.string().refine(
            (value) => {
              const trimmed = value.trim();
              if (!trimmed) {
                return true;
              }
              try {
                return new Decimal(trimmed).isFinite();
              } catch {
                return false;
              }
            },
            { message },
          )
        : z
            .string()
            .trim()
            .min(1)
            .refine(
              (value) => {
                try {
                  return new Decimal(value).isFinite();
                } catch {
                  return false;
                }
              },
              { message },
            );
    }
    const objectSchema = z.object(shape);
    return sparse ? objectSchema.partial() : objectSchema;
  }
  if (field.value_type === 'array') {
    return z.array(z.unknown());
  }
  if (field.value_type === 'object') {
    return z.record(z.string(), z.unknown());
  }
  if (field.format === 'decimal' || field.value_type === 'string') {
    let base = z.string();
    if (field.widget === 'ratio_slider') {
      const min = field.ui_props?.slider_min ?? 0;
      const max = field.ui_props?.slider_max ?? 1;
      base = base.trim().min(1);
      return base.refine(
        (value) => {
          try {
            const parsed = new Decimal(value);
            return parsed.isFinite() && parsed.gte(min) && parsed.lte(max);
          } catch {
            return false;
          }
        },
        {
          message: `${field.path} must be a decimal in [${min}, ${max}]`,
        },
      );
    }
    if (
      constraints?.min_length !== null &&
      constraints?.min_length !== undefined
    ) {
      base = base.min(constraints.min_length);
    }
    if (
      constraints?.max_length !== null &&
      constraints?.max_length !== undefined
    ) {
      base = base.max(constraints.max_length);
    }
    if (constraints?.pattern) {
      base = base.regex(new RegExp(constraints.pattern));
    }
    if (field.format === 'decimal') {
      return base.refine(
        (value) => {
          if (!value) {
            return !field.sensitive;
          }
          try {
            const _parsed = new Decimal(value);
            return _parsed.isFinite();
          } catch {
            return false;
          }
        },
        { message: `${field.path} must be a decimal string` },
      );
    }
    return isNullableField(field) ? z.union([base, z.null()]) : base;
  }
  if (field.value_type === 'number' || field.format === 'integer') {
    let schema = z.number();
    if (constraints?.minimum !== null && constraints?.minimum !== undefined) {
      schema = schema.min(constraints.minimum);
    }
    if (constraints?.maximum !== null && constraints?.maximum !== undefined) {
      schema = schema.max(constraints.maximum);
    }
    return schema;
  }
  return z.unknown();
}

/** Validate a group draft before submit; returns the first field error message. */
export function validateGroupDraft(
  fields: RuntimeConfigSchemaFieldView[],
  draft: Record<string, unknown>,
  config: RuntimeConfigDocument,
  parse: (field: RuntimeConfigSchemaFieldView, value: unknown) => unknown,
) {
  for (const field of fields) {
    if (!isFieldVisible(field, draft, config)) {
      continue;
    }
    const raw = draft[field.path];
    if (field.sensitive && (raw === '' || raw === null || raw === undefined)) {
      continue;
    }
    if (
      isFieldRequired(field, draft, config) &&
      (raw === '' || raw === null || raw === undefined)
    ) {
      return `${field.path} is required`;
    }
    const wire = parse(field, raw);
    const scheduleError = validateScheduleListField(field, wire);
    if (scheduleError) {
      return scheduleError;
    }
    const result = fieldZodSchema(field).safeParse(wire);
    if (!result.success) {
      return result.error.issues[0]?.message ?? `${field.path} is invalid`;
    }
  }
  return '';
}

function validateScheduleListField(
  field: RuntimeConfigSchemaFieldView,
  wire: unknown,
): string {
  if (field.widget !== 'schedule_list' || !Array.isArray(wire)) {
    return '';
  }
  const seen = new Set<string>();
  for (const row of wire) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return `${field.path} must be an array of schedule objects`;
    }
    const id = String(
      (row as Record<string, unknown>).schedule_id ?? '',
    ).trim();
    if (!id) {
      return `${field.path}: schedule_id must not be empty`;
    }
    if (seen.has(id)) {
      return `${field.path}: duplicate schedule_id \`${id}\``;
    }
    seen.add(id);
  }
  return '';
}
