/** Canonical backend summary (`ExpectedVsRealized` wire object). */
export interface ExpectedVsRealizedSummary {
  biasBps?: string;
  correlation?: string;
  meanExpectedBps?: string;
  meanRealizedBps?: string;
}

/** Optional decile bucket rows (demo seed / extended payloads). */
export interface ExpectedVsRealizedBucket {
  decile: number;
  expectedReturnBps: string;
  realizedReturnBps: string;
  samples: number;
}

export interface ParsedExpectedVsRealized {
  buckets: ExpectedVsRealizedBucket[];
  hasStructuredContent: boolean;
  summary: ExpectedVsRealizedSummary | null;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
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
 * Normalize the backend `expected_vs_realized` JSON blob into display-ready
 * summary metrics and optional decile buckets. Unknown shapes degrade to an
 * empty structured view (caller may fall back to raw JSON).
 */
export function parseExpectedVsRealized(
  raw: unknown,
): ParsedExpectedVsRealized {
  const obj = readRecord(raw);
  if (!obj) {
    return { buckets: [], hasStructuredContent: false, summary: null };
  }

  const summary: ExpectedVsRealizedSummary = {
    biasBps: readString(obj.bias_bps),
    correlation: readString(obj.correlation),
    meanExpectedBps: readString(obj.mean_expected_bps),
    meanRealizedBps: readString(obj.mean_realized_bps),
  };
  const hasSummary = Object.values(summary).some(
    (value) => value !== undefined,
  );

  const buckets: ExpectedVsRealizedBucket[] = [];
  if (Array.isArray(obj.buckets)) {
    for (const item of obj.buckets) {
      const bucket = readRecord(item);
      if (!bucket) {
        continue;
      }
      const decile = readNumber(bucket.decile);
      if (decile === undefined) {
        continue;
      }
      buckets.push({
        decile,
        expectedReturnBps: readString(bucket.expected_return_bps) ?? '',
        realizedReturnBps: readString(bucket.realized_return_bps) ?? '',
        samples: readNumber(bucket.samples) ?? 0,
      });
    }
  }

  return {
    buckets,
    hasStructuredContent: hasSummary || buckets.length > 0,
    summary: hasSummary ? summary : null,
  };
}
