import { PUBLICATION_STATUSES } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { canOfferModelPublish } from './model-action-state';

describe('canOfferModelPublish', () => {
  it('offers Publish only for authorized candidate or shadow versions', () => {
    for (const status of Object.values(PUBLICATION_STATUSES)) {
      expect(canOfferModelPublish(true, status)).toBe(
        status === PUBLICATION_STATUSES.candidate ||
          status === PUBLICATION_STATUSES.shadow,
      );
    }
    expect(canOfferModelPublish(false, PUBLICATION_STATUSES.candidate)).toBe(
      false,
    );
  });
});
