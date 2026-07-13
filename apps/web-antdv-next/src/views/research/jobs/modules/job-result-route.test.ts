import type { ResearchJobView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { jobResultRoute } from './schemas';

function job(overrides: Partial<ResearchJobView> = {}): ResearchJobView {
  return {
    acting_role: 'risk_owner',
    created_at: '2026-07-10T10:00:00.000Z',
    job_id: '01900000-0000-7000-8000-000000000001',
    kind: 'feature_parity',
    max_recovery_attempts: 3,
    params: {},
    recovery_attempt: 0,
    status: 'succeeded',
    updated_at: '2026-07-10T10:05:00.000Z',
    ...overrides,
  };
}

describe('jobResultRoute', () => {
  it('deep-links a FeatureParity result to its durable run evidence', () => {
    expect(
      jobResultRoute(
        job({ result_ref: '01900000-0000-7000-8000-000000000099' }),
      ),
    ).toBe(
      '/research/feature-integrity?run_id=01900000-0000-7000-8000-000000000099',
    );
  });

  it('does not invent a destination when the terminal result is absent', () => {
    expect(jobResultRoute(job({ result_ref: null }))).toBeUndefined();
  });
});
