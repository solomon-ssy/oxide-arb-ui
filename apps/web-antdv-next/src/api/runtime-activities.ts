import type {
  RuntimeActivityListQuery,
  RuntimeActivityPageView,
} from '@vben/types';

import { requestClient } from './request';

/** Read one permission-filtered, keyset-paginated Activity Center page. */
export function listRuntimeActivities(
  params: RuntimeActivityListQuery = {},
  signal?: AbortSignal,
) {
  return requestClient.get<RuntimeActivityPageView>('/runtime/activities', {
    params,
    signal,
  });
}
