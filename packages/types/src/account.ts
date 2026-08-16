import type { PageQuery, TimeRangeQuery } from './common';

/** Filter and pagination for `GET /quant/account/equity-snapshots`. */
export interface EquitySnapshotQuery extends PageQuery, TimeRangeQuery {}
