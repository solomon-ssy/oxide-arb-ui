import type { EnumMemberKey, EnumName, EnumValue } from '@vben/types';

import { ENUM_CATALOG } from '@vben/types';

export type EnumTone =
  | 'category'
  | 'danger'
  | 'neutral'
  | 'paused'
  | 'queued'
  | 'running'
  | 'success'
  | 'warning';

export interface EnumPresentation {
  readonly categoryHue?: number;
  readonly emphasis?: 'solid' | 'subtle';
  readonly icon?: string;
  readonly tone: EnumTone;
}

type SemanticEnumTone = Exclude<EnumTone, 'category'>;

const SEMANTIC_TONE_PRESETS = {
  danger: {
    emphasis: 'solid',
    icon: 'lucide:circle-x',
    tone: 'danger',
  },
  neutral: { icon: 'lucide:circle-minus', tone: 'neutral' },
  paused: { icon: 'lucide:circle-pause', tone: 'paused' },
  queued: { icon: 'lucide:clock-3', tone: 'queued' },
  running: { icon: 'lucide:loader-circle', tone: 'running' },
  success: { icon: 'lucide:circle-check', tone: 'success' },
  warning: {
    emphasis: 'solid',
    icon: 'lucide:triangle-alert',
    tone: 'warning',
  },
} as const satisfies Record<SemanticEnumTone, EnumPresentation>;

const EXPLICIT_TONES = {
  'AdmissionOutcome.allow': 'success',
  'AdmissionOutcome.deny': 'danger',
  'AdmissionOutcome.defer': 'warning',
  'CatalogFilterReason.closed': 'neutral',
  'CatalogFilterReason.inactive': 'neutral',
  'CapabilityReason.control_plane_not_ready': 'danger',
  'ExecutionAuthorityCeiling.analysis_only': 'neutral',
  'ExecutionAuthorityCeiling.operator_approval': 'warning',
  'ExecutionAuthorityCeiling.policy_automatic': 'success',
  'FreshBootEventKind.evidence_wait_scheduled': 'paused',
} as const satisfies Partial<Record<EnumMemberKey, SemanticEnumTone>>;

const EXPLICIT_TONE_LOOKUP: Partial<Record<EnumMemberKey, SemanticEnumTone>> =
  EXPLICIT_TONES;

const DANGER_TOKENS = [
  'blocked',
  'breached',
  'conflict',
  'deny',
  'denied',
  'error',
  'failed',
  'failure',
  'halted',
  'illegal',
  'invalid',
  'missing',
  'rejected',
  'revoked',
  'unavailable',
  'unhealthy',
  'unresolvable',
] as const;
const WARNING_TOKENS = [
  'ambiguous',
  'defer',
  'deferred',
  'degraded',
  'incomplete',
  'insufficient',
  'indeterminate',
  'manual_required',
  'stale',
  'substituted',
  'unknown',
] as const;
const SUCCESS_TOKENS = [
  'active',
  'allow',
  'approved',
  'authorized',
  'committed',
  'completed',
  'confirmed',
  'credited',
  'enabled',
  'filled',
  'healthy',
  'observed',
  'published',
  'qualified',
  'ready',
  'resolved',
  'scored',
  'succeeded',
  'validated',
] as const;
const RUNNING_TOKENS = [
  'claimed',
  'delivering',
  'executing',
  'monitoring',
  'open',
  'partially',
  'reconciling',
  'retrying',
  'running',
  'submitted',
  'started',
] as const;
const QUEUED_TOKENS = [
  'draft',
  'pending',
  'planned',
  'prepared',
  'queued',
  'scheduled',
  'waiting',
] as const;
const NEUTRAL_TOKENS = [
  'cancelled',
  'closed',
  'disabled',
  'expired',
  'inactive',
  'not_applicable',
  'not_required',
  'retired',
  'superseded',
] as const;

function includesToken(value: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => value.includes(token));
}

function inferredTone(
  key: EnumMemberKey,
  value: string,
): null | SemanticEnumTone {
  const explicit = EXPLICIT_TONE_LOOKUP[key];
  if (explicit) return explicit;
  if (
    key.startsWith('PolicyValidationCode.') ||
    key.startsWith('ResolutionProjectionErrorCode.') ||
    key.startsWith('SettlementFailureCode.') ||
    includesToken(value, DANGER_TOKENS)
  ) {
    return 'danger';
  }
  if (includesToken(value, WARNING_TOKENS)) return 'warning';
  if (includesToken(value, SUCCESS_TOKENS)) return 'success';
  if (includesToken(value, RUNNING_TOKENS)) return 'running';
  if (includesToken(value, QUEUED_TOKENS)) return 'queued';
  if (includesToken(value, NEUTRAL_TOKENS)) return 'neutral';
  if (value.includes('paused')) return 'paused';
  return null;
}

const semanticEntries: [EnumMemberKey, EnumPresentation][] = [];
const categoryEntries: [EnumMemberKey, EnumPresentation][] = [];

Object.entries(ENUM_CATALOG).forEach(([name, values], enumIndex) => {
  values.forEach((value, valueIndex) => {
    const key = `${name}.${value}` as EnumMemberKey;
    const tone = inferredTone(key, value);
    if (tone) {
      semanticEntries.push([key, SEMANTIC_TONE_PRESETS[tone]]);
      return;
    }
    categoryEntries.push([
      key,
      { categoryHue: (enumIndex * 7 + valueIndex * 5) % 12, tone: 'category' },
    ]);
  });
});

export const SEMANTIC_ENUM_PRESENTATION = Object.fromEntries(
  semanticEntries,
) as Partial<Record<EnumMemberKey, EnumPresentation>>;

export const CATEGORY_ENUM_PRESENTATION = Object.fromEntries(
  categoryEntries,
) as Partial<Record<EnumMemberKey, EnumPresentation>>;

export const ENUM_PRESENTATION = {
  ...CATEGORY_ENUM_PRESENTATION,
  ...SEMANTIC_ENUM_PRESENTATION,
} as Record<EnumMemberKey, EnumPresentation>;

export function enumMemberKey<Name extends EnumName>(
  name: Name,
  value: EnumValue<Name>,
): EnumMemberKey {
  return `${name}.${value}` as EnumMemberKey;
}

export function enumPresentation<Name extends EnumName>(
  name: Name,
  value: EnumValue<Name>,
): EnumPresentation {
  return ENUM_PRESENTATION[enumMemberKey(name, value)];
}
