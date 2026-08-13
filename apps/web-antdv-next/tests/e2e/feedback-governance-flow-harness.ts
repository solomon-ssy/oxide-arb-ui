import type { Page, Route } from 'playwright/test';

import type {
  ActivateModelRouteRequest,
  ApiEnvelope,
  CurrentPolicyResourceView,
  FeedbackCycleView,
  IssuePromotionPermitRequest,
  ModelRouteActivationMutationView,
  ModelRouteActivationReceiptView,
  ModelRouting,
  Paginated,
  PolicyRevisionView,
  PromotionPermitMutationView,
  PromotionPermitView,
  QuantRecommendationView,
  QuantReportDetailView,
  QuantReportDiagnosticsView,
  ReportRunView,
  RunReportRequest,
} from '@vben/types';

const ACTIVATIONS_ROUTE =
  /\/api\/research\/model-route-activations(?:\/[^/?]+)?$/;
const PERMITS_ROUTE =
  /\/api\/research\/model-route-activation-permits(?:\?.*)?$/;
const REPORT_RUN_ROUTE = /\/api\/quant\/reports\/run$/;
const REPORT_RUN_DETAIL_ROUTE = /\/api\/quant\/report-runs\/[^/?]+$/;
const MODEL_ROUTING_PRESENTATION_ROUTE =
  /\/api\/config\/model_routing\/(?:current|revisions(?:\/[^/?]+)?)(?:\?.*)?$/;

export const CONTROLLED_CANDIDATE_MODEL_ID =
  '00000000-0000-0000-0000-000000000902';
export const CONTROLLED_PROMOTION_PERMIT_ID =
  '00000000-0000-0000-0000-000000000903';
export const CONTROLLED_REPORT_RUN_ID = '00000000-0000-0000-0000-000000000910';
export const CONTROLLED_GLOBAL_REPORT_ID =
  '00000000-0000-0000-0000-000000000920';
const CONTROLLED_GOVERNANCE_TIME = '2030-01-15T11:57:00.000Z';

export interface ControlledGlobalReportPresentation {
  cleanup: () => Promise<void>;
  reportId: string;
}

export interface ControlledFeedbackGovernance {
  activationRequests: () => readonly ActivateModelRouteRequest[];
  activationReceipt: () => ModelRouteActivationReceiptView | null;
  cleanup: () => Promise<void>;
  issueRequests: () => readonly IssuePromotionPermitRequest[];
}

export interface ControlledLinkedRollbackPresentation {
  cleanup: () => Promise<void>;
}

export interface ControlledReportRun {
  cleanup: () => Promise<void>;
  requests: () => readonly RunReportRequest[];
}

function hash(seed: string) {
  return `blake3:${seed.repeat(64).slice(0, 64)}`;
}

function envelope<T>(data: T): ApiEnvelope<T> {
  return { code: 200, data, message: 'ok' };
}

async function fulfill<T>(route: Route, data: T, status = 200) {
  await route.fulfill({
    contentType: 'application/json',
    json: envelope(data),
    status,
  });
}

function requestBody<T>(route: Route): T {
  const body = route.request().postDataJSON();
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError(
      `controlled ${route.request().method()} ${route.request().url()} requires an object body`,
    );
  }
  return body as T;
}

