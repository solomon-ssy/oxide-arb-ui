import type { EnumName } from '@vben/types';

import type { EnumPresentation } from '#/shared/presentation/enum-presentation';

import { ENUM_CATALOG } from '@vben/types';

import { $t } from '#/locales';
import { reportEnumDrift } from '#/shared/presentation/enum-drift';
import { enumPresentation } from '#/shared/presentation/enum-presentation';

export interface EnumOption {
  color: string;
  enumName?: EnumName;
  label: string;
  swatch: string;
  value: string;
}

const TONE_COLOR: Record<EnumPresentation['tone'], string> = {
  category: 'geekblue',
  danger: 'error',
  neutral: 'default',
  paused: 'blue',
  queued: 'blue',
  running: 'cyan',
  success: 'success',
  warning: 'warning',
};

const TONE_SWATCH: Record<EnumPresentation['tone'], string> = {
  category: 'hsl(var(--qp-chart-cat-1))',
  danger: 'hsl(var(--qp-status-danger))',
  neutral: 'hsl(var(--qp-status-neutral))',
  paused: 'hsl(var(--qp-status-paused))',
  queued: 'hsl(var(--qp-status-queued))',
  running: 'hsl(var(--qp-status-running))',
  success: 'hsl(var(--qp-status-success))',
  warning: 'hsl(var(--qp-status-warning))',
};

const CATEGORY_COLORS = [
  'geekblue',
  'purple',
  'cyan',
  'magenta',
  'blue',
  'gold',
  'lime',
  'volcano',
  'green',
  'orange',
  'processing',
  'default',
] as const;

const CATEGORY_SWATCHES = [
  'hsl(var(--qp-chart-cat-1))',
  'hsl(var(--qp-chart-cat-2))',
  'hsl(var(--qp-chart-cat-3))',
  'hsl(var(--qp-chart-cat-4))',
  'hsl(var(--qp-chart-cat-5))',
  'hsl(var(--qp-chart-cat-6))',
  'hsl(var(--qp-chart-cat-7))',
  'hsl(var(--qp-chart-cat-8))',
  'hsl(var(--qp-chart-cat-9))',
  'hsl(var(--qp-chart-cat-10))',
  'hsl(var(--qp-chart-cat-11))',
  'hsl(var(--qp-chart-cat-12))',
] as const;

function enumNamespace(name: EnumName): string {
  return `${name[0]?.toLowerCase()}${name.slice(1)}`;
}

function presentationColor(presentation: EnumPresentation): string {
  if (presentation.tone !== 'category') return TONE_COLOR[presentation.tone];
  return CATEGORY_COLORS[(presentation.categoryHue ?? 1) - 1] ?? 'geekblue';
}

function presentationSwatch(presentation: EnumPresentation): string {
  if (presentation.tone === 'category') {
    return (
      CATEGORY_SWATCHES[(presentation.categoryHue ?? 1) - 1] ??
      CATEGORY_SWATCHES[0]
    );
  }
  return TONE_SWATCH[presentation.tone];
}

function optionsFor<Name extends EnumName>(name: Name): EnumOption[] {
  return ENUM_CATALOG[name].map((value) => ({
    color: presentationColor(enumPresentation(name, value)),
    enumName: name,
    label: $t(`enum.${enumNamespace(name)}.${value}`),
    swatch: presentationSwatch(enumPresentation(name, value)),
    value,
  }));
}

/** Canonical option adapter for Select, filters, and non-component chart data. */
export function enumOptions<Name extends EnumName>(name: Name): EnumOption[];
export function enumOptions(...names: EnumName[]): EnumOption[];
export function enumOptions(...names: EnumName[]): EnumOption[] {
  const options = names.flatMap((name) => optionsFor(name));
  return options.filter(
    (option, index) =>
      options.findIndex((candidate) => candidate.value === option.value) ===
      index,
  );
}

/** Resolve one option while making unknown wire values observable. */
export function enumOption(
  options: readonly EnumOption[],
  value: null | string | undefined,
): EnumOption | undefined {
  if (!value) return undefined;
  const known = options.find((option) => option.value === value);
  if (known) return known;
  const enumName = options[0]?.enumName;
  if (enumName) {
    reportEnumDrift({ context: 'enum-option', enumName, value });
  }
  return {
    color: 'error',
    enumName,
    label: $t('enum.unknownValue', { value }),
    swatch: 'hsl(var(--qp-status-danger))',
    value,
  };
}

/** Presentation for server-declared open taxonomies that are not Rust enums. */
export function categoryOptions(
  values: readonly string[],
  namespace?: string,
): EnumOption[] {
  return values.map((value, index) => ({
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? 'default',
    label: namespace ? $t(`enum.${namespace}.${value}`) : value,
    swatch:
      CATEGORY_SWATCHES[index % CATEGORY_SWATCHES.length] ??
      CATEGORY_SWATCHES[0],
    value,
  }));
}
