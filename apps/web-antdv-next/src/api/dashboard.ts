import type { DashboardOverviewView, DashboardWindow } from '@vben/types';

import { requestClient } from '#/api/request';

export interface DashboardReadOptions {
  signal?: AbortSignal;
}

export function getDashboardOverview(
  window: DashboardWindow,
  options: DashboardReadOptions = {},
) {
  return requestClient.get<DashboardOverviewView>('/dashboard/overview', {
    params: { window },
    signal: options.signal,
  });
}
