import type { ApiError } from '@vben/request/qp';
import type {
  SettlementGovernedActionPreflightView,
  SettlementGovernedActionScope,
  SettlementGovernedActionView,
  SettlementRedeemView,
  SettlementRoute,
} from '@vben/types';

import { useRequestHandler } from '@vben/request/qp';

import { message } from 'antdv-next';

import {
  applySettlementCanary,
  applySettlementOperatorApproval,
  approveSettlementAuthorization,
  preflightSettlementCanary,
  preflightSettlementOperatorApproval,
  revokeSettlementAuthorization,
  revokeSettlementGovernedAction,
} from '#/api/settlement-redeems';
import { $t } from '#/locales';
import { formatUsd } from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

type ChangedCallback = () => Promise<void> | void;

function exactScopeDetails(scope: SettlementGovernedActionScope) {
  const details = [
    {
      label: $t('page.quantSettlementRedeems.governed.scope.route'),
      value: scope.route,
    },
    {
      label: $t('page.quantSettlementRedeems.governed.scope.wallet'),
      value: scope.wallet_kind,
    },
    {
      label: $t('page.quantSettlementRedeems.governed.scope.account'),
      mono: true,
      value: scope.execution_account_id,
    },
    {
      label: $t('page.quantSettlementRedeems.governed.scope.target'),
      mono: true,
      value: scope.target_adapter,
    },
    {
      label: $t('page.quantSettlementRedeems.governed.scope.deployment'),
      mono: true,
      value: scope.deployment_digest,
    },
    {
      label: $t('page.quantSettlementRedeems.governed.scope.expiresAt'),
      value: scope.expires_at,
    },
  ];
  if (scope.action === 'canary') {
    details.push(
      {
        label: $t('page.quantSettlementRedeems.governed.scope.case'),
        mono: true,
        value: scope.settlement_redeem_id,
      },
      {
        label: $t('page.quantSettlementRedeems.governed.scope.authorization'),
        mono: true,
        value: scope.authorization_digest,
      },
      {
        label: $t('page.quantSettlementRedeems.governed.scope.payoutCeiling'),
        value: formatUsd(scope.maximum_payout_usd),
      },
    );
  } else {
    details.push({
      label: $t('page.quantSettlementRedeems.governed.scope.desiredApproval'),
      value: scope.desired_approval
        ? $t('page.quantSettlementRedeems.readiness.approved')
        : $t('page.quantSettlementRedeems.readiness.notApproved'),
    });
  }
  return details;
}

function requireIssuedPreflight(
  preflight: null | SettlementGovernedActionPreflightView,
): null | {
  scope: SettlementGovernedActionScope;
  token: string;
} {
  if (!preflight) {
    return null;
  }
  if (!preflight.allowed || !preflight.scope || !preflight.preflight_token) {
    message.warning(
      $t('page.quantSettlementRedeems.governed.preflightBlocked', {
        reasons:
          preflight.blocking_reasons.join(', ') ||
          $t('page.quantSettlementRedeems.governed.unknownReason'),
      }),
    );
    return null;
  }
  return {
    scope: preflight.scope,
    token: preflight.preflight_token,
  };
}

