import {
  APPROVAL_STATUSES,
  EXECUTION_ORDER_PHASES,
  EXECUTION_ORDER_STATES,
  FACTOR_DEFINITION_SCOPES,
  FACTOR_DIRECTIONS,
  FACTOR_FAMILIES,
  KILL_SWITCH_STATES,
  MARKET_CATEGORIES,
  MARKET_STATUSES,
  MATERIALIZATION_RUN_STATUSES,
  MODEL_FAMILIES,
  OPERATION_CATEGORIES,
  OPERATION_OUTCOMES,
  ORDER_INTENT_KINDS,
  ORDER_INTENT_STATUSES,
  ORDER_TYPE_KINDS,
  OUTCOME_SIDES,
  POSITION_LEDGER_STATES,
  POSITION_PLANES,
  PUBLICATION_STATUSES,
  QUANT_RUNTIME_MODES,
  RECOMMENDATION_ATTRIBUTION_OUTCOMES,
  RECOMMENDATION_REPORT_STATUSES,
  RECOMMENDATION_STATUSES,
  RECONCILIATION_RESULTS,
  RESEARCH_JOB_KINDS,
  RESEARCH_JOB_STATUSES,
  RESOURCE_TYPES,
  RUNTIME_CONFIG_ACTIVATION_KINDS,
  RUNTIME_CONFIG_VERSION_SOURCES,
  SETTLEMENT_REDEEM_STATES,
  SIDES,
  TRAINING_DATASET_STATUSES,
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
      [OPERATION_CATEGORIES.auth]: 'blue',
      [OPERATION_CATEGORIES.governance]: 'purple',
      [OPERATION_CATEGORIES.market]: 'cyan',
      [OPERATION_CATEGORIES.other]: 'lime',
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
  system: 'cyan',
  viewer: 'blue',
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
      [RESOURCE_TYPES.menu]: 'geekblue',
      [RESOURCE_TYPES.operationLog]: 'purple',
      [RESOURCE_TYPES.orderIntent]: 'processing',
      [RESOURCE_TYPES.permission]: 'geekblue',
      [RESOURCE_TYPES.position]: 'blue',
      [RESOURCE_TYPES.publication]: 'purple',
      [RESOURCE_TYPES.quantReport]: 'success',
      [RESOURCE_TYPES.recommendationAttribution]: 'cyan',
      [RESOURCE_TYPES.reconciliation]: 'warning',
      [RESOURCE_TYPES.replay]: 'geekblue',
      [RESOURCE_TYPES.role]: 'purple',
      [RESOURCE_TYPES.runtimeConfig]: 'orange',
      [RESOURCE_TYPES.settlementRedeem]: 'gold',
      [RESOURCE_TYPES.system]: 'cyan',
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
      [RUNTIME_CONFIG_VERSION_SOURCES.bootstrap]: 'geekblue',
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
      [RECOMMENDATION_REPORT_STATUSES.expired]: 'gold',
      [RECOMMENDATION_REPORT_STATUSES.failed]: 'error',
      [RECOMMENDATION_REPORT_STATUSES.published]: 'success',
      [RECOMMENDATION_REPORT_STATUSES.publishedEmpty]: 'cyan',
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
      [RECOMMENDATION_STATUSES.expired]: 'gold',
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
      [ORDER_INTENT_STATUSES.cancelled]: 'volcano',
      [ORDER_INTENT_STATUSES.draft]: 'geekblue',
      [ORDER_INTENT_STATUSES.expired]: 'gold',
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
      [APPROVAL_STATUSES.expired]: 'gold',
      [APPROVAL_STATUSES.notRequired]: 'geekblue',
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
      [EXECUTION_ORDER_STATES.cancelled]: 'volcano',
      [EXECUTION_ORDER_STATES.cancelRequested]: 'warning',
      [EXECUTION_ORDER_STATES.failed]: 'error',
      [EXECUTION_ORDER_STATES.filled]: 'success',
      [EXECUTION_ORDER_STATES.partiallyFilled]: 'cyan',
      [EXECUTION_ORDER_STATES.planned]: 'geekblue',
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
      [POSITION_LEDGER_STATES.closed]: 'volcano',
      [POSITION_LEDGER_STATES.closing]: 'warning',
      [POSITION_LEDGER_STATES.open]: 'processing',
      [POSITION_LEDGER_STATES.settled]: 'success',
    },
  );
}

/** Position ledger plane tags. */
export function usePositionPlaneTagOptions() {
  return buildTagOptions(
    Object.values(POSITION_PLANES),
    (value) => $t(`enum.positionPlane.${value}`),
    {
      [POSITION_PLANES.systemLot]: 'geekblue',
    },
  );
}

