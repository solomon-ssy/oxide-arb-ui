import type { DashboardOverviewView, DashboardWindow } from '@vben/types';

import { requestClient } from '#/api/request';

export function getDashboardOverview(window: DashboardWindow) {
  return requestClient.get<DashboardOverviewView>('/dashboard/overview', {
    params: { window },
  });
}
