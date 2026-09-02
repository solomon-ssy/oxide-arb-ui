import type { SettlementReadinessReason } from '@vben/types';

import { describe, expect, it, vi } from 'vitest';

import { formatSettlementReadinessReason } from './format-settlement-readiness';

const { translate } = vi.hoisted(() => ({
  translate: vi.fn(
    (key: string, params?: Record<string, null | number | string>) => {
      if (key.endsWith('.unknown')) {
        return `Unknown reason (${params?.code})`;
      }
      if (
        key.endsWith('.settlement_inspection_window_invalid') ||
        key.endsWith('.chain_observation_stale') ||
        key.endsWith('.chain_observation_future_skew_exceeded')
      ) {
        return `${key}:${JSON.stringify(params)}`;
      }
      return key;
    },
  ),
}));

vi.mock('#/locales', () => ({ $t: translate }));

const READINESS_REASONS: SettlementReadinessReason[] = [
  {
    code: 'settlement_inspection_window_invalid',
    inspection_completed_at: '2026-09-01T16:31:56Z',
    max_duration_seconds: 120,
    request_admitted_at: '2026-09-01T16:29:55Z',
  },
  {
    block_number: 91_580_106,
    block_timestamp: '2026-09-01T16:27:54Z',
    checked_at: '2026-09-01T16:30:55Z',
    code: 'chain_observation_stale',
    max_age_seconds: 120,
  },
  {
    block_number: 91_580_106,
    block_timestamp: '2026-09-01T16:31:26Z',
    checked_at: '2026-09-01T16:30:55Z',
    code: 'chain_observation_future_skew_exceeded',
    max_future_skew_seconds: 30,
  },
];

describe('settlement readiness formatting', () => {
  it.each(READINESS_REASONS)('forwards every $code field to i18n', (reason) => {
    const rendered = formatSettlementReadinessReason(reason);
    const { code, ...params } = reason;

    expect(rendered).toContain(code);
    expect(translate).toHaveBeenLastCalledWith(
      `page.quantSettlementRedeems.readiness.reasons.${code}`,
      params,
    );
  });

  it('keeps unknown codes fail-visible', () => {
    expect(
      formatSettlementReadinessReason({
        code: 'upstream_reason_without_ui_release',
        detail: 'must remain visible',
      }),
    ).toBe('Unknown reason (upstream_reason_without_ui_release)');
  });
});