/** Reconciliation result tags. */
export function useReconciliationResultTagOptions() {
  return buildTagOptions(
    Object.values(RECONCILIATION_RESULTS),
    (value) => $t(`enum.reconciliationResult.${value}`),
    {
      [RECONCILIATION_RESULTS.cancelled]: 'volcano',
      [RECONCILIATION_RESULTS.filled]: 'success',
      [RECONCILIATION_RESULTS.notFilled]: 'geekblue',
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
      [MARKET_STATUSES.discovered]: 'cyan',
      [MARKET_STATUSES.filtered]: 'geekblue',
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
      [MARKET_CATEGORIES.other]: 'lime',
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
      [PUBLICATION_STATUSES.draft]: 'geekblue',
      [PUBLICATION_STATUSES.published]: 'success',
      [PUBLICATION_STATUSES.rejected]: 'error',
      [PUBLICATION_STATUSES.retired]: 'gold',
      [PUBLICATION_STATUSES.shadow]: 'purple',
    },
  );
}

/** Training-dataset build lifecycle tags. */
export function useTrainingDatasetStatusTagOptions() {
  return buildTagOptions(
    Object.values(TRAINING_DATASET_STATUSES),
    (value) => $t(`enum.trainingDatasetStatus.${value}`),
    {
      [TRAINING_DATASET_STATUSES.building]: 'processing',
      [TRAINING_DATASET_STATUSES.built]: 'cyan',
      [TRAINING_DATASET_STATUSES.expired]: 'gold',
      [TRAINING_DATASET_STATUSES.failed]: 'error',
      [TRAINING_DATASET_STATUSES.insufficientLabels]: 'warning',
      [TRAINING_DATASET_STATUSES.planned]: 'geekblue',
      [TRAINING_DATASET_STATUSES.ready]: 'success',
    },
  );
}

/** Factor family taxonomy tags. */
export function useFactorFamilyTagOptions() {
  return buildTagOptions(
    Object.values(FACTOR_FAMILIES),
    (value) => $t(`enum.factorFamily.${value}`),
    {
      [FACTOR_FAMILIES.activity]: 'lime',
      [FACTOR_FAMILIES.dataQuality]: 'geekblue',
      [FACTOR_FAMILIES.liquidity]: 'cyan',
      [FACTOR_FAMILIES.meanReversion]: 'purple',
      [FACTOR_FAMILIES.microstructure]: 'geekblue',
      [FACTOR_FAMILIES.momentum]: 'orange',
      [FACTOR_FAMILIES.resolution]: 'volcano',
      [FACTOR_FAMILIES.structural]: 'gold',
      [FACTOR_FAMILIES.volatility]: 'red',
    },
  );
}

/** Model family tags (Buy ranker, exit scorer, classical ML). */
export function useModelFamilyTagOptions() {
  return buildTagOptions(
    Object.values(MODEL_FAMILIES),
    (value) => $t(`enum.modelFamily.${value}`),
    {
      [MODEL_FAMILIES.classicalElasticNet]: 'purple',
      [MODEL_FAMILIES.classicalExtraTrees]: 'purple',
      [MODEL_FAMILIES.classicalLasso]: 'purple',
      [MODEL_FAMILIES.classicalLogisticRegression]: 'purple',
      [MODEL_FAMILIES.classicalRandomForest]: 'purple',
      [MODEL_FAMILIES.classicalRidge]: 'purple',
      [MODEL_FAMILIES.holdVsExitWeighted]: 'orange',
      [MODEL_FAMILIES.weightedFactor]: 'processing',
    },
  );
}

/** Factor definition scope tags (generic plane vs vertical domain). */
export function useFactorScopeTagOptions() {
  return buildTagOptions(
    Object.values(FACTOR_DEFINITION_SCOPES),
    (value) => $t(`enum.factorScope.${value}`),
    {
      [FACTOR_DEFINITION_SCOPES.generic]: 'geekblue',
      [FACTOR_DEFINITION_SCOPES.structural]: 'gold',
    },
  );
}

/** Research-job lifecycle status tags. */
export function useResearchJobStatusTagOptions() {
  return buildTagOptions(
    Object.values(RESEARCH_JOB_STATUSES),
    (value) => $t(`enum.researchJobStatus.${value}`),
    {
      [RESEARCH_JOB_STATUSES.cancelled]: 'volcano',
      [RESEARCH_JOB_STATUSES.failed]: 'error',
      [RESEARCH_JOB_STATUSES.queued]: 'geekblue',
      [RESEARCH_JOB_STATUSES.running]: 'processing',
      [RESEARCH_JOB_STATUSES.succeeded]: 'success',
    },
  );
}

