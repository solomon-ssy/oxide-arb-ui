import type { DomainSourceExpectationView } from '@vben/types';

export interface DomainSourceSummary {
  crypto: number;
  errors: number;
  notObserved: number;
  observed: number;
  stale: number;
  total: number;
  weather: number;
  worstLagSecs: null | number;
}

/** Summarize only server facts; never reconstruct per-binding health. */
export function summarizeDomainSources(
  rows: readonly DomainSourceExpectationView[],
): DomainSourceSummary {
  let crypto = 0;
  let errors = 0;
  let notObserved = 0;
  let observed = 0;
  let stale = 0;
  let weather = 0;
  let worstLagSecs: null | number = null;

  for (const row of rows) {
    if (row.family === 'crypto') {
      crypto += 1;
    } else {
      weather += 1;
    }
    if (row.status === 'error') {
      errors += 1;
    } else if (row.status === 'stale') {
      stale += 1;
    }
    if (row.lag_secs === null) {
      notObserved += 1;
    } else {
      observed += 1;
      worstLagSecs =
        worstLagSecs === null
          ? row.lag_secs
          : Math.max(worstLagSecs, row.lag_secs);
    }
  }

  return {
    crypto,
    errors,
    notObserved,
    observed,
    stale,
    total: rows.length,
    weather,
    worstLagSecs,
  };
}
