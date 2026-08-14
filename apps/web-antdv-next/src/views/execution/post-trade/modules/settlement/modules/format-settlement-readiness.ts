import type {
  SettlementDeploymentAdvisory,
  SettlementReadinessReason,
} from '@vben/types';

import { $t } from '#/locales';

type ReasonParams = Record<
  string,
  boolean | null | number | string | undefined
>;

function reasonParams(
  reason: SettlementDeploymentAdvisory | SettlementReadinessReason,
): ReasonParams {
  const params: ReasonParams = {};
  for (const [key, value] of Object.entries(reason)) {
    if (key === 'code' || value === undefined) {
      continue;
    }
    params[key] = value;
  }
  return params;
}

function translateCodedMessage(
  namespace: 'advisoryMessages' | 'reasons',
  coded: SettlementDeploymentAdvisory | SettlementReadinessReason,
): string {
  const key = `page.quantSettlementRedeems.readiness.${namespace}.${coded.code}`;
  const translated = $t(key, reasonParams(coded));
  if (translated === key) {
    return $t(`page.quantSettlementRedeems.readiness.${namespace}.unknown`, {
      code: coded.code,
    });
  }
  return translated;
}

/** Operator-facing copy for a typed readiness blocking reason. */
export function formatSettlementReadinessReason(
  reason: SettlementReadinessReason,
): string {
  return translateCodedMessage('reasons', reason);
}

/** Operator-facing copy for a non-blocking deployment advisory. */
export function formatSettlementDeploymentAdvisory(
  advisory: SettlementDeploymentAdvisory,
): string {
  return translateCodedMessage('advisoryMessages', advisory);
}
