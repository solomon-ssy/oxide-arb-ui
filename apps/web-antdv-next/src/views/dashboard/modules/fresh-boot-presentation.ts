import type {
  ExchangeHistoryFrontierProgress,
  FreshBootCapabilityState,
  FreshBootProgressView,
} from '@vben/types';

import type { DashboardReadResult } from './dashboard-snapshot';

import type { EnumTone } from '#/shared/presentation/enum-presentation';

export type FreshBootSummaryStatus =
  | 'blocked'
  | 'running'
  | 'succeeded'
  | 'waiting';

export interface FreshBootSummary {
  status: FreshBootSummaryStatus;
  tone: EnumTone;
}

export interface FreshBootReadState {
  stale: boolean;
  value: FreshBootProgressView | null;
}

function boundedPercent(accepted: number, total: number) {
  return total <= 0
    ? 0
    : Math.max(0, Math.min(100, Math.round((accepted / total) * 100)));
}

export function activationPercent(
  history: ExchangeHistoryFrontierProgress | undefined,
) {
  if (
    !history ||
    history.activation_from_block === null ||
    history.target_block === null ||
    history.accepted_through_block === null
  ) {
    return 0;
  }
  return boundedPercent(
    history.accepted_through_block - history.activation_from_block + 1,
    history.target_block - history.activation_from_block + 1,
  );
}

export function retentionPercent(
  history: ExchangeHistoryFrontierProgress | undefined,
) {
  if (
    !history ||
    history.retention_from_block === null ||
    history.retention_through_block === null ||
    history.retention_accepted_from_block === null
  ) {
    return 0;
  }
  return boundedPercent(
    history.retention_through_block - history.retention_accepted_from_block + 1,
    history.retention_through_block - history.retention_from_block + 1,
  );
}

export function summarizeFreshBoot(
  capability: FreshBootCapabilityState | undefined,
  pooledFirstReportReady = false,
): FreshBootSummary {
  if (capability === 'blocked') {
    return { status: 'blocked', tone: 'danger' };
  }
  if (capability === 'partial_blocked') {
    return pooledFirstReportReady
      ? { status: 'succeeded', tone: 'success' }
      : { status: 'blocked', tone: 'danger' };
  }
  if (!capability || capability === 'awaiting_history') {
    return { status: 'waiting', tone: 'queued' };
  }
  if (
    capability === 'first_report_ready' ||
    capability === 'all_routes_ready'
  ) {
    return { status: 'succeeded', tone: 'success' };
  }
  return { status: 'running', tone: 'running' };
}

export function reduceFreshBootRead(
  previous: FreshBootProgressView | null,
  result: DashboardReadResult<FreshBootProgressView>,
): FreshBootReadState {
  return result.state === 'ready'
    ? { stale: false, value: result.value }
    : { stale: previous !== null, value: previous };
}
