import type {
  GateOutcome,
  GateStatus,
  QualityGateReportView,
} from '@vben/types';

/** Overall readiness verdict derived from the gate ledger. */
export type GateVerdict = 'blocked' | 'ready' | 'warnings';

/** Display-ready projection of a quality-gate report. */
export interface ParsedQualityGate {
  /** Every gate that was actually evaluated (excludes `not_applicable`), sorted
   * hard-first then by status severity for scorecard rendering. */
  evaluated: GateOutcome[];
  /** Hard gates that failed (block publish). */
  hardFailures: GateOutcome[];
  /** Gates skipped for the evaluated intent (e.g. shadow under `candidate`). */
  notApplicable: GateOutcome[];
  /** Soft gates that warned (never block). */
  softWarnings: GateOutcome[];
  /** Overall verdict: `ready` (all hard pass, no warnings), `warnings`
   * (hard pass with soft warnings), or `blocked` (≥1 hard failure). */
  verdict: GateVerdict;
}

// Scorecard sort: worst-first within hard, then soft; not-applicable is split out.
const CLASS_RANK: Record<string, number> = { hard: 0, soft: 1 };
const STATUS_RANK: Record<string, number> = {
  fail: 0,
  not_applicable: 3,
  pass: 2,
  warn: 1,
};

/**
 * Normalize a `QualityGateReportView` into grouped, sorted rows plus a verdict.
 * Returns `null` for a missing report so callers render a loading / empty state.
 */
export function parseQualityGate(
  report: null | QualityGateReportView | undefined,
): null | ParsedQualityGate {
  if (!report) {
    return null;
  }
  const gates = Array.isArray(report.gates) ? report.gates : [];
  const notApplicable = gates.filter(
    (gate) => gate.status === 'not_applicable',
  );
  const evaluated = [
    ...gates.filter((gate) => gate.status !== 'not_applicable'),
  ].toSorted(
    (a, b) =>
      (CLASS_RANK[a.class] ?? 9) - (CLASS_RANK[b.class] ?? 9) ||
      (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9),
  );
  const hardFailures = gates.filter(
    (gate) => gate.class === 'hard' && gate.status === 'fail',
  );
  const softWarnings = gates.filter(
    (gate) => gate.class === 'soft' && gate.status === 'warn',
  );
  let verdict: GateVerdict = 'ready';
  if (hardFailures.length > 0) {
    verdict = 'blocked';
  } else if (softWarnings.length > 0) {
    verdict = 'warnings';
  }
  return {
    evaluated,
    hardFailures,
    notApplicable,
    softWarnings,
    verdict,
  };
}

/** Ant Design tag color for a gate status. */
export function gateStatusColor(status: GateStatus): string {
  switch (status) {
    case 'fail': {
      return 'error';
    }
    case 'not_applicable': {
      return 'default';
    }
    case 'pass': {
      return 'success';
    }
    case 'warn': {
      return 'warning';
    }
    default: {
      return 'default';
    }
  }
}
