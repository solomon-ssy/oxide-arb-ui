import type { OrderIntentView } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { buildApproveIntentRequest } from './approval-request';

function intent(unit: 'shares' | 'usd'): OrderIntentView {
  return {
    entry_order: {
      amount: { unit, value: '100' },
    },
  } as OrderIntentView;
}

describe('buildApproveIntentRequest', () => {
  it('preserves the frozen USD amount tag', () => {
    expect(
      buildApproveIntentRequest(
        intent('usd'),
        { override_amount: '25', override_price: '0.55' },
        'approved after depth review',
      ),
    ).toEqual({
      override_amount: { unit: 'usd', value: '25' },
      override_price: '0.55',
      reason: 'approved after depth review',
    });
  });

  it('does not invent an amount override for price-only approval', () => {
    expect(
      buildApproveIntentRequest(
        intent('shares'),
        { override_price: '0.65' },
        'tightened sell floor',
      ),
    ).toEqual({
      override_amount: undefined,
      override_price: '0.65',
      reason: 'tightened sell floor',
    });
  });
});
