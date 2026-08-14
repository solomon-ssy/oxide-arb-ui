import type { QualityGateReportView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { gateStatusColor, parseQualityGate } from './quality-gate';

function report(
  gates: QualityGateReportView['gates'],
  passed: boolean,
): QualityGateReportView {
  return {
    evaluated_at: '2026-01-01T00:00:00Z',
    gates,
    intent: 'route_activation',
    passed,
    report_hash: 'blake3:0',
  };
}

describe('parseQualityGate', () => {
  it('returns null for a missing report', () => {
    expect(parseQualityGate(null)).toBeNull();
    expect(parseQualityGate(undefined)).toBeNull();
  });

  it('reports ready when every hard gate passes and no soft warnings', () => {
    const parsed = parseQualityGate(
      report(
        [
          {
            class: 'hard',
            detail: '',
            gate: 'sample_count',
            observed: '2000',
            status: 'pass',
            threshold: '500',
          },
          {
            class: 'soft',
            detail: '',
            gate: 'rank_ic',
            observed: '0.15',
            status: 'pass',
            threshold: '> 0',
          },
        ],
        true,
      ),
    );
    expect(parsed?.verdict).toBe('ready');
    expect(parsed?.hardFailures).toHaveLength(0);
    expect(parsed?.softWarnings).toHaveLength(0);
    expect(parsed?.evaluated).toHaveLength(2);
  });

  it('reports warnings when a soft gate warns but hard gates pass', () => {
    const parsed = parseQualityGate(
      report(
        [
          {
            class: 'hard',
            detail: '',
            gate: 'max_drawdown',
            observed: '0.1',
            status: 'pass',
            threshold: '0.3',
          },
          {
            class: 'soft',
            detail: 'directional hit rate below 0.5',
            gate: 'hit_rate',
            observed: '0.42',
            status: 'warn',
            threshold: '0.5',
          },
        ],
        true,
      ),
    );
    expect(parsed?.verdict).toBe('warnings');
    expect(parsed?.softWarnings).toHaveLength(1);
  });

  it('reports blocked and sorts hard failures first, splitting not-applicable', () => {
    const parsed = parseQualityGate(
      report(
        [
          {
            class: 'soft',
            detail: '',
            gate: 'rank_ic',
            observed: '0.1',
            status: 'pass',
            threshold: '> 0',
          },
          {
            class: 'hard',
            detail: 'shadow stability not established',
            gate: 'shadow_decision_overlap',
            observed: 'none',
            status: 'not_applicable',
            threshold: '0.6',
          },
          {
            class: 'hard',
            detail: 'insufficient resolved samples',
            gate: 'sample_count',
            observed: '10',
            status: 'fail',
            threshold: '500',
          },
        ],
        false,
      ),
    );
    expect(parsed?.verdict).toBe('blocked');
    expect(parsed?.hardFailures).toHaveLength(1);
    expect(parsed?.notApplicable).toHaveLength(1);
    // Hard failure sorts ahead of the passing soft gate; n/a is excluded.
    expect(parsed?.evaluated.map((gate) => gate.gate)).toEqual([
      'sample_count',
      'rank_ic',
    ]);
  });
});

describe('gateStatusColor', () => {
  it('maps statuses to ant tag colors', () => {
    expect(gateStatusColor('pass')).toBe('success');
    expect(gateStatusColor('fail')).toBe('error');
    expect(gateStatusColor('warn')).toBe('warning');
    expect(gateStatusColor('not_applicable')).toBe('default');
  });
});