export function useSettlementActions(onChanged: ChangedCallback) {
  const { governed } = useGovernedAction();
  const { handleRequest } = useRequestHandler();
  const { hasAccessByCodes } = useQpAccess();
  const canApprove = hasAccessByCodes(['settlement_redeem:approve']);
  const canCreate = hasAccessByCodes(['settlement_redeem:create']);
  const canRevoke = hasAccessByCodes(['settlement_redeem:revoke']);

  function onMutationError(error: ApiError): 'keep_open' {
    if (error.httpStatus === 409 || error.code === 409) {
      void onChanged();
    }
    return 'keep_open';
  }

  async function mutateBatchAuthorization(
    redeem: SettlementRedeemView,
    action: 'approve' | 'revoke',
  ) {
    if (
      (action === 'approve' ? !canApprove : !canRevoke) ||
      !redeem.authorization_digest
    ) {
      return null;
    }
    const result = await governed(
      (ctx) => {
        const request = {
          digest: redeem.authorization_digest as string,
          reason: ctx.reason,
        };
        return action === 'approve'
          ? approveSettlementAuthorization(
              redeem.settlement_redeem_id,
              request,
              ctx,
            )
          : revokeSettlementAuthorization(
              redeem.settlement_redeem_id,
              request,
              ctx,
            );
      },
      {
        danger: action === 'approve',
        details: [
          {
            label: $t('page.quantSettlementRedeems.governed.scope.case'),
            mono: true,
            value: redeem.settlement_redeem_id,
          },
          {
            label: $t(
              'page.quantSettlementRedeems.governed.scope.authorization',
            ),
            mono: true,
            value: redeem.authorization_digest,
          },
          {
            label: $t('page.quantSettlementRedeems.governed.scope.payout'),
            value: formatUsd(redeem.expected_payout_usd),
          },
        ],
        onError: onMutationError,
        summary: $t(
          action === 'approve'
            ? 'page.quantSettlementRedeems.governed.batchApproveSummary'
            : 'page.quantSettlementRedeems.governed.batchRevokeSummary',
        ),
        title: $t(
          action === 'approve'
            ? 'page.quantSettlementRedeems.actions.approve'
            : 'page.quantSettlementRedeems.actions.revoke',
        ),
      },
    );
    if (result) {
      message.success(
        $t(
          action === 'approve'
            ? 'page.quantSettlementRedeems.governed.batchApproved'
            : 'page.quantSettlementRedeems.governed.batchRevoked',
        ),
      );
      await onChanged();
    }
    return result;
  }

  async function authorizeOperator(
    route: SettlementRoute,
    desiredApproval: boolean,
  ): Promise<null | SettlementGovernedActionView> {
    if (!canCreate) {
      return null;
    }
    const issued = requireIssuedPreflight(
      (await handleRequest(() =>
        preflightSettlementOperatorApproval({
          desired_approval: desiredApproval,
          route,
        }),
      )) ?? null,
    );
    if (!issued) {
      return null;
    }
    const idempotencyKey = crypto.randomUUID();
    const result = await governed(
      (ctx) =>
        applySettlementOperatorApproval(
          {
            idempotency_key: idempotencyKey,
            preflight_token: issued.token,
            reason: ctx.reason,
            scope: issued.scope,
          },
          ctx,
        ),
      {
        confirmWord: desiredApproval ? 'APPROVE' : 'REVOKE',
        danger: desiredApproval,
        details: exactScopeDetails(issued.scope),
        onError: onMutationError,
        summary: $t(
          desiredApproval
            ? 'page.quantSettlementRedeems.governed.operatorApproveSummary'
            : 'page.quantSettlementRedeems.governed.operatorRevokeSummary',
        ),
        title: $t(
          desiredApproval
            ? 'page.quantSettlementRedeems.governed.operatorApprove'
            : 'page.quantSettlementRedeems.governed.operatorRevoke',
        ),
      },
    );
    if (result) {
      message.success($t('page.quantSettlementRedeems.governed.actionQueued'));
      await onChanged();
    }
    return result;
  }

  async function authorizeCanary(
    redeem: SettlementRedeemView,
    maximumPayoutUsd: string,
  ): Promise<null | SettlementGovernedActionView> {
    if (!canCreate) {
      return null;
    }
    const issued = requireIssuedPreflight(
      (await handleRequest(() =>
        preflightSettlementCanary({
          maximum_payout_usd: maximumPayoutUsd,
          route: redeem.route,
          settlement_redeem_id: redeem.settlement_redeem_id,
        }),
      )) ?? null,
    );
    if (!issued) {
      return null;
    }
    const idempotencyKey = crypto.randomUUID();
    const result = await governed(
      (ctx) =>
        applySettlementCanary(
          {
            idempotency_key: idempotencyKey,
            preflight_token: issued.token,
            reason: ctx.reason,
            scope: issued.scope,
          },
          ctx,
        ),
      {
        confirmWord: 'CANARY',
        danger: true,
        details: exactScopeDetails(issued.scope),
        onError: onMutationError,
        summary: $t('page.quantSettlementRedeems.governed.canarySummary'),
        title: $t('page.quantSettlementRedeems.governed.canary'),
      },
    );
    if (result) {
      message.success(
        $t('page.quantSettlementRedeems.governed.canaryAuthorized'),
      );
      await onChanged();
    }
    return result;
  }

  async function revokeAction(action: SettlementGovernedActionView) {
    if (
      !canRevoke ||
      !['authorized', 'retry_scheduled'].includes(action.state)
    ) {
      return null;
    }
    const result = await governed(
      (ctx) =>
        revokeSettlementGovernedAction(
          action.settlement_governed_action_id,
          {
            reason: ctx.reason,
            scope_digest: action.scope_digest,
          },
          ctx,
        ),
      {
        confirmWord: 'REVOKE',
        danger: true,
        details: [
          {
            label: $t('page.quantSettlementRedeems.governed.actionId'),
            mono: true,
            value: action.settlement_governed_action_id,
          },
          {
            label: $t('page.quantSettlementRedeems.governed.scopeDigest'),
            mono: true,
            value: action.scope_digest,
          },
        ],
        onError: onMutationError,
        summary: $t('page.quantSettlementRedeems.governed.revokeActionSummary'),
        title: $t('page.quantSettlementRedeems.governed.revokeAction'),
      },
    );
    if (result) {
      message.success($t('page.quantSettlementRedeems.governed.actionRevoked'));
      await onChanged();
    }
    return result;
  }

  return {
    authorizeCanary,
    authorizeOperator,
    canApprove,
    canCreate,
    canRevoke,
    mutateBatchAuthorization,
    revokeAction,
  };
}
