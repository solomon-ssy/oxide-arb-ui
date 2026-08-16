import type { PageQuery } from './common';
import type {
  VenueIncentiveKind,
  VenueIncentiveStage,
} from './generated/quant-operator-api';

/** Filters for the immutable venue-incentive audit ledger. */
export interface VenueIncentiveEventQuery extends PageQuery {
  kind?: VenueIncentiveKind;
  program_date?: string;
  stage?: VenueIncentiveStage;
}
