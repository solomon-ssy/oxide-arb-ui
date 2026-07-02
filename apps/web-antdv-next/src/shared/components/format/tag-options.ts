import {
  APPROVAL_STATUSES,
  EXECUTION_ORDER_PHASES,
  EXECUTION_ORDER_STATES,
  KILL_SWITCH_STATES,
  MARKET_CATEGORIES,
  MARKET_STATUSES,
  MATERIALIZATION_RUN_STATUSES,
  OPERATION_CATEGORIES,
  OPERATION_OUTCOMES,
  ORDER_INTENT_KINDS,
  ORDER_INTENT_STATUSES,
  POSITION_LEDGER_STATES,
  PUBLICATION_STATUSES,
  QUANT_RUNTIME_MODES,
  RECOMMENDATION_REPORT_STATUSES,
  RECOMMENDATION_STATUSES,
  RECONCILIATION_RESULTS,
  RESOURCE_TYPES,
  RUNTIME_CONFIG_ACTIVATION_KINDS,
  RUNTIME_CONFIG_VERSION_SOURCES,
  SETTLEMENT_REDEEM_STATES,
  SIDES,
} from '@vben/types';

import { $t } from '#/locales';

export interface ColoredTagOption {
  color: string;
  label: string;
  value: string;
}

function buildTagOptions(
  values: readonly string[],
  labelKey: (value: string) => string,
  colors: Record<string, string>,
): ColoredTagOption[] {
  return values.map((value) => ({
    color: colors[value] ?? 'default',
    label: labelKey(value),
    value,
  }));
}

/** Resolve a colored tag option for detail panels and one-off renders. */
export function findTagOption(
  options: ColoredTagOption[],
  value: null | string | undefined,
): ColoredTagOption | undefined {
  if (!value) {
    return undefined;
  }
  return options.find((item) => item.value === value);
}

/** Operation log outcome tags with semantic colors. */
export function useOperationOutcomeTagOptions() {
  return buildTagOptions(
    Object.values(OPERATION_OUTCOMES),
    (value) => $t(`enum.operationOutcome.${value}`),
    {
      [OPERATION_OUTCOMES.denied]: 'warning',
      [OPERATION_OUTCOMES.failure]: 'error',
      [OPERATION_OUTCOMES.success]: 'success',
    },
  );
}

/** Operation log category tags. */
export function useOperationCategoryTagOptions() {
  return buildTagOptions(
    Object.values(OPERATION_CATEGORIES),
    (value) => $t(`enum.operationCategory.${value}`),
    {
      [OPERATION_CATEGORIES.auth]: 'default',
      [OPERATION_CATEGORIES.governance]: 'purple',
      [OPERATION_CATEGORIES.market]: 'cyan',
      [OPERATION_CATEGORIES.other]: 'default',
      [OPERATION_CATEGORIES.rbac]: 'geekblue',
      [OPERATION_CATEGORIES.runtimeConfig]: 'orange',
      [OPERATION_CATEGORIES.system]: 'processing',
    },
  );
}

/** Tag color map for rows keyed by actor role. */
export const ACTING_ROLE_COLORS: Record<string, string> = {
  admin: 'magenta',
  analyst: 'blue',
  emergency_operator: 'red',
  operator: 'processing',
  risk_owner: 'gold',
  super_admin: 'magenta',
  system: 'default',
  viewer: 'default',
};

/** Acting role tags shared by audit chain and operation log. */
export function useActingRoleTagOptions() {
  return buildTagOptions(
    Object.keys(ACTING_ROLE_COLORS),
    (value) => value,
    ACTING_ROLE_COLORS,
  );
}

/** Operation log resource type tags. */
export function useResourceTypeTagOptions() {
  return buildTagOptions(
    Object.values(RESOURCE_TYPES),
    (value) => $t(`enum.resourceType.${value}`),
    {
      [RESOURCE_TYPES.accountSnapshot]: 'gold',
      [RESOURCE_TYPES.equitySnapshot]: 'gold',
      [RESOURCE_TYPES.executionOrder]: 'blue',
      [RESOURCE_TYPES.factorDefinition]: 'geekblue',
      [RESOURCE_TYPES.market]: 'cyan',
      [RESOURCE_TYPES.materialization]: 'geekblue',
      [RESOURCE_TYPES.menu]: 'default',
      [RESOURCE_TYPES.operationLog]: 'default',
      [RESOURCE_TYPES.orderIntent]: 'processing',
      [RESOURCE_TYPES.permission]: 'default',
      [RESOURCE_TYPES.position]: 'blue',
      [RESOURCE_TYPES.publication]: 'purple',
      [RESOURCE_TYPES.quantReport]: 'success',
      [RESOURCE_TYPES.recommendationAttribution]: 'cyan',
      [RESOURCE_TYPES.reconciliation]: 'warning',
      [RESOURCE_TYPES.replay]: 'geekblue',
      [RESOURCE_TYPES.role]: 'default',
      [RESOURCE_TYPES.runtimeConfig]: 'orange',
      [RESOURCE_TYPES.settlementRedeem]: 'gold',
      [RESOURCE_TYPES.system]: 'default',
      [RESOURCE_TYPES.user]: 'processing',
    },
  );
}

