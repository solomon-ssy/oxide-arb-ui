import type {
  ApprovalStatus,
  EnumName,
  ExecutionOrderState,
  ExecutionOrderView,
  OrderIntentStatus,
  OrderIntentView,
  PositionLedgerState,
  PositionView,
  ReconciliationResult,
  ReconciliationView,
  SettlementCaseState,
  SettlementRedeemView,
} from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { listExecutionOrders } from '#/api/execution-orders';
import { listOrderIntents } from '#/api/order-intents';
import { listPositions } from '#/api/positions';
import { listReconciliations } from '#/api/reconciliations';
import { listSettlementRedeems } from '#/api/settlement-redeems';
import { formatDurationSecs } from '#/shared/components/format';

export type ExecutionFlowStageKey =
  | 'admission'
  | 'approval'
  | 'fill'
  | 'intent'
  | 'position'
  | 'reconciliation'
  | 'settlement'
  | 'submission';

export interface ExecutionFlowStage {
  active: boolean;
  count: number;
  duration: string;
  entity: string;
  entityId?: string;
  key: ExecutionFlowStageKey;
  labelKey: string;
  module: string;
  occurredAt?: null | string;
  route: string;
  scopeKey: string;
  status: {
    name: EnumName;
    value: null | string | undefined;
  };
  workspace: string;
}

export interface ExecutionFlowSnapshot {
  intent: null | OrderIntentView;
  intentCount: number;
  order: ExecutionOrderView | null;
  orderCount: number;
  position: null | PositionView;
  positionCount: number;
  reconciliation: null | ReconciliationView;
  reconciliationCount: number;
  settlement: null | SettlementRedeemView;
  settlementCount: number;
}

const ACTIVE_INTENT = new Set<OrderIntentStatus>([
  'approved',
  'approved_by_policy',
  'draft',
  'partially_filled',
  'pending_approval',
  'submitted',
]);
const ACTIVE_APPROVAL = new Set<ApprovalStatus>(['pending']);
const ACTIVE_ORDER = new Set<ExecutionOrderState>([
  'accepted',
  'cancel_requested',
  'partially_filled',
  'planned',
  'submitted',
]);
const ACTIVE_POSITION = new Set<PositionLedgerState>(['closing', 'open']);
const ACTIVE_RECONCILIATION = new Set<ReconciliationResult>(['pending']);
const ACTIVE_SETTLEMENT = new Set<SettlementCaseState>([
  'discovered',
  'prepared',
  'reconciliation_required',
  'retry_scheduled',
  'submitted',
]);

function durationBetween(
  start: null | string | undefined,
  end: null | string | undefined,
) {
  if (!start) return '—';
  const startMs = Date.parse(start);
  const endMs = end ? Date.parse(end) : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return '—';
  return formatDurationSecs(Math.max(0, Math.round((endMs - startMs) / 1000)));
}

function entityRoute(
  workspace: string,
  module: string,
  entity: string,
  id: null | string | undefined,
) {
  const query = new URLSearchParams({ module });
  if (id) {
    query.set('entity', entity);
    query.set('id', id);
  }
  return `${workspace}?${query.toString()}`;
}

