import type { APIResponse, Page, Route } from 'playwright/test';

import type {
  ApiEnvelope,
  FeedbackCandidateReadyView,
  FeedbackCycleDetailView,
  FeedbackCycleView,
  FeedbackDecision,
  FeedbackOverviewView,
  Paginated,
} from '@vben/types';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const AUTH_ME_ROUTE = /\/api\/auth\/me(?:\?.*)?$/;
const FEEDBACK_CYCLES_ROUTE =
  /\/api\/research\/feedback-cycles(?:\/[^/?]+)?(?:\?.*)?$/;
const FEEDBACK_OVERVIEW_ROUTE = /\/api\/research\/feedback-overview(?:\?.*)?$/;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

interface HeldResponse {
  response: APIResponse;
  route: Route;
}

export interface ControlledFeedbackSnapshot {
  release: () => Promise<void>;
  ready: Promise<void>;
}

export interface ControlledFeedbackTrigger {
  count: () => number;
  release: () => Promise<number>;
  ready: Promise<void>;
}

export type FeedbackPresentation = 'blocked' | 'empty' | FeedbackDecision;

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function requireData<T>(envelope: ApiEnvelope<T>, route: Route): T {
  if (envelope.code !== 200 || envelope.data === null) {
    throw new TypeError(
      `controlled ${route.request().method()} ${route.request().url()} did not return a success envelope`,
    );
  }
  return envelope.data;
}

async function fulfillUpstream<T>(
  route: Route,
  transform: (data: T) => void,
): Promise<void> {
  const response = await route.fetch();
  const envelope = (await response.json()) as ApiEnvelope<T>;
  transform(requireData(envelope, route));
  await route.fulfill({ json: envelope, response });
}

function terminalReason(decision: FeedbackDecision): string {
  switch (decision) {
    case 'candidate_ready': {
      return 'feedback_candidate_ready_governance_required';
    }
    case 'challenger_rejected': {
      return 'feedback_all_candidates_rejected';
    }
    case 'no_action': {
      return 'feedback_shadow_insufficient_observations';
    }
    case 'promoted': {
      return 'feedback_promotion_committed';
    }
  }
}

function projectDecision(
  cycle: FeedbackCycleView,
  decision: FeedbackDecision,
): FeedbackCycleView {
  const completedAt = cycle.completed_at ?? cycle.updated_at;
  return {
    ...cycle,
    cancel_requested_at: null,
    completed_at: completedAt,
    decision,
    lease_expires_at: null,
    started_at: cycle.started_at ?? cycle.created_at,
    status: 'succeeded',
    terminal_reason_code: terminalReason(decision),
    updated_at: completedAt,
  };
}

function candidateScorecard(
  detail: FeedbackCycleDetailView,
): FeedbackCandidateReadyView {
  return {
    attribution: {
      decision_intervention_replay_count: 24,
      execution_trajectory_count: 12,
      outcome_association_count: 1,
      policy_counterfactual_count: 12,
      prediction_explanation_count: 24,
      prior_cycle_use_count: 8,
      produced_set_hash: 'blake3:e2e-attribution-produced',
      use_set_hash: 'blake3:e2e-attribution-uses',
    },
    blockers: [],
    comparison: {
      adjusted_p_value: '0.01',
      confidence: '0.95',
      effect_bps: '18.5',
      observation_count: 240,
      simultaneous_lower_bound_bps: '7.2',
    },
    quality_gate: {
      evaluated_at: detail.cycle.completed_at ?? detail.cycle.updated_at,
      gates: [
        {
          class: 'hard',
          detail: 'All point-in-time inputs remained at or before cutoff.',
          gate: 'no_pit_leakage',
          observed: 'true',
          status: 'pass',
          threshold: 'true',
        },
        {
          class: 'hard',
          detail: 'Deflated Sharpe cleared the governed threshold.',
          gate: 'deflated_sharpe',
          observed: '0.91',
          status: 'pass',
          threshold: '0.80',
        },
        {
          class: 'hard',
          detail: 'Probability of backtest overfitting remained below the cap.',
          gate: 'pbo',
          observed: '0.08',
          status: 'pass',
          threshold: '0.20',
        },
        {
          class: 'hard',
          detail: 'Exact explanation proof is bound to the serving contract.',
          gate: 'explainability_required',
          observed: 'verified',
          status: 'pass',
          threshold: 'verified',
        },
      ],
      intent: 'candidate',
      passed: true,
      report_hash: 'blake3:e2e-quality-gate',
    },
    route_diff: {
      candidate_model_version_id: '00000000-0000-0000-0000-000000000902',
      champion_model_version_id: detail.cycle.champion_model_version_id,
      current_route_generation: 7,
      execution_authority_unchanged: true,
      proposed_route_generation: 8,
    },
    shadow: {
      any_hard_divergence: false,
      mean_topn_decision_overlap: '0.93',
      minimum_topn_decision_overlap: '0.85',
      observed: 288,
      served_window_secs: 259_200,
      required: 240,
      required_window_secs: 259_200,
    },
  };
}

