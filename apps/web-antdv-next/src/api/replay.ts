import type {
  ControlFactorMaterializationRunView,
  ControlFactorStageReportView,
  ControlFactorType,
  IsoDateTime,
  MaterializationRunStatus,
  PageQuery,
  Paginated,
  ReplayEnqueueView,
} from '@vben/types';

import type { GovernedContext } from '#/shared/composables/use-governed-action';

import { governedPost } from '#/api/governed-request';
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
export type ReplayCreateRequest = Record<string, unknown> & {
  categories?: string[];
  event_ids?: string[];
  force_new_run?: boolean;
  from: IsoDateTime;
  holder_address?: string;
  market_ids?: string[];
  reason: string;
  requested_factor_types: ControlFactorType[];
  to: IsoDateTime;
  token_ids?: string[];
};

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

/** `GET /replay/{run_id}/history` — per-stage report history for a run. */
export async function getReplayHistory(runId: string) {
  return requestClient.get<ControlFactorStageReportView[]>(
    `${ReplayApi.run(runId)}/history`,
  );
}

/** `POST /replay` — enqueue a backfill / replay materialization run (governed). */
export async function createReplay(
  body: ReplayCreateRequest,
  ctx: GovernedContext,
) {
  return governedPost<ReplayEnqueueView>(ReplayApi.base, body, ctx);
}
