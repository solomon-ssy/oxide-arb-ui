import type {
  ExchangeHistoryFrontierProgress,
  FreshBootProfileProgressView,
  FreshBootProgressView,
  FreshBootStatus,
} from '@vben/types';

import type { DashboardReadResult } from './dashboard-snapshot';

export type FreshBootSummaryStatus =
  | 'blocked'
  | 'running'
  | 'succeeded'
  | 'waiting';

export interface FreshBootSummary {
  color: 'error' | 'processing' | 'success';
  status: FreshBootSummaryStatus;
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
  profiles: FreshBootProfileProgressView[],
  historyStage: ExchangeHistoryFrontierProgress['stage'] | undefined,
): FreshBootSummary {
  if (
    profiles.some((profile) => profile.run.status === 'blocked_terminal') ||
    historyStage === 'quarantined'
  ) {
    return { color: 'error', status: 'blocked' };
  }
  if (profiles.length === 0) {
    return { color: 'processing', status: 'waiting' };
  }
  if (
    profiles.length === 3 &&
    profiles.every((profile) => profile.run.status === 'succeeded')
  ) {
    return { color: 'success', status: 'succeeded' };
  }
  return { color: 'processing', status: 'running' };
}

export function profileStatusColor(status: FreshBootStatus) {
  if (status === 'succeeded') return 'success';
  if (status === 'blocked_terminal') return 'error';
  if (status === 'retry_scheduled' || status === 'waiting_evidence') {
    return 'warning';
  }
  if (status === 'superseded') return 'default';
  return 'processing';
}

export function reduceFreshBootRead(
  previous: FreshBootProgressView | null,
  result: DashboardReadResult<FreshBootProgressView>,
): FreshBootReadState {
  return result.state === 'ready'
    ? { stale: false, value: result.value }
    : { stale: previous !== null, value: previous };
}
