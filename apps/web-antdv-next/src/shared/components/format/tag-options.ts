import {
  OPERATION_CATEGORIES,
  OPERATION_OUTCOMES,
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
