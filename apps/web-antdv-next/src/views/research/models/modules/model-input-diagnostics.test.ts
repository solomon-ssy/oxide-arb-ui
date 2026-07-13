import { describe, expect, it } from 'vitest';

import { formatModelInputStateRates } from './model-input-diagnostics';

describe('formatModelInputStateRates', () => {
  it('renders every frozen state rate in the model-detail O/M/NA/S order', () => {
    expect(
      formatModelInputStateRates(
        {
          missing: '0.125',
          not_applicable: '0.25',
          observed: '0.5',
          substituted: '0.125',
        },
        '—',
      ),
    ).toBe('O 0.5 · M 0.125 · NA 0.25 · S 0.125');
  });

  it('preserves legitimate zero rates and marks absent evidence explicitly', () => {
    expect(
      formatModelInputStateRates(
        {
          missing: 0,
          not_applicable: null,
          observed: 1,
          substituted: undefined,
        },
        '—',
      ),
    ).toBe('O 1 · M 0 · NA — · S —');
    expect(formatModelInputStateRates(null, '—')).toBe('—');
  });
});
