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
        job({
          result: {
            id: '01900000-0000-7000-8000-000000000099',
            kind: 'feature_parity_run',
          },
        }),
      ),
    ).toBe(
      '/research/data-reliability?module=feature-integrity&entity=parity-run&id=01900000-0000-7000-8000-000000000099',
    );
  });

  it('does not invent a destination when the terminal result is absent', () => {
    expect(jobResultRoute(job({ result: null }))).toBeUndefined();
  });

  it('routes by the persisted result namespace instead of inferring from job kind', () => {
    expect(
      jobResultRoute(
        job({
          kind: 'model_calibration_fit',
          result: {
            id: '01900000-0000-7000-8000-000000000099',
            kind: 'model_version',
          },
        }),
      ),
    ).toBe(
      '/research/lab?module=models&entity=model-version&id=01900000-0000-7000-8000-000000000099',
    );
  });
});