function projectDecisionDetail(
  detail: FeedbackCycleDetailView,
  decision: FeedbackDecision,
): void {
  detail.cycle = projectDecision(detail.cycle, decision);
  detail.candidate_ready =
    decision === 'candidate_ready' ? candidateScorecard(detail) : null;
  const terminal = detail.timeline.at(-1);
  if (terminal === undefined) {
    throw new TypeError('controlled decision detail requires a real timeline');
  }
  terminal.actor = 'feedback_decision_worker';
  terminal.event_kind = 'succeeded';
  terminal.reason_code = terminalReason(decision);
  terminal.stage = 'decision';
}

function removeMaterializationRead(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      removeMaterializationRead(item);
    }
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.permission_code === 'materialization:read') {
    record.permission_code = null;
  }
  for (const child of Object.values(record)) {
    removeMaterializationRead(child);
  }
}

/**
 * Keep the real `/auth/me` menu tree while removing the privileged role and the
 * permission code consumed by the Feedback workbench. This is a presentation
 * boundary, not an authorization substitute: server-side RBAC remains covered
 * by W4-E03.
 */
export async function installFeedbackPermissionState(
  page: Page,
): Promise<() => Promise<void>> {
  const handler = async (route: Route) => {
    await fulfillUpstream<Record<string, unknown>>(route, (me) => {
      removeMaterializationRead(me.menus);
      me.roles = [];
    });
  };
  await page.route(AUTH_ME_ROUTE, handler);
  return async () => {
    await page.unroute(AUTH_ME_ROUTE, handler);
  };
}

/**
 * Derive visual-only Feedback states from real upstream bytes. The owner never
 * writes persistence and never claims operational decision evidence; W4-E04
 * remains the canonical real-PostgreSQL decision proof.
 */
export async function installFeedbackPresentation(
  page: Page,
  presentation: FeedbackPresentation,
  cycleId: string,
): Promise<() => Promise<void>> {
  const overviewHandler = async (route: Route) => {
    await fulfillUpstream<FeedbackOverviewView>(route, (overview) => {
      if (presentation === 'blocked') {
        overview.readiness = null;
      }
    });
  };
  const cyclesHandler = async (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/research/feedback-cycles') {
      await fulfillUpstream<Paginated<FeedbackCycleView>>(route, (pageData) => {
        if (presentation === 'empty') {
          pageData.has_next = false;
          pageData.items = [];
          pageData.total = 0;
          return;
        }
        if (presentation === 'blocked') {
          return;
        }
        const target = pageData.items.find(
          (cycle) => cycle.feedback_cycle_id === cycleId,
        );
        if (target === undefined) {
          throw new TypeError(
            `controlled decision list is missing cycle ${cycleId}`,
          );
        }
        pageData.items = [
          projectDecision(target, presentation),
          ...pageData.items.filter(
            (cycle) => cycle.feedback_cycle_id !== cycleId,
          ),
        ];
      });
      return;
    }
    if (presentation === 'blocked' || presentation === 'empty') {
      await route.continue();
      return;
    }
    await fulfillUpstream<FeedbackCycleDetailView>(route, (detail) => {
      if (detail.cycle.feedback_cycle_id !== cycleId) {
        throw new TypeError(
          `controlled decision detail returned ${detail.cycle.feedback_cycle_id}, expected ${cycleId}`,
        );
      }
      projectDecisionDetail(detail, presentation);
    });
  };
  await Promise.all([
    page.route(FEEDBACK_OVERVIEW_ROUTE, overviewHandler),
    page.route(FEEDBACK_CYCLES_ROUTE, cyclesHandler),
  ]);
  return async () => {
    await Promise.all([
      page.unroute(FEEDBACK_OVERVIEW_ROUTE, overviewHandler),
      page.unroute(FEEDBACK_CYCLES_ROUTE, cyclesHandler),
    ]);
  };
}

