/**
 * Pure baseline-selection logic for the report diff picker.
 *
 * Kept dependency-free (only a type import) so the default-selection rule is
 * unit-testable without dragging in the API client or formatters.
 */
import type { RecommendationReportStatus } from '@vben/types';

/** One selectable baseline report. */
export interface CompareOption {
  as_of: string;
  label: string;
  status: RecommendationReportStatus;
  value: string;
}

/**
 * Default baseline value given options sorted newest-first by `as_of`: the most
 * recent option strictly older than `currentAsOf`, else the newest option, else
 * `undefined` when there is nothing to compare against.
 */
export function defaultBaseline(
  options: CompareOption[],
  currentAsOf: string,
): string | undefined {
  const previous = options.find((option) => option.as_of < currentAsOf);
  return (previous ?? options[0])?.value;
}
