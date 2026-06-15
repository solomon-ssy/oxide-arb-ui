import type { MarketPerformanceRow, ProbabilityString } from '@vben/types';

/** Grid row with a derived 0..1 success-rate field for `CellPercent`. */
export type MarketPerformanceGridRow = MarketPerformanceRow & {
  success_rate: ProbabilityString;
};