/** Runtime config activation kind tags. */
export function useRuntimeConfigActivationKindTagOptions() {
  return buildTagOptions(
    Object.values(RUNTIME_CONFIG_ACTIVATION_KINDS),
    (value) => $t(`enum.runtimeConfigActivationKind.${value}`),
    {
      [RUNTIME_CONFIG_ACTIVATION_KINDS.initial]: 'processing',
      [RUNTIME_CONFIG_ACTIVATION_KINDS.promote]: 'success',
      [RUNTIME_CONFIG_ACTIVATION_KINDS.rollback]: 'warning',
    },
  );
}

/** Runtime config version source tags. */
export function useRuntimeConfigVersionSourceTagOptions() {
  return buildTagOptions(
    Object.values(RUNTIME_CONFIG_VERSION_SOURCES),
    (value) => $t(`enum.runtimeConfigVersionSource.${value}`),
    {
      [RUNTIME_CONFIG_VERSION_SOURCES.bootstrap]: 'default',
      [RUNTIME_CONFIG_VERSION_SOURCES.import]: 'cyan',
      [RUNTIME_CONFIG_VERSION_SOURCES.operator]: 'processing',
    },
  );
}

// ── Quant domain status tags ─────────────────────────────────────────────────
// Escalating automation/restriction risk maps to escalating tag severity.

/** Quant runtime mode tags (escalating automation risk). */
export function useQuantRuntimeModeTagOptions() {
  return buildTagOptions(
    Object.values(QUANT_RUNTIME_MODES),
    (value) => $t(`enum.quantRuntimeMode.${value}`),
    {
      [QUANT_RUNTIME_MODES.autoExecution]: 'error',
      [QUANT_RUNTIME_MODES.reportOnly]: 'processing',
      [QUANT_RUNTIME_MODES.semiAuto]: 'warning',
    },
  );
}

/** Kill-switch state tags (escalating restriction severity). */
export function useKillSwitchStateTagOptions() {
  return buildTagOptions(
    Object.values(KILL_SWITCH_STATES),
    (value) => $t(`enum.killSwitchState.${value}`),
    {
      [KILL_SWITCH_STATES.closed]: 'success',
      [KILL_SWITCH_STATES.emergencyHalted]: 'magenta',
      [KILL_SWITCH_STATES.executionHalted]: 'error',
      [KILL_SWITCH_STATES.exitOnly]: 'warning',
      [KILL_SWITCH_STATES.reportOnlyForced]: 'gold',
    },
  );
}

/** Recommendation report status tags. */
export function useRecommendationReportStatusTagOptions() {
  return buildTagOptions(
    Object.values(RECOMMENDATION_REPORT_STATUSES),
    (value) => $t(`enum.recommendationReportStatus.${value}`),
    {
      [RECOMMENDATION_REPORT_STATUSES.building]: 'processing',
      [RECOMMENDATION_REPORT_STATUSES.expired]: 'default',
      [RECOMMENDATION_REPORT_STATUSES.failed]: 'error',
      [RECOMMENDATION_REPORT_STATUSES.published]: 'success',
      [RECOMMENDATION_REPORT_STATUSES.publishedEmpty]: 'default',
      [RECOMMENDATION_REPORT_STATUSES.revoked]: 'warning',
    },
  );
}

/** Recommendation lifecycle status tags. */
export function useRecommendationStatusTagOptions() {
  return buildTagOptions(
    Object.values(RECOMMENDATION_STATUSES),
    (value) => $t(`enum.recommendationStatus.${value}`),
    {
      [RECOMMENDATION_STATUSES.attributed]: 'cyan',
      [RECOMMENDATION_STATUSES.executed]: 'success',
      [RECOMMENDATION_STATUSES.expired]: 'default',
      [RECOMMENDATION_STATUSES.intentCreated]: 'processing',
      [RECOMMENDATION_STATUSES.published]: 'blue',
      [RECOMMENDATION_STATUSES.revoked]: 'warning',
    },
  );
}

