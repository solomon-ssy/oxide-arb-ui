import type { PublicationStatus } from '@vben/types';

import { PUBLICATION_STATUSES } from '@vben/types';

/** Publish affordance only; clicking it still executes the authoritative gate preview. */
export function canOfferModelPublish(
  hasPermission: boolean,
  status: PublicationStatus,
): boolean {
  return (
    hasPermission &&
    (status === PUBLICATION_STATUSES.candidate ||
      status === PUBLICATION_STATUSES.shadow)
  );
}