function permitFrom(
  cycle: FeedbackCycleView,
  request: IssuePromotionPermitRequest,
): PromotionPermitView {
  if (
    request.feedback_cycle_id !== cycle.feedback_cycle_id ||
    ![300, 900, 1800, 3600].includes(request.ttl_secs) ||
    request.reason_code !== 'operator_authorized' ||
    request.note.trim().length < 4 ||
    request.idempotency_key.trim() === ''
  ) {
    throw new TypeError('controlled permit request violated the UI contract');
  }
  const observedAt = new Date(CONTROLLED_GOVERNANCE_TIME);
  const expiresAt = new Date(observedAt.getTime() + request.ttl_secs * 1000);
  return {
    allowed_runtime_modes: ['report_only'],
    candidate_manifest_hash: hash('a'),
    candidate_manifest_id: '00000000-0000-0000-0000-000000000904',
    candidate_model_version_id: CONTROLLED_CANDIDATE_MODEL_ID,
    category: cycle.profile_ref.id.includes('weather') ? 'weather' : 'crypto',
    champion_model_version_id: cycle.champion_model_version_id,
    champion_serving_contract_hash: cycle.champion_serving_contract_hash,
    expected_decision_policy_snapshot_id:
      '00000000-0000-0000-0000-000000000905',
    expected_policy_generation: 7,
    expected_runtime_control_revision: 13,
    expected_snapshot_hash: hash('b'),
    expected_route_generation: cycle.route_generation + 1,
    expires_at: expiresAt.toISOString(),
    feedback_cycle_id: cycle.feedback_cycle_id,
    idempotency_key: request.idempotency_key,
    issuance_hash: hash('c'),
    issuance_reason: request.note,
    issued_at: observedAt.toISOString(),
    issued_by_role: 'admin',
    issued_by_user_id: '00000000-0000-0000-0000-000000000906',
    issued_by_username: 'admin',
    non_route_policy_hash: hash('d'),
    observed_at: observedAt.toISOString(),
    preflight_hash: hash('e'),
    profile_ref: cycle.profile_ref,
    promotion_gate_hash: hash('f'),
    promotion_permit_id: CONTROLLED_PROMOTION_PERMIT_ID,
    research_profile_artifact_id: cycle.research_profile_artifact_id,
    revision: 0,
    revocation_reason: null,
    revoked_at: null,
    revoked_by_role: null,
    revoked_by_user_id: null,
    revoked_by_username: null,
    scope_hash: hash('1'),
    serving_constraints_hash: hash('2'),
    status: 'active',
    updated_at: observedAt.toISOString(),
  };
}

function receiptFrom(
  permit: PromotionPermitView,
  request: ActivateModelRouteRequest,
): ModelRouteActivationReceiptView {
  if (
    request.promotion_permit_id !== permit.promotion_permit_id ||
    request.feedback_cycle_id !== permit.feedback_cycle_id ||
    request.expected_policy_generation !== permit.expected_policy_generation ||
    request.expected_runtime_control_revision !==
      permit.expected_runtime_control_revision ||
    request.reason_code !== 'operator_activated' ||
    request.note.trim().length < 4 ||
    request.idempotency_key.trim() === ''
  ) {
    throw new TypeError(
      'controlled activation request violated the UI contract',
    );
  }
  const route = permit.category === 'weather' ? 'weather' : 'crypto';
  return {
    activated_by_role: 'admin',
    activated_by_user_id: '00000000-0000-0000-0000-000000000906',
    activated_by_username: 'admin',
    activated_model_routing_revision_id: '00000000-0000-0000-0000-000000000911',
    activated_model_version_id: permit.candidate_model_version_id,
    activated_route_generation: permit.expected_route_generation + 1,
    audit_event_id: '00000000-0000-0000-0000-000000000907',
    execution_authority_unchanged: true,
    feedback_cycle_id: permit.feedback_cycle_id,
    model_governance_audit_id: '00000000-0000-0000-0000-000000000908',
    outbox_event_id: '00000000-0000-0000-0000-000000000907',
    permit_issued_by_role: permit.issued_by_role,
    permit_issued_by_user_id: permit.issued_by_user_id,
    permit_issued_by_username: permit.issued_by_username,
    policy_activation_id: '00000000-0000-0000-0000-000000000909',
    previous_model_version_id: permit.champion_model_version_id,
    previous_route_generation: permit.expected_route_generation,
    promotion_permit_id: permit.promotion_permit_id,
    rollback_target: {
      activated_model_version_id: permit.candidate_model_version_id,
      restored_model_version_id: permit.champion_model_version_id,
      rollback_target_revision_hash: hash('4'),
      rollback_target_revision_id: '00000000-0000-0000-0000-000000000912',
      route,
      shadow_cleared: true,
    },
    route,
    server_timestamp: CONTROLLED_GOVERNANCE_TIME,
    transaction_hash: hash('3'),
  };
}

