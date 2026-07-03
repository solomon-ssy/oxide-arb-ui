/** Canonical backend summary (`ExpectedVsRealized` wire object — four scalars). */
export interface ExpectedVsRealizedSummary {
  biasBps?: string;
  correlation?: string;
  meanExpectedBps?: string;
  meanRealizedBps?: string;
}

function readString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  return String(value);
}

function readRecord(value: unknown): null | Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * Normalize the backend `expected_vs_realized` JSON object into display-ready
 * summary metrics. The canonical shape is exactly four scalars; returns `null`
 * when none are present so the caller renders an empty state.
 */
export function parseExpectedVsRealized(
  raw: unknown,
): ExpectedVsRealizedSummary | null {
  const obj = readRecord(raw);
  if (!obj) {
    return null;
  }
  const summary: ExpectedVsRealizedSummary = {
    biasBps: readString(obj.bias_bps),
    correlation: readString(obj.correlation),
    meanExpectedBps: readString(obj.mean_expected_bps),
    meanRealizedBps: readString(obj.mean_realized_bps),
  };
  return Object.values(summary).some((value) => value !== undefined)
    ? summary
    : null;
}
