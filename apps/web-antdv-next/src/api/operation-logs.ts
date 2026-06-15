import type {
  IsoDateTime,
  OperationCategory,
  OperationLogView,
  OperationOutcome,
  PageQuery,
  Paginated,
  ResourceType,
  UuidString,
} from '@vben/types';

import { requestClient } from '#/api/request';

export namespace OperationLogsApi {
  export const base = '/operation-logs';

  export interface PageParams extends PageQuery {
    actor_user_id?: UuidString;
    category?: OperationCategory;
    resource_type?: ResourceType;
    outcome?: OperationOutcome;
    request_id?: string;
    governance_audit_event_id?: UuidString;
    from?: IsoDateTime;
    to?: IsoDateTime;
  }
}

/** `GET /operation-logs` — paginated redacted operation-log query. */
export async function fetchOperationLogPage(
  params?: OperationLogsApi.PageParams,
) {
  return requestClient.get<Paginated<OperationLogView>>(OperationLogsApi.base, {
    params,
  });
}
