export const RUNTIME_ACTIVITY_DOMAINS = {
  execution: 'execution',
  reconciliation: 'reconciliation',
  report: 'report',
  research: 'research',
  settlement: 'settlement',
} as const;

export type RuntimeActivityDomain =
  (typeof RUNTIME_ACTIVITY_DOMAINS)[keyof typeof RUNTIME_ACTIVITY_DOMAINS];

export const RUNTIME_ACTIVITY_STATUSES = {
  attention: 'attention',
  cancelled: 'cancelled',
  failed: 'failed',
  pending: 'pending',
  running: 'running',
  skipped: 'skipped',
  succeeded: 'succeeded',
} as const;

export type RuntimeActivityStatus =
  (typeof RUNTIME_ACTIVITY_STATUSES)[keyof typeof RUNTIME_ACTIVITY_STATUSES];

export type RuntimeActivityActionKind =
  | 'cancel_research_job'
  | 'resolve_reconciliation'
  | 'retry_report_run'
  | 'retry_research_job';

export interface RuntimeActivityEntityView {
  id: string;
  kind: string;
}

export interface RuntimeActivityActionView {
  kind: RuntimeActivityActionKind;
  permission_code: string;
}

export interface RuntimeActivityView {
  activity_id: string;
  available_actions: RuntimeActivityActionView[];
  detail: null | string;
  domain: RuntimeActivityDomain;
  entity: RuntimeActivityEntityView;
  finished_at: null | string;
  kind: string;
  progress_pct: null | number;
  related_entity: null | RuntimeActivityEntityView;
  source_status: string;
  started_at: null | string;
  status: RuntimeActivityStatus;
  target_route: string;
  updated_at: string;
}

export interface RuntimeActivityDomainCountView {
  count: number;
  domain: RuntimeActivityDomain;
}

export interface RuntimeActivitySummaryView {
  by_domain: RuntimeActivityDomainCountView[];
  total: number;
}

export interface RuntimeActivityPageView {
  has_more: boolean;
  items: RuntimeActivityView[];
  next_cursor: null | string;
  summary: RuntimeActivitySummaryView;
}

export interface RuntimeActivityListQuery {
  cursor?: string;
  domain?: RuntimeActivityDomain;
  limit?: number;
  status?: RuntimeActivityStatus;
}
