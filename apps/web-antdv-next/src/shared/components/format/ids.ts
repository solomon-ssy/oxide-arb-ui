/**
 * Identifier display formatting for oxide-arb.
 *
 * Polymarket `MarketId` is a 66-char `0x…` condition id; full values are too
 * wide for table cells, so we truncate for display while keeping the full id
 * available for tooltip / copy interactions.
 */
import { EMPTY_PLACEHOLDER } from './constants';

/**
 * Truncate a long hex identifier for display: keeps the leading `prefix`
 * chars and trailing `suffix` chars joined by an ellipsis.
 *
 * `0x1234abcd…ef90` style; ids short enough to fit are returned unchanged.
 */
export function truncateHexId(
  value: null | string | undefined,
  prefix = 6,
  suffix = 4,
): string {
  if (!value) {
    return EMPTY_PLACEHOLDER;
  }
  if (value.length <= prefix + suffix + 1) {
    return value;
  }
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}