/** Research-job kind tags. */
export function useResearchJobKindTagOptions() {
  return buildTagOptions(
    Object.values(RESEARCH_JOB_KINDS),
    (value) => $t(`enum.researchJobKind.${value}`),
    {
      [RESEARCH_JOB_KINDS.backtest]: 'geekblue',
      [RESEARCH_JOB_KINDS.biasTableFit]: 'gold',
      [RESEARCH_JOB_KINDS.datasetBuild]: 'cyan',
      [RESEARCH_JOB_KINDS.modelTrain]: 'purple',
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
      [MATERIALIZATION_RUN_STATUSES.queued]: 'geekblue',
      [MATERIALIZATION_RUN_STATUSES.running]: 'processing',
    },
  );
}

/** CLOB order type tags (FOK / GTC / GTD). */
export function useOrderTypeKindTagOptions() {
  return buildTagOptions(
    Object.values(ORDER_TYPE_KINDS),
    (value) => $t(`enum.orderTypeKind.${value}`),
    {
      [ORDER_TYPE_KINDS.fok]: 'volcano',
      [ORDER_TYPE_KINDS.gtc]: 'blue',
      [ORDER_TYPE_KINDS.gtd]: 'purple',
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

/** Recommendation outcome-side tags (YES / NO token). */
export function useOutcomeSideTagOptions() {
  return buildTagOptions(
    Object.values(OUTCOME_SIDES),
    (value) => $t(`enum.outcomeSide.${value}`),
    {
      [OUTCOME_SIDES.no]: 'error',
      [OUTCOME_SIDES.yes]: 'success',
    },
  );
}

/** Factor contribution direction tags. */
export function useFactorDirectionTagOptions() {
  return buildTagOptions(
    Object.values(FACTOR_DIRECTIONS),
    (value) => $t(`enum.factorDirection.${value}`),
    {
      [FACTOR_DIRECTIONS.negative]: 'error',
      [FACTOR_DIRECTIONS.neutral]: 'geekblue',
      [FACTOR_DIRECTIONS.positive]: 'success',
    },
  );
}

/** Recommendation attribution terminal-outcome tags. */
export function useRecommendationAttributionOutcomeTagOptions() {
  return buildTagOptions(
    Object.values(RECOMMENDATION_ATTRIBUTION_OUTCOMES),
    (value) => $t(`enum.recommendationAttributionOutcome.${value}`),
    {
      [RECOMMENDATION_ATTRIBUTION_OUTCOMES.cancelledUnfilled]: 'volcano',
      [RECOMMENDATION_ATTRIBUTION_OUTCOMES.expiredUnfilled]: 'gold',
      [RECOMMENDATION_ATTRIBUTION_OUTCOMES.failedUnfilled]: 'error',
      [RECOMMENDATION_ATTRIBUTION_OUTCOMES.filledExited]: 'success',
      [RECOMMENDATION_ATTRIBUTION_OUTCOMES.filledSettled]: 'cyan',
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

/** Market-linkage ledger status tags (Phase 11.2.2). */
export function useLinkageStatusTagOptions() {
  return buildTagOptions(
    ['resolved', 'unresolved', 'overridden'],
    (value) => $t(`enum.linkageStatus.${value}`),
    {
      overridden: 'purple',
      resolved: 'success',
      unresolved: 'warning',
    },
  );
}

/** Linkage resolver tier tags. */
export function useResolverTierTagOptions() {
  return buildTagOptions(
    ['tier0_slug', 'tier1_template', 'tier2_llm', 'override'],
    (value) => $t(`enum.resolverTier.${value}`),
    {
      override: 'purple',
      tier0_slug: 'cyan',
      tier1_template: 'blue',
      tier2_llm: 'geekblue',
    },
  );
}

/** External domain vertical family tags. */
export function useDomainFamilyTagOptions() {
  return buildTagOptions(
    ['crypto'],
    (value) => $t(`enum.domainFamily.${value}`),
    { crypto: 'gold' },
  );
}

/** Domain ingest cursor status tags. */
export function useDomainCursorStatusTagOptions() {
  return buildTagOptions(
    ['bootstrap', 'backfilling', 'live', 'error'],
    (value) => $t(`enum.domainCursorStatus.${value}`),
    {
      backfilling: 'processing',
      bootstrap: 'default',
      error: 'error',
      live: 'success',
    },
  );
}
