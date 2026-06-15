import {
  AUDIT_RESOURCE_TYPES,
  CONTROL_AUDIT_EVENT_TYPES,
  CONTROL_FACTOR_TYPES,
  FACTOR_STATUSES,
  OPERATION_CATEGORIES,
  OPERATION_OUTCOMES,
  PUBLICATION_MODES,
  PUBLICATION_STATUSES,
  RESOURCE_TYPES,
  RUNTIME_CONFIG_ACTIVATION_KINDS,
  RUNTIME_CONFIG_VERSION_SOURCES,
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
      [OPERATION_CATEGORIES.replay]: 'blue',
      [OPERATION_CATEGORIES.risk]: 'warning',
      [OPERATION_CATEGORIES.runtimeConfig]: 'orange',
      [OPERATION_CATEGORIES.system]: 'processing',
    },
  );
}

/** Acting role tags shared by audit chain and operation log. */
export function useActingRoleTagOptions() {
  return buildTagOptions(
    ['admin', 'operator', 'system', 'viewer'],
    (value) => value,
    {
      admin: 'magenta',
      operator: 'processing',
      system: 'default',
      viewer: 'default',
    },
  );
}

/** Tag color map for rows keyed by another field (e.g. actor_role). */
export const ACTING_ROLE_COLORS: Record<string, string> = {
  admin: 'magenta',
  operator: 'processing',
  system: 'default',
  viewer: 'default',
};

/** @deprecated Use ACTING_ROLE_COLORS */
export const AUDIT_ACTOR_ROLE_COLORS = ACTING_ROLE_COLORS;

/** Audit chain event type tags grouped by domain. */
export function useControlAuditEventTagOptions() {
  return buildTagOptions(
    Object.values(CONTROL_AUDIT_EVENT_TYPES),
    (value) => $t(`enum.controlAuditEventType.${value}`),
    {
      [CONTROL_AUDIT_EVENT_TYPES.factorCreated]: 'processing',
      [CONTROL_AUDIT_EVENT_TYPES.factorExpired]: 'default',
      [CONTROL_AUDIT_EVENT_TYPES.factorRejected]: 'error',
      [CONTROL_AUDIT_EVENT_TYPES.factorTransitioned]: 'cyan',
      [CONTROL_AUDIT_EVENT_TYPES.publicationActivated]: 'success',
      [CONTROL_AUDIT_EVENT_TYPES.publicationCreated]: 'purple',
      [CONTROL_AUDIT_EVENT_TYPES.publicationExpired]: 'default',
      [CONTROL_AUDIT_EVENT_TYPES.publicationRolledBack]: 'warning',
      [CONTROL_AUDIT_EVENT_TYPES.runtimeConfigActivated]: 'gold',
      [CONTROL_AUDIT_EVENT_TYPES.runtimeConfigRolledBack]: 'warning',
      [CONTROL_AUDIT_EVENT_TYPES.runtimeConfigVersionCreated]: 'orange',
      [CONTROL_AUDIT_EVENT_TYPES.snapshotLoadFailed]: 'error',
    },
  );
}

/** Audit resource type tags. */
export function useAuditResourceTagOptions() {
  return buildTagOptions(
    Object.values(AUDIT_RESOURCE_TYPES),
    (value) => $t(`enum.auditResourceType.${value}`),
    {
      [AUDIT_RESOURCE_TYPES.factor]: 'processing',
      [AUDIT_RESOURCE_TYPES.materializationRun]: 'cyan',
      [AUDIT_RESOURCE_TYPES.publication]: 'purple',
      [AUDIT_RESOURCE_TYPES.runtimeConfigVersion]: 'gold',
      [AUDIT_RESOURCE_TYPES.snapshot]: 'default',
    },
  );
}

/** Operation log resource type tags. */
export function useResourceTypeTagOptions() {
  return buildTagOptions(
    Object.values(RESOURCE_TYPES),
    (value) => $t(`enum.resourceType.${value}`),
    {
      [RESOURCE_TYPES.analytics]: 'geekblue',
      [RESOURCE_TYPES.audit]: 'purple',
      [RESOURCE_TYPES.blacklist]: 'error',
      [RESOURCE_TYPES.controlFactor]: 'processing',
      [RESOURCE_TYPES.market]: 'cyan',
      [RESOURCE_TYPES.materialization]: 'geekblue',
      [RESOURCE_TYPES.menu]: 'default',
      [RESOURCE_TYPES.operationLog]: 'default',
      [RESOURCE_TYPES.opportunity]: 'blue',
      [RESOURCE_TYPES.permission]: 'default',
      [RESOURCE_TYPES.pnl]: 'gold',
      [RESOURCE_TYPES.publication]: 'purple',
      [RESOURCE_TYPES.replay]: 'geekblue',
      [RESOURCE_TYPES.risk]: 'warning',
      [RESOURCE_TYPES.role]: 'default',
      [RESOURCE_TYPES.runtimeConfig]: 'orange',
      [RESOURCE_TYPES.system]: 'default',
      [RESOURCE_TYPES.trade]: 'success',
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

/** Control factor status tags. */
export function useFactorStatusTagOptions() {
  return buildTagOptions(
    Object.values(FACTOR_STATUSES),
    (value) => $t(`enum.factorStatus.${value}`),
    {
      [FACTOR_STATUSES.candidate]: 'processing',
      [FACTOR_STATUSES.draft]: 'default',
      [FACTOR_STATUSES.expired]: 'default',
      [FACTOR_STATUSES.published]: 'success',
      [FACTOR_STATUSES.rejected]: 'error',
      [FACTOR_STATUSES.reportOnly]: 'cyan',
      [FACTOR_STATUSES.rolledBack]: 'warning',
      [FACTOR_STATUSES.shadow]: 'purple',
      [FACTOR_STATUSES.superseded]: 'default',
    },
  );
}

/** Control factor type tags. */
export function useControlFactorTypeTagOptions() {
  return buildTagOptions(
    Object.values(CONTROL_FACTOR_TYPES),
    (value) => $t(`enum.controlFactorType.${value}`),
    {
      [CONTROL_FACTOR_TYPES.bucketRisk]: 'warning',
      [CONTROL_FACTOR_TYPES.executionQuality]: 'processing',
      [CONTROL_FACTOR_TYPES.marketAnomaly]: 'error',
      [CONTROL_FACTOR_TYPES.portfolioRisk]: 'gold',
      [CONTROL_FACTOR_TYPES.reconciliationHealth]: 'cyan',
    },
  );
}

/** Publication mode tags. */
export function usePublicationModeTagOptions() {
  return buildTagOptions(
    Object.values(PUBLICATION_MODES),
    (value) => $t(`enum.publicationMode.${value}`),
    {
      [PUBLICATION_MODES.published]: 'success',
      [PUBLICATION_MODES.shadow]: 'purple',
    },
  );
}

/** Publication status tags. */
export function usePublicationStatusTagOptions() {
  return buildTagOptions(
    Object.values(PUBLICATION_STATUSES),
    (value) => $t(`enum.publicationStatus.${value}`),
    {
      [PUBLICATION_STATUSES.active]: 'success',
      [PUBLICATION_STATUSES.expired]: 'default',
      [PUBLICATION_STATUSES.pending]: 'processing',
      [PUBLICATION_STATUSES.rejected]: 'error',
      [PUBLICATION_STATUSES.rolledBack]: 'warning',
      [PUBLICATION_STATUSES.superseded]: 'default',
    },
  );
}