/** Order-intent lifecycle status tags. */
export function useOrderIntentStatusTagOptions() {
  return buildTagOptions(
    Object.values(ORDER_INTENT_STATUSES),
    (value) => $t(`enum.orderIntentStatus.${value}`),
    {
      [ORDER_INTENT_STATUSES.admissionPending]: 'processing',
      [ORDER_INTENT_STATUSES.admissionRejected]: 'error',
      [ORDER_INTENT_STATUSES.approved]: 'success',
      [ORDER_INTENT_STATUSES.approvedByPolicy]: 'success',
      [ORDER_INTENT_STATUSES.cancelled]: 'default',
      [ORDER_INTENT_STATUSES.draft]: 'default',
      [ORDER_INTENT_STATUSES.expired]: 'default',
      [ORDER_INTENT_STATUSES.failed]: 'error',
      [ORDER_INTENT_STATUSES.filled]: 'success',
      [ORDER_INTENT_STATUSES.invalidated]: 'error',
      [ORDER_INTENT_STATUSES.partiallyFilled]: 'cyan',
      [ORDER_INTENT_STATUSES.pendingApproval]: 'warning',
      [ORDER_INTENT_STATUSES.rejected]: 'error',
      [ORDER_INTENT_STATUSES.submitted]: 'processing',
    },
  );
}

/** Intent approval status tags. */
export function useApprovalStatusTagOptions() {
  return buildTagOptions(
    Object.values(APPROVAL_STATUSES),
    (value) => $t(`enum.approvalStatus.${value}`),
    {
      [APPROVAL_STATUSES.approved]: 'success',
      [APPROVAL_STATUSES.expired]: 'default',
      [APPROVAL_STATUSES.notRequired]: 'default',
      [APPROVAL_STATUSES.pending]: 'warning',
      [APPROVAL_STATUSES.rejected]: 'error',
    },
  );
}

/** CLOB execution-order state tags. */
export function useExecutionOrderStateTagOptions() {
  return buildTagOptions(
    Object.values(EXECUTION_ORDER_STATES),
    (value) => $t(`enum.executionOrderState.${value}`),
    {
      [EXECUTION_ORDER_STATES.accepted]: 'processing',
      [EXECUTION_ORDER_STATES.ambiguous]: 'warning',
      [EXECUTION_ORDER_STATES.cancelled]: 'default',
      [EXECUTION_ORDER_STATES.cancelRequested]: 'warning',
      [EXECUTION_ORDER_STATES.failed]: 'error',
      [EXECUTION_ORDER_STATES.filled]: 'success',
      [EXECUTION_ORDER_STATES.partiallyFilled]: 'cyan',
      [EXECUTION_ORDER_STATES.planned]: 'default',
      [EXECUTION_ORDER_STATES.submitted]: 'processing',
    },
  );
}

/** Execution-order phase tags (entry vs exit leg). */
export function useExecutionOrderPhaseTagOptions() {
  return buildTagOptions(
    Object.values(EXECUTION_ORDER_PHASES),
    (value) => $t(`enum.executionOrderPhase.${value}`),
    {
      [EXECUTION_ORDER_PHASES.entry]: 'blue',
      [EXECUTION_ORDER_PHASES.exit]: 'purple',
    },
  );
}

/** Position ledger state tags. */
export function usePositionLedgerStateTagOptions() {
  return buildTagOptions(
    Object.values(POSITION_LEDGER_STATES),
    (value) => $t(`enum.positionLedgerState.${value}`),
    {
      [POSITION_LEDGER_STATES.closed]: 'default',
      [POSITION_LEDGER_STATES.closing]: 'warning',
      [POSITION_LEDGER_STATES.open]: 'processing',
      [POSITION_LEDGER_STATES.settled]: 'success',
    },
  );
}

/** Reconciliation result tags. */
export function useReconciliationResultTagOptions() {
  return buildTagOptions(
    Object.values(RECONCILIATION_RESULTS),
    (value) => $t(`enum.reconciliationResult.${value}`),
    {
      [RECONCILIATION_RESULTS.cancelled]: 'default',
      [RECONCILIATION_RESULTS.filled]: 'success',
      [RECONCILIATION_RESULTS.notFilled]: 'default',
      [RECONCILIATION_RESULTS.partiallyFilled]: 'cyan',
      [RECONCILIATION_RESULTS.pending]: 'warning',
      [RECONCILIATION_RESULTS.unresolvable]: 'error',
    },
  );
}

