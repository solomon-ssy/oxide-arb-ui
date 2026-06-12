import type {
  ControlFactorMaterializationRunView,
  ControlFactorType,
  IsoDateTime,
  MaterializationRunStatus,
  PageQuery,
  Paginated,
  ReplayEnqueueView,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace ReplayApi {
  export const base = '/replay';
  export const run = (runId: string) => `${base}/${runId}`;
}

/** Query params for `GET /replay`. */
export interface ReplayPageParams extends PageQuery {
  status?: MaterializationRunStatus;
}

/** Operator request to enqueue a backfill / replay materialization run. */
export interface ReplayCreateRequest {
  from: IsoDateTime;
  to: IsoDateTime;
  market_ids?: string[];
  event_ids?: string[];
  token_ids?: string[];
  categories?: string[];
  requested_factor_types: ControlFactorType[];
  holder_address?: string;
  reason: string;
  force_new_run?: boolean;
}

/** `GET /replay` — paginated materialization / replay run index. */
export async function fetchReplayPage(params?: ReplayPageParams) {
  return requestClient.get<Paginated<ControlFactorMaterializationRunView>>(
    ReplayApi.base,
    { params },
  );
}

/** `GET /replay/{run_id}` — current status of a materialization / replay run. */
export async function getReplayRun(runId: string) {
  return requestClient.get<ControlFactorMaterializationRunView>(
    ReplayApi.run(runId),
  );
}

/** `POST /replay` — enqueue a backfill / replay materialization run (governed). */
export async function createReplay(body: ReplayCreateRequest) {
  return requestClient.post<ReplayEnqueueView>(ReplayApi.base, body);
}
