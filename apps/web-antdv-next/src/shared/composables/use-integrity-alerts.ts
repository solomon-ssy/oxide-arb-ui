import type {
  ExecutionEmergencyView,
  OperationalDegradeReason,
  OperationalPhase,
} from '@vben/types';

import { computed } from 'vue';

import { useSystemStore } from '#/store';

import { degradeReasonKey, degradeReasonParams } from './ws/degrade-reason';

/** Severity ordering for integrity alerts (lower = higher priority). */
export type IntegrityAlertSeverity = 'critical' | 'warning';

/** Operator-facing integrity alert derived from authoritative system snapshots. */
export type IntegrityAlertCode =
  | 'blocking_trades'
  | 'emergency_ack'
  | 'needs_reconcile'
  | 'operational_degraded';

export interface IntegrityAlert {
  code: IntegrityAlertCode;
  severity: IntegrityAlertSeverity;
  /** i18n key under `page.integrity.*` */
  messageKey: string;
  messageParams?: Record<string, number | string>;
  /** i18n key for the primary CTA label */
  actionKey?: string;
  /** In-page trades tab to open when the CTA is clicked */
  tradesTab?: 'reconciliation';
  /** Opens the emergency-ack modal instead of navigating */
  openEmergencyAck?: boolean;
  /** Extra degrade reason labels (already resolved i18n keys) */
  degradeReasonKeys?: Array<{
    key: string;
    params?: Record<string, string>;
  }>;
}

const SEVERITY_RANK: Record<IntegrityAlertSeverity, number> = {
  critical: 0,
  warning: 1,
};

function degradeReasonEntries(
  phase: OperationalPhase,
): Array<{ key: string; params?: Record<string, string> }> {
  if (phase.phase !== 'degraded') {
    return [];
  }
  return phase.reasons.map((reason: OperationalDegradeReason) => ({
    key: `page.system.degradeReason.${degradeReasonKey(reason)}`,
    params: degradeReasonParams(reason),
  }));
}

function emergencyAlert(
  emergency: ExecutionEmergencyView,
): IntegrityAlert | null {
  if (!emergency.active || !emergency.requires_operator_ack) {
    return null;
  }
  return {
    actionKey: 'page.integrity.actions.emergencyAck',
    code: 'emergency_ack',
    messageKey: 'page.integrity.emergencyAck',
    messageParams: {
      class: emergency.class,
      reason: emergency.last_reason ?? '',
    },
    openEmergencyAck: true,
    severity: 'critical',
  };
}

/** Derive sorted integrity alerts from WS-backed system stores. */
export function useIntegrityAlerts() {
  const systemStore = useSystemStore();

  const alerts = computed<IntegrityAlert[]>(() => {
    const balance = systemStore.balance;
    const status = systemStore.status;
    const items: IntegrityAlert[] = [];

    const emergency = status?.execution_emergency;
    if (emergency) {
      const alert = emergencyAlert(emergency);
      if (alert) {
        items.push(alert);
      }
    }

    const blocking = balance?.blocking_trade_count ?? 0;
    if (blocking > 0) {
      items.push({
        actionKey: 'page.integrity.actions.openReconciliation',
        code: 'blocking_trades',
        messageKey: 'page.integrity.blockingTrades',
        messageParams: { count: blocking },
        tradesTab: 'reconciliation',
        severity: 'critical',
      });
    }

    const needsReconcile = balance?.needs_reconcile_count ?? 0;
    if (needsReconcile > 0 && blocking === 0) {
      items.push({
        actionKey: 'page.integrity.actions.openReconciliation',
        code: 'needs_reconcile',
        messageKey: 'page.integrity.needsReconcile',
        messageParams: { count: needsReconcile },
        tradesTab: 'reconciliation',
        severity: 'warning',
      });
    } else if (needsReconcile > 0) {
      items.push({
        code: 'needs_reconcile',
        messageKey: 'page.integrity.needsReconcile',
        messageParams: { count: needsReconcile },
        severity: 'warning',
      });
    }

    const phase = status?.operational_phase;
    if (phase?.phase === 'degraded') {
      items.push({
        code: 'operational_degraded',
        degradeReasonKeys: degradeReasonEntries(phase),
        messageKey: 'page.integrity.operationalDegraded',
        severity: 'warning',
      });
    }

    return items.toSorted(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
    );
  });

  const hasCritical = computed(() =>
    alerts.value.some((alert) => alert.severity === 'critical'),
  );

  return {
    alerts,
    hasCritical,
  };
}
