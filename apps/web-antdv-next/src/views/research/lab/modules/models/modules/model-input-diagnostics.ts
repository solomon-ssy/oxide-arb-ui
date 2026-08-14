/** Format frozen input-state rates without inventing values for malformed or
 * incomplete artifact diagnostics. */
export function formatModelInputStateRates(
  value: unknown,
  emptyPlaceholder: string,
): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return emptyPlaceholder;
  }

  const rates = value as Record<string, unknown>;
  const display = (rate: unknown) =>
    rate === null || rate === undefined || rate === ''
      ? emptyPlaceholder
      : String(rate);

  return [
    `O ${display(rates.observed)}`,
    `M ${display(rates.missing)}`,
    `NA ${display(rates.not_applicable)}`,
    `S ${display(rates.substituted)}`,
  ].join(' · ');
}