function reportRunFrom(request: RunReportRequest): ReportRunView {
  const requestedAt = new Date().toISOString();
  return {
    decision_at: null,
    decision_policy_snapshot_id: null,
    error_code: null,
    error_summary: null,
    finished_at: null,
    heartbeat_at: null,
    knowledge_lag_secs: request.knowledge_lag_secs ?? null,
    lease_expires_at: null,
    lease_owner: null,
    output_report_id: null,
    report_run_id: CONTROLLED_REPORT_RUN_ID,
    request_id: request.request_id,
    requested_at: requestedAt,
    retry_of_run_id: null,
    schedule_id: null,
    scheduled_for: null,
    started_at: null,
    status: 'queued',
    terminal_reason: null,
    top_n: request.top_n ?? null,
    trigger_key: `ad_hoc:${request.request_id}`,
    trigger_kind: 'ad_hoc',
  };
}

function linkedRoutingRevision(
  source: PolicyRevisionView,
  receipt: ModelRouteActivationReceiptView,
  kind: 'activated' | 'rollback',
): PolicyRevisionView {
  const revision = structuredClone(source);
  if (revision.document.resource_kind !== 'model_routing') {
    throw new TypeError('controlled linked rollback requires model routing');
  }
  const routing = revision.document.document as ModelRouting;
  const binding = routing.model.buy_routes[receipt.route];
  if (!binding) {
    throw new TypeError('controlled linked rollback route is missing');
  }

  const activated = kind === 'activated';
  revision.policy_revision_id = activated
    ? receipt.activated_model_routing_revision_id
    : receipt.rollback_target.rollback_target_revision_id;
  revision.revision_hash = activated
    ? hash('5')
    : receipt.rollback_target.rollback_target_revision_hash;
  binding.champion = {
    ...binding.champion,
    bound_at: receipt.server_timestamp,
    generation: activated
      ? receipt.activated_route_generation
      : receipt.previous_route_generation,
    model_version_id: activated
      ? receipt.rollback_target.activated_model_version_id
      : receipt.rollback_target.restored_model_version_id,
    source: activated
      ? {
          feedback_cycle_id: receipt.feedback_cycle_id,
          source_kind: 'feedback',
        }
      : binding.champion.source,
  };
  // Rust omits this serde field when it is None. Keep it absent so the UI
  // contract covers the production wire shape rather than only explicit null.
  delete binding.shadow;
  return revision;
}

/**
 * Present exact activation/rollback revisions through production config URLs.
 * This is a UI wire contract only; backend transaction authority is exercised
 * by the full fresh-stack closure.
 */
export async function installLinkedRollbackPresentation(
  page: Page,
  source: CurrentPolicyResourceView,
  receipt: ModelRouteActivationReceiptView,
): Promise<ControlledLinkedRollbackPresentation> {
  if (!source.revision) {
    throw new TypeError(
      'controlled linked rollback requires a current revision',
    );
  }
  const activated = linkedRoutingRevision(
    source.revision,
    receipt,
    'activated',
  );
  const rollback = linkedRoutingRevision(source.revision, receipt, 'rollback');
  const current: CurrentPolicyResourceView = {
    activation: null,
    resource: 'model_routing',
    revision: activated,
  };
  const handler = async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/current')) {
      await fulfill(route, current);
      return;
    }
    if (pathname.endsWith('/revisions')) {
      await fulfill(route, [activated, rollback]);
      return;
    }
    if (pathname.endsWith(`/${activated.policy_revision_id}`)) {
      await fulfill(route, activated);
      return;
    }
    if (pathname.endsWith(`/${rollback.policy_revision_id}`)) {
      await fulfill(route, rollback);
      return;
    }
    await route.fallback();
  };

  await page.route(MODEL_ROUTING_PRESENTATION_ROUTE, handler);
  return {
    async cleanup() {
      await page.unroute(MODEL_ROUTING_PRESENTATION_ROUTE, handler);
    },
  };
}

/**
 * Exercise the browser's governed workflow with exact production wire shapes.
 * PostgreSQL transaction authority remains covered by backend contract tests.
 */
