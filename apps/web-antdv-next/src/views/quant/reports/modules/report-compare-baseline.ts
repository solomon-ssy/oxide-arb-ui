/**
 * Pure baseline-selection logic for the report diff picker.
 *
 * Kept dependency-free (only a type import) so the default-selection rule is
 * unit-testable without dragging in the API client or formatters.
 */
import type { RecommendationReportStatus } from '@vben/types';

/** One selectable baseline report. */
export interface CompareOption {
  decision_at: string;
  label: string;
  status: RecommendationReportStatus;
  value: string;
}

/**
 * Default baseline value given options sorted newest-first by `decision_at`: the most
 * recent option strictly older than `currentDecisionAt`, else the newest option, else
 * `undefined` when there is nothing to compare against.
 */
export function defaultBaseline(
  options: CompareOption[],
  currentDecisionAt: string,
): string | undefined {
  const previous = options.find(
    (option) => option.decision_at < currentDecisionAt,
  );
  return (previous ?? options[0])?.value;
}