/** Settlement-redeem batch state tags. */
export function useSettlementRedeemStateTagOptions() {
  return buildTagOptions(
    Object.values(SETTLEMENT_REDEEM_STATES),
    (value) => $t(`enum.settlementRedeemState.${value}`),
    {
      [SETTLEMENT_REDEEM_STATES.confirmed]: 'success',
      [SETTLEMENT_REDEEM_STATES.failed]: 'error',
      [SETTLEMENT_REDEEM_STATES.manualRequired]: 'magenta',
      [SETTLEMENT_REDEEM_STATES.pending]: 'warning',
      [SETTLEMENT_REDEEM_STATES.submitted]: 'processing',
    },
  );
}

/** Market lifecycle status tags. */
export function useMarketStatusTagOptions() {
  return buildTagOptions(
    Object.values(MARKET_STATUSES),
    (value) => $t(`enum.marketStatus.${value}`),
    {
      [MARKET_STATUSES.active]: 'success',
      [MARKET_STATUSES.delisted]: 'error',
      [MARKET_STATUSES.discovered]: 'default',
      [MARKET_STATUSES.filtered]: 'default',
      [MARKET_STATUSES.manuallyBlocked]: 'magenta',
      [MARKET_STATUSES.paused]: 'warning',
      [MARKET_STATUSES.settled]: 'processing',
    },
  );
}

/** Market category tags for catalog tables. */
export function useMarketCategoryTagOptions() {
  return buildTagOptions(
    Object.values(MARKET_CATEGORIES),
    (value) => $t(`enum.marketCategory.${value}`),
    {
      [MARKET_CATEGORIES.crypto]: 'gold',
      [MARKET_CATEGORIES.culture]: 'purple',
      [MARKET_CATEGORIES.economics]: 'orange',
      [MARKET_CATEGORIES.finance]: 'geekblue',
      [MARKET_CATEGORIES.geopolitics]: 'magenta',
      [MARKET_CATEGORIES.other]: 'default',
      [MARKET_CATEGORIES.politics]: 'processing',
      [MARKET_CATEGORIES.sports]: 'success',
      [MARKET_CATEGORIES.tech]: 'cyan',
      [MARKET_CATEGORIES.weather]: 'blue',
    },
  );
}

/** Model / factor publication status tags. */
export function usePublicationStatusTagOptions() {
  return buildTagOptions(
    Object.values(PUBLICATION_STATUSES),
    (value) => $t(`enum.publicationStatus.${value}`),
    {
      [PUBLICATION_STATUSES.candidate]: 'processing',
      [PUBLICATION_STATUSES.draft]: 'default',
      [PUBLICATION_STATUSES.published]: 'success',
      [PUBLICATION_STATUSES.rejected]: 'error',
      [PUBLICATION_STATUSES.retired]: 'default',
      [PUBLICATION_STATUSES.shadow]: 'purple',
    },
  );
}

/** Materialization run status tags. */
export function useMaterializationRunStatusTagOptions() {
  return buildTagOptions(
    Object.values(MATERIALIZATION_RUN_STATUSES),
    (value) => $t(`enum.materializationRunStatus.${value}`),
    {
      [MATERIALIZATION_RUN_STATUSES.cancelled]: 'warning',
      [MATERIALIZATION_RUN_STATUSES.completed]: 'success',
      [MATERIALIZATION_RUN_STATUSES.failed]: 'error',
      [MATERIALIZATION_RUN_STATUSES.queued]: 'default',
      [MATERIALIZATION_RUN_STATUSES.running]: 'processing',
    },
  );
}

/** Order-intent kind tags (entry buy is the single production kind). */
export function useOrderIntentKindTagOptions() {
  return buildTagOptions(
    Object.values(ORDER_INTENT_KINDS),
    (value) => $t(`enum.orderIntentKind.${value}`),
    {
      [ORDER_INTENT_KINDS.buy]: 'blue',
    },
  );
}

/** Order side tags (Polymarket CLOB `BUY` / `SELL`). */
export function useSideTagOptions() {
  return buildTagOptions(
    Object.values(SIDES),
    (value) => $t(`enum.side.${value}`),
    {
      [SIDES.buy]: 'success',
      [SIDES.sell]: 'error',
    },
  );
}