export async function installFeedbackGovernanceFlow(
  page: Page,
  cycle: FeedbackCycleView,
): Promise<ControlledFeedbackGovernance> {
  const issueRequests: IssuePromotionPermitRequest[] = [];
  const activationRequests: ActivateModelRouteRequest[] = [];
  let permit: null | PromotionPermitView = null;
  let receipt: ModelRouteActivationReceiptView | null = null;

  const permitHandler = async (route: Route) => {
    if (route.request().method() === 'GET') {
      const items = permit === null ? [] : [permit];
      const pageData: Paginated<PromotionPermitView> = {
        has_next: false,
        items,
        page: 1,
        size: 20,
        total: items.length,
      };
      await fulfill(route, pageData);
      return;
    }
    if (route.request().method() === 'POST') {
      const request = requestBody<IssuePromotionPermitRequest>(route);
      issueRequests.push(request);
      permit = permitFrom(cycle, request);
      const mutation: PromotionPermitMutationView = {
        permit,
        replayed: false,
      };
      await fulfill(route, mutation, 201);
      return;
    }
    await route.fallback();
  };

  const activationHandler = async (route: Route) => {
    if (route.request().method() === 'GET' && receipt !== null) {
      await fulfill(route, receipt);
      return;
    }
    if (route.request().method() !== 'POST' || permit === null) {
      await route.fallback();
      return;
    }
    const request = requestBody<ActivateModelRouteRequest>(route);
    activationRequests.push(request);
    receipt = receiptFrom(permit, request);
    const mutation: ModelRouteActivationMutationView = {
      receipt,
      replayed: false,
    };
    await fulfill(route, mutation, 201);
  };

  await Promise.all([
    page.route(PERMITS_ROUTE, permitHandler),
    page.route(ACTIVATIONS_ROUTE, activationHandler),
  ]);
  return {
    activationRequests: () => activationRequests,
    activationReceipt: () => receipt,
    async cleanup() {
      await Promise.all([
        page.unroute(PERMITS_ROUTE, permitHandler),
        page.unroute(ACTIVATIONS_ROUTE, activationHandler),
      ]);
    },
    issueRequests: () => issueRequests,
  };
}

/** Exercise report parameter and governed-action wire contracts without a run. */
export async function installReportRunFlow(
  page: Page,
): Promise<ControlledReportRun> {
  const requests: RunReportRequest[] = [];
  let reportRun: null | ReportRunView = null;
  const runHandler = async (route: Route) => {
    const request = requestBody<RunReportRequest>(route);
    const actingRole = route.request().headers()['x-acting-role'];
    if (
      request.reason.trim().length < 4 ||
      request.request_id.trim() === '' ||
      request.top_n !== 10 ||
      request.knowledge_lag_secs !== 0 ||
      !actingRole
    ) {
      throw new TypeError('controlled report run violated the UI contract');
    }
    requests.push(request);
    reportRun = reportRunFrom(request);
    await fulfill(route, reportRun, 202);
  };
  const detailHandler = async (route: Route) => {
    if (reportRun === null) {
      throw new TypeError(
        'controlled report run detail was read before enqueue',
      );
    }
    await fulfill(route, reportRun);
  };
  await Promise.all([
    page.route(REPORT_RUN_ROUTE, runHandler),
    page.route(REPORT_RUN_DETAIL_ROUTE, detailHandler),
  ]);
  return {
    async cleanup() {
      await Promise.all([
        page.unroute(REPORT_RUN_ROUTE, runHandler),
        page.unroute(REPORT_RUN_DETAIL_ROUTE, detailHandler),
      ]);
    },
    requests: () => requests,
  };
}

/**
 * Project a real seeded report DTO into deterministic mixed-Route UI evidence.
 * This is a presentation-only contract: the production closure remains the
 * authority for portfolio construction, persistence, and N-to-N+1 semantics.
 */