export function buildExecutionFlowStages(
  snapshot: ExecutionFlowSnapshot,
): ExecutionFlowStage[] {
  const { intent, order, position, reconciliation, settlement } = snapshot;
  const intentId = intent?.order_intent_id;
  const orderId = order?.execution_order_id;
  const positionId = position?.position_id;
  const reconciliationId = reconciliation?.reconciliation_id;
  const settlementId = settlement?.settlement_redeem_id;

  return [
    {
      active: !!intent && ACTIVE_INTENT.has(intent.status),
      count: snapshot.intentCount,
      duration: durationBetween(intent?.created_at, intent?.updated_at),
      entity: 'order-intent',
      entityId: intentId,
      key: 'intent',
      labelKey: 'page.execution.flow.stage.intent',
      module: 'intents',
      occurredAt: intent?.created_at,
      route: entityRoute(
        '/execution/orders',
        'intents',
        'order-intent',
        intentId,
      ),
      scopeKey: 'page.execution.flow.scope.latestIntent',
      status: { name: 'OrderIntentStatus', value: intent?.status },
      workspace: '/execution/orders',
    },
    {
      active: !!intent && ACTIVE_APPROVAL.has(intent.approval_status),
      count: intent ? 1 : 0,
      duration: durationBetween(intent?.created_at, intent?.approved_at),
      entity: 'order-intent',
      entityId: intentId,
      key: 'approval',
      labelKey: 'page.execution.flow.stage.approval',
      module: 'approvals',
      occurredAt: intent?.approved_at,
      route: entityRoute(
        '/execution/orders',
        'approvals',
        'order-intent',
        intentId,
      ),
      scopeKey: 'page.execution.flow.scope.intentBound',
      status: { name: 'ApprovalStatus', value: intent?.approval_status },
      workspace: '/execution/orders',
    },
    {
      active: !!intent && ACTIVE_INTENT.has(intent.status) && !order,
      count: intent?.admission_trace_ref ? 1 : 0,
      duration: durationBetween(
        intent?.approved_at ?? intent?.created_at,
        order?.created_at ?? intent?.updated_at,
      ),
      entity: 'order-intent',
      entityId: intentId,
      key: 'admission',
      labelKey: 'page.execution.flow.stage.admission',
      module: 'intents',
      occurredAt: intent?.updated_at,
      route: entityRoute(
        '/execution/orders',
        'intents',
        'order-intent',
        intentId,
      ),
      scopeKey: 'page.execution.flow.scope.intentBound',
      status: { name: 'OrderIntentStatus', value: intent?.status },
      workspace: '/execution/orders',
    },
    {
      active: !!order && ACTIVE_ORDER.has(order.state) && !order.submitted_at,
      count: snapshot.orderCount,
      duration: durationBetween(order?.created_at, order?.submitted_at),
      entity: 'execution-order',
      entityId: orderId,
      key: 'submission',
      labelKey: 'page.execution.flow.stage.submission',
      module: 'orders',
      occurredAt: order?.submitted_at ?? order?.created_at,
      route: entityRoute(
        '/execution/orders',
        'orders',
        'execution-order',
        orderId,
      ),
      scopeKey: 'page.execution.flow.scope.intentBound',
      status: { name: 'ExecutionOrderState', value: order?.state },
      workspace: '/execution/orders',
    },
    {
      active: !!order && ACTIVE_ORDER.has(order.state) && !order.filled_at,
      count: order?.filled_at || order?.state === 'partially_filled' ? 1 : 0,
      duration: durationBetween(
        order?.submitted_at ?? order?.created_at,
        order?.filled_at ?? order?.updated_at,
      ),
      entity: 'execution-order',
      entityId: orderId,
      key: 'fill',
      labelKey: 'page.execution.flow.stage.fill',
      module: 'orders',
      occurredAt: order?.filled_at ?? order?.updated_at,
      route: entityRoute(
        '/execution/orders',
        'orders',
        'execution-order',
        orderId,
      ),
      scopeKey: 'page.execution.flow.scope.orderBound',
      status: { name: 'ExecutionOrderState', value: order?.state },
      workspace: '/execution/orders',
    },
    {
      active: !!position && ACTIVE_POSITION.has(position.state),
      count: snapshot.positionCount,
      duration: durationBetween(
        position?.opened_at,
        position?.closed_at ?? position?.updated_at,
      ),
      entity: 'position',
      entityId: positionId,
      key: 'position',
      labelKey: 'page.execution.flow.stage.position',
      module: 'positions',
      occurredAt: position?.opened_at,
      route: entityRoute(
        '/execution/portfolio',
        'positions',
        'position',
        positionId,
      ),
      scopeKey: 'page.execution.flow.scope.intentBound',
      status: { name: 'PositionLedgerState', value: position?.state },
      workspace: '/execution/portfolio',
    },
    {
      active:
        !!reconciliation && ACTIVE_RECONCILIATION.has(reconciliation.result),
      count: snapshot.reconciliationCount,
      duration: durationBetween(
        reconciliation?.created_at,
        reconciliation?.resolved_at ?? reconciliation?.updated_at,
      ),
      entity: 'reconciliation',
      entityId: reconciliationId,
      key: 'reconciliation',
      labelKey: 'page.execution.flow.stage.reconciliation',
      module: 'reconciliation',
      occurredAt: reconciliation?.created_at,
      route: entityRoute(
        '/execution/post-trade',
        'reconciliation',
        'reconciliation',
        reconciliationId,
      ),
      scopeKey: 'page.execution.flow.scope.intentBound',
      status: { name: 'ReconciliationResult', value: reconciliation?.result },
      workspace: '/execution/post-trade',
    },
    {
      active: !!settlement && ACTIVE_SETTLEMENT.has(settlement.state),
      count: snapshot.settlementCount,
      duration: durationBetween(
        settlement?.created_at,
        settlement?.confirmed_at ?? settlement?.updated_at,
      ),
      entity: 'settlement-redeem',
      entityId: settlementId,
      key: 'settlement',
      labelKey: 'page.execution.flow.stage.settlement',
      module: 'settlement',
      occurredAt: settlement?.created_at,
      route: entityRoute(
        '/execution/post-trade',
        'settlement',
        'settlement-redeem',
        settlementId,
      ),
      scopeKey: 'page.execution.flow.scope.marketBound',
      status: { name: 'SettlementCaseState', value: settlement?.state },
      workspace: '/execution/post-trade',
    },
  ];
}