export async function installFeedbackErrorState(
  page: Page,
): Promise<() => Promise<void>> {
  const handler = async (route: Route) => {
    await route.fulfill({
      body: JSON.stringify({
        code: 503,
        data: null,
        message: 'w4_e06_controlled_unavailable',
      }),
      contentType: 'application/json',
      status: 503,
    });
  };
  await Promise.all([
    page.route(FEEDBACK_OVERVIEW_ROUTE, handler),
    page.route(FEEDBACK_CYCLES_ROUTE, handler),
  ]);
  return async () => {
    await Promise.all([
      page.unroute(FEEDBACK_OVERVIEW_ROUTE, handler),
      page.unroute(FEEDBACK_CYCLES_ROUTE, handler),
    ]);
  };
}

export async function holdFeedbackSnapshot(
  page: Page,
): Promise<ControlledFeedbackSnapshot> {
  const held: HeldResponse[] = [];
  const ready = deferred<undefined>();
  const released = deferred<undefined>();
  let didRelease = false;
  const handler = async (route: Route) => {
    const response = await route.fetch();
    held.push({ response, route });
    if (held.length === 2) {
      ready.resolve(undefined);
    }
    await released.promise;
    await route.fulfill({ response });
  };
  await Promise.all([
    page.route(FEEDBACK_OVERVIEW_ROUTE, handler),
    page.route(FEEDBACK_CYCLES_ROUTE, handler),
  ]);
  return {
    async release() {
      if (didRelease) {
        throw new Error('controlled Feedback snapshot was released twice');
      }
      didRelease = true;
      released.resolve(undefined);
      await Promise.all(held.map(({ route }) => route.request().response()));
      await Promise.all([
        page.unroute(FEEDBACK_OVERVIEW_ROUTE, handler),
        page.unroute(FEEDBACK_CYCLES_ROUTE, handler),
      ]);
    },
    ready: ready.promise,
  };
}

export async function holdFeedbackTrigger(
  page: Page,
): Promise<ControlledFeedbackTrigger> {
  const held = deferred<HeldResponse>();
  const released = deferred<undefined>();
  let count = 0;
  let didRelease = false;
  const handler = async (route: Route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    count += 1;
    const response = await route.fetch();
    held.resolve({ response, route });
    await released.promise;
    await route.fulfill({ response });
  };
  await page.route(FEEDBACK_CYCLES_ROUTE, handler);
  return {
    count: () => count,
    async release() {
      if (didRelease) {
        throw new Error('controlled Feedback trigger was released twice');
      }
      didRelease = true;
      const response = await held.promise;
      const status = response.response.status();
      released.resolve(undefined);
      await response.route.request().response();
      await page.unroute(FEEDBACK_CYCLES_ROUTE, handler);
      return status;
    },
    ready: held.promise.then(() => undefined),
  };
}

export async function sha256File(path: string): Promise<{
  bytes: number;
  sha256: string;
}> {
  const bytes = await readFile(path);
  return {
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export function screenshotAggregate(
  rows: readonly { path: string; sha256: string }[],
): string {
  const canonical = rows
    .map(({ path, sha256 }) => `${sha256}  ${path}`)
    .toSorted()
    .join('\n');
  return createHash('sha256').update(`${canonical}\n`).digest('hex');
}