export async function installGlobalReportPresentation(
  page: Page,
  sourceReport: QuantReportDetailView,
  sourceRecommendations: QuantRecommendationView[],
): Promise<ControlledGlobalReportPresentation> {
  const sourceRecommendation = sourceRecommendations[0];
  if (!sourceRecommendation) {
    throw new TypeError(
      'controlled global report requires one real seeded recommendation DTO',
    );
  }
  const report = structuredClone(sourceReport);
  const portfolioPlanId = '00000000-0000-0000-0000-000000000921';
  const routeRunIds = {
    crypto: '00000000-0000-0000-0000-000000000922',
    weather: '00000000-0000-0000-0000-000000000923',
  } as const;
  report.recommendation_report_id = CONTROLLED_GLOBAL_REPORT_ID;
  report.portfolio_plan_id = portfolioPlanId;
  report.status = 'published';
  report.status_reason = null;
  report.represented_routes = {
    digest: hash('5'),
    routes: ['crypto', 'weather'],
  };
  report.portfolio_decision = {
    outcome: 'optimized',
    plan: {
      constraints: {
        available_cash_used_usd: '200.00',
        checked_constraint_count: 846,
        evidence_hash: hash('6'),
        maximum_scenario_loss_usd: '18.50',
        open_capital_usd: '200.00',
        selected_recommendation_count: 2,
      },
      content_hash: hash('7'),
      exact_verification: {
        passed: true,
        recomputed_economics_hash: hash('8'),
        selected_tier_digest: hash('9'),
      },
      objectives: {
        capital_occupancy_usd_hours: '1850.00',
        cvar_usd: '12.25',
        nominal_expected_net_usd: '31.40',
        robust_expected_net_usd: '24.80',
        stable_tie_break_stages: 3,
      },
      portfolio_plan_id: portfolioPlanId,
      selected_tier_ids: [
        '00000000-0000-0000-0000-000000000924',
        '00000000-0000-0000-0000-000000000925',
      ],
      solver: {
        backend: 'highs',
        bound_scale_exponent: -23,
        coefficient_scale: 1_000_000,
        configured_deadline_secs: 30,
        deterministic_threads: 1,
        lexicographic_model_build_count: 1,
        lexicographic_solve_count: 6,
        lexicographic_warm_start_count: 5,
        marginal_model_build_count: 1,
        marginal_model_reuse_count: 1,
        marginal_solve_count: 2,
        optimal: true,
        tie_break_proof_count: 3,
      },
    },
  };
  report.summary = {
    candidate_count: 10,
    capital_occupancy_usd_hours: '1850.00',
    category_allocation: { crypto: '110.00', weather: '90.00' },
    cvar_usd: '12.25',
    data_quality_summary: {
      acceptable_count: 0,
      degraded_count: 0,
      fresh_count: 10,
      insufficient_count: 0,
      stale_count: 0,
    },
    empty_reason: null,
    event_allocation: {
      'controlled-crypto-event': '110.00',
      'controlled-weather-event': '90.00',
    },
    execution_eligibility_summary: {
      eligible_auto_execution: 0,
      eligible_report_only: 2,
      eligible_semi_auto: 0,
    },
    market_selection_count: 10,
    max_single_recommendation_usd: '110.00',
    maximum_scenario_loss_usd: '18.50',
    nominal_expected_net_usd: '31.40',
    published_recommendation_count: 2,
    rejected_tier_count: 8,
    represented_route_count: 2,
    robust_expected_net_usd: '24.80',
    route_allocation: { crypto: '110.00', weather: '90.00' },
    top_rejection_reasons: [
      { count: 8, reason: 'not_selected_by_global_optimum' },
    ],
    total_suggested_usd: '200.00',
    warnings: [],
  };
  report.fact_delivery = {
    announced_at: sourceReport.published_at,
    attempt_count: 1,
    bundle_hash: hash('a'),
    funnel_row_chain_hash: hash('b'),
    funnel_row_count: 10,
    last_error: null,
    next_attempt_at: null,
    recommendation_row_chain_hash: hash('c'),
    recommendation_row_count: 2,
    status: 'verified',
    verified_at: sourceReport.published_at,
  };

  const recommendations = (['crypto', 'weather'] as const).map(
    (routeName, index) => {
      const recommendation = structuredClone(sourceRecommendation);
      const ordinal = index + 1;
      recommendation.recommendation_id = `00000000-0000-0000-0000-00000000093${ordinal}`;
      recommendation.recommendation_report_id = CONTROLLED_GLOBAL_REPORT_ID;
      recommendation.report_route_run_id = routeRunIds[routeName];
      recommendation.portfolio_plan_id = portfolioPlanId;
      recommendation.rank = ordinal;
      recommendation.route = routeName;
      recommendation.identity.category = routeName;
      recommendation.identity.question =
        routeName === 'crypto'
          ? 'Will the controlled crypto market settle Yes?'
          : 'Will the controlled weather market settle Yes?';
      recommendation.market_id = `controlled-${routeName}-market`;
      recommendation.event_id = `controlled-${routeName}-event`;
      recommendation.economic_tier.report_route_run_id = routeRunIds[routeName];
      recommendation.economic_tier.route = routeName;
      recommendation.economic_tier.category = routeName;
      recommendation.economic_tier.market_id = recommendation.market_id;
      recommendation.economic_tier.event_id = recommendation.event_id;
      recommendation.trade_plan.sizing.suggested_usd =
        routeName === 'crypto' ? '110.00' : '90.00';
      recommendation.report_status = 'published';
      return recommendation;
    },
  );

  const evidence = {
    decision_capture_count: 10,
    evidence_complete: true,
    feature_cell_count: 120,
    feature_state_counts: { observed: 120 },
    feature_vector_count: 10,
    model_input_count: 10,
    model_input_state_counts: { observed: 10 },
    model_route: null,
    selection_count: 10,
    stage_ceiling: 'prediction',
  } as const;
  const diagnostics: QuantReportDiagnosticsView = {
    decision_boundary: {
      decision_at: report.decision_at,
      knowledge_cutoff: report.decision_at,
      per_source_cutoffs: { clob_l2: report.decision_at },
    },
    global: evidence,
    routes: (['crypto', 'weather'] as const).map((routeName, index) => ({
      evidence: {
        ...evidence,
        model_route: {
          input_contract_hash: hash(`${index + 1}`),
          model_family: 'weighted_scorer',
          model_run_id: `00000000-0000-0000-0000-00000000094${index + 1}`,
          model_version_id: `00000000-0000-0000-0000-00000000095${index + 1}`,
          training_input_hash: hash(`${index + 3}`),
          transform_hash: hash(`${index + 5}`),
        },
        selection_count: 5,
      },
      funnel: {
        admitted_economic_tiers: 5,
        calibrated_candidates: 5,
        eligible_markets: 5,
        feature_complete_markets: 5,
        selected_recommendations: 1,
      },
      lineage: {
        calibration_artifact_id: `00000000-0000-0000-0000-00000000096${index + 1}`,
        feature_contract_digest: hash(`${index + 7}`),
        model_run_id: `00000000-0000-0000-0000-00000000094${index + 1}`,
        model_version_id: `00000000-0000-0000-0000-00000000095${index + 1}`,
        pit_lineage_digest: hash(`${index + 9}`),
        prediction_horizon_secs: 86_400,
        research_profile_artifact_id: `00000000-0000-0000-0000-00000000097${index + 1}`,
        research_profile_ref: {
          content_hash: hash(`${index + 2}`),
          id: `buy.${routeName}.default`,
          version: 1,
        },
        serving_contract_digest: hash(`${index + 4}`),
        trade_policy_artifact_id: `00000000-0000-0000-0000-00000000098${index + 1}`,
      },
      outcome: 'ready',
      report_route_run_id: routeRunIds[routeName],
      route: routeName,
    })),
  };

  const routePattern = new RegExp(
    String.raw`/api/quant/reports/${CONTROLLED_GLOBAL_REPORT_ID}(?:/(recommendations|diagnostics))?(?:\?.*)?$`,
  );
  const handler = async (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/recommendations')) {
      await fulfill(route, recommendations);
      return;
    }
    if (pathname.endsWith('/diagnostics')) {
      await fulfill(route, diagnostics);
      return;
    }
    await fulfill(route, report);
  };
  await page.route(routePattern, handler);
  return {
    async cleanup() {
      await page.unroute(routePattern, handler);
    },
    reportId: CONTROLLED_GLOBAL_REPORT_ID,
  };
}