export function useExecutionFlow() {
  const snapshot = ref<ExecutionFlowSnapshot>({
    intent: null,
    intentCount: 0,
    order: null,
    orderCount: 0,
    position: null,
    positionCount: 0,
    reconciliation: null,
    reconciliationCount: 0,
    settlement: null,
    settlementCount: 0,
  });
  const loading = ref(false);
  const partialError = ref(false);

  async function load() {
    loading.value = true;
    partialError.value = false;
    try {
      const intentResult = await Promise.allSettled([
        listOrderIntents({ page: 1, size: 1 }),
      ]);
      const intents =
        intentResult[0]?.status === 'fulfilled' ? intentResult[0].value : null;
      partialError.value = !intents;
      const intent = intents?.items[0] ?? null;
      const intentId = intent?.order_intent_id;

      const linkedResults = intentId
        ? await Promise.allSettled([
            listExecutionOrders({
              order_intent_id: intentId,
              page: 1,
              size: 1,
            }),
            listPositions({ order_intent_id: intentId, page: 1, size: 1 }),
            listReconciliations({
              order_intent_id: intentId,
              page: 1,
              size: 1,
            }),
          ])
        : [];
      partialError.value ||= linkedResults.some(
        (result) => result.status === 'rejected',
      );
      const orders =
        linkedResults[0]?.status === 'fulfilled'
          ? linkedResults[0].value
          : null;
      const positions =
        linkedResults[1]?.status === 'fulfilled'
          ? linkedResults[1].value
          : null;
      const reconciliations =
        linkedResults[2]?.status === 'fulfilled'
          ? linkedResults[2].value
          : null;
      const order = orders?.items[0] ?? null;
      const position = positions?.items[0] ?? null;
      const marketId = position?.market_id ?? order?.market_id;

      const settlementResult = marketId
        ? await Promise.allSettled([
            listSettlementRedeems({ market_id: marketId, page: 1, size: 1 }),
          ])
        : [];
      partialError.value ||= settlementResult.some(
        (result) => result.status === 'rejected',
      );
      const settlements =
        settlementResult[0]?.status === 'fulfilled'
          ? settlementResult[0].value
          : null;

      snapshot.value = {
        intent,
        intentCount: intents?.total ?? 0,
        order,
        orderCount: orders?.total ?? 0,
        position,
        positionCount: positions?.total ?? 0,
        reconciliation: reconciliations?.items[0] ?? null,
        reconciliationCount: reconciliations?.total ?? 0,
        settlement: settlements?.items[0] ?? null,
        settlementCount: settlements?.total ?? 0,
      };
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => void load());

  return {
    load,
    loading,
    partialError,
    stages: computed(() => buildExecutionFlowStages(snapshot.value)),
  };
}
