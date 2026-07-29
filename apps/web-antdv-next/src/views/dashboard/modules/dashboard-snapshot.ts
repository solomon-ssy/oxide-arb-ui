import type {
  DashboardOverviewView,
  DashboardWindow,
  FeedbackOverviewView,
} from '@vben/types';

import { getDashboardOverview } from '#/api/dashboard';
import { getFeedbackOverview } from '#/api/feedback';

export type DashboardReadResult<T> =
  | { state: 'error' }
  | { state: 'ready'; value: T };

export type DashboardFeedbackResult =
  | DashboardReadResult<FeedbackOverviewView>
  | { state: 'forbidden' };

export interface DashboardSnapshot {
  feedback: DashboardFeedbackResult;
  overview: DashboardReadResult<DashboardOverviewView>;
}

async function captureRead<T>(
  read: () => Promise<T>,
): Promise<DashboardReadResult<T>> {
  try {
    return { state: 'ready', value: await read() };
  } catch {
    return { state: 'error' };
  }
}

/**
 * Read both Dashboard sections under one coordinator generation.
 * Each section keeps a typed failure state so one outage cannot discard the
 * other section's authoritative result.
 */
export async function getDashboardSnapshot(
  window: DashboardWindow,
  signal: AbortSignal,
  canReadFeedback: boolean,
): Promise<DashboardSnapshot> {
  const feedbackRead: Promise<DashboardFeedbackResult> = canReadFeedback
    ? captureRead(() => getFeedbackOverview({ signal }))
    : Promise.resolve({ state: 'forbidden' });
  const [overview, feedback] = await Promise.all([
    captureRead(() => getDashboardOverview(window, { signal })),
    feedbackRead,
  ]);
  return { feedback, overview };
}
