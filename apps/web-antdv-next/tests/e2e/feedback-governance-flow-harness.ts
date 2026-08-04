import type { Page, Route } from 'playwright/test';

import type {
  ActivateModelRouteRequest,
  ApiEnvelope,
  FeedbackCycleView,
  IssuePromotionPermitRequest,
  ModelRouteActivationReceiptView,
  Paginated,
  PromotionPermitMutationView,
  PromotionPermitView,
} from '@vben/types';

const ACTIVATIONS_ROUTE = /\/api\/research\/model-route-activations$/;
const PERMITS_ROUTE =
  /\/api\/research\/model-route-activation-permits(?:\?.*)?$/;

export const CONTROLLED_CANDIDATE_MODEL_ID =
  '00000000-0000-0000-0000-000000000902';
export const CONTROLLED_PROMOTION_PERMIT_ID =
  '00000000-0000-0000-0000-000000000903';

export interface ControlledFeedbackGovernance {
  activationRequests: () => readonly ActivateModelRouteRequest[];
  cleanup: () => Promise<void>;
  issueRequests: () => readonly IssuePromotionPermitRequest[];
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
  const observedAt = new Date();
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
  return {
    activated_by_role: 'admin',
    activated_by_user_id: '00000000-0000-0000-0000-000000000906',
    activated_by_username: 'admin',
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
    replayed: false,
    server_timestamp: new Date().toISOString(),
    transaction_hash: hash('3'),
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
    if (route.request().method() !== 'POST' || permit === null) {
      await route.fallback();
      return;
    }
    const request = requestBody<ActivateModelRouteRequest>(route);
    activationRequests.push(request);
    await fulfill(route, receiptFrom(permit, request), 201);
  };

  await Promise.all([
    page.route(PERMITS_ROUTE, permitHandler),
    page.route(ACTIVATIONS_ROUTE, activationHandler),
  ]);
  return {
    activationRequests: () => activationRequests,
    async cleanup() {
      await Promise.all([
        page.unroute(PERMITS_ROUTE, permitHandler),
        page.unroute(ACTIVATIONS_ROUTE, activationHandler),
      ]);
    },
    issueRequests: () => issueRequests,
  };
}
