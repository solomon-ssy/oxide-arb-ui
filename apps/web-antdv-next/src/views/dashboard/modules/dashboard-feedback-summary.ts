import type { FeedbackOverviewView, IsoDateTime } from '@vben/types';

import type { FeedbackProfilePresentation } from '../../research/feedback/modules/feedback-profile-presentation';

import { feedbackProfilePresentation } from '../../research/feedback/modules/feedback-profile-presentation';

export interface DashboardFeedbackSummary {
  generatedAt: IsoDateTime;
  profiles: FeedbackProfilePresentation[];
  revision: number;
}

/** Compact vertical-only projection of the authoritative Feedback overview. */
export function summarizeDashboardFeedback(
  snapshot: FeedbackOverviewView,
): DashboardFeedbackSummary {
  return {
    generatedAt: snapshot.generated_at,
    profiles: snapshot.profiles
      .filter((profile) => profile.category !== null)
      .map((profile) =>
        feedbackProfilePresentation(profile, snapshot.readiness),
      ),
    revision: snapshot.revision,
  };
}

export function isFeedbackSnapshotCurrent(
  snapshot: FeedbackOverviewView,
  minimumRevision: number,
): boolean {
  return (
    Number.isSafeInteger(snapshot.revision) &&
    snapshot.revision >= minimumRevision
  );
}
