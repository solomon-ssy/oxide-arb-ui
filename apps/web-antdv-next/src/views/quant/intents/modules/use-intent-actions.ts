/**
 * Order-intent governed lifecycle actions (approve / reject / cancel / submit).
 *
 * Every action routes through the shared governed-action modal so acting role +
 * reason + fail-closed 403/409/422 details are handled uniformly. `approve`
 * additionally exposes optional downscale/limit overrides; `submit` surfaces the
 * live kill-switch / runtime-mode / recovery gate as read-only pre-submit
 * context. The FSM legality of each action is decided by the caller
 * (`intentActions`) — this composable only owns permission + wire orchestration.
 */
import type {
  ExecutionOrderView,
  LiveAccountView,
  OrderIntentView,
  SubmitIntentGate,
} from '@vben/types';

import type { GovernedField } from '#/shared/composables/governed-field';
import type { GovernedDetailRow } from '#/shared/composables/use-governed-action';

import { useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/qp';
import { evaluateSubmitIntentGate } from '@vben/types';

import { message } from 'antdv-next';

import { getLiveAccount } from '#/api/account';
import {
  approveOrderIntent,
  cancelOrderIntent,
  rejectOrderIntent,
  submitOrderIntent,
} from '#/api/order-intents';
import { $t } from '#/locales';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatPrice,
  formatShares,
} from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import {
  executionOrderOpenPath,
  reconciliationQueuePath,
} from '#/shared/routes/execution-plane';
import { useOrderIntentStore, useSystemStore } from '#/store';

/** Frozen entry preview so an approver confirms what they are releasing. */
function intentPreview(intent: OrderIntentView): GovernedDetailRow[] {
  return [
    {
      label: $t('page.quantIntents.detail.entry.side'),
      value: intent.entry_order.side,
    },
    {
      label: $t('page.quantIntents.detail.entry.limitPrice'),
      value: formatPrice(intent.entry_order.limit_price),
    },
    {
      label: $t('page.quantIntents.detail.entry.shares'),
      value: formatShares(intent.entry_order.shares),
    },
    {
      label: $t('page.quantIntents.detail.identity.riskEnvelopeHash'),
      mono: true,
      value: intent.risk_envelope_hash,
    },
  ];
}

/** Optional approver overrides — omitted inputs approve the frozen spec. */
function approveOverrideFields(): GovernedField[] {
  return [
    {
      kind: 'shares',
      label: $t('page.quantIntents.approve.overrideShares'),
      name: 'override_shares',
      placeholder: $t('page.quantIntents.approve.overrideSharesPlaceholder'),
    },
    {
      kind: 'price',
      label: $t('page.quantIntents.approve.overrideLimitPrice'),
      name: 'override_limit_price',
    },
    {
      help: $t('page.quantIntents.approve.maxAllowedUsdHelp'),
      kind: 'usd',
      label: $t('page.quantIntents.approve.maxAllowedUsd'),
      name: 'max_allowed_usd',
    },
    {
      kind: 'text',
      label: $t('page.quantIntents.approve.overrideNote'),
      name: 'override_note',
    },
  ];
}

export function useIntentActions(onChanged: () => void) {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();
  const { handleRequest } = useRequestHandler();
  const systemStore = useSystemStore();
  const router = useRouter();
  const orderIntentStore = useOrderIntentStore();

  const canApprove = hasAccessByCodes(['order_intent:approve']);
  const canReject = hasAccessByCodes(['order_intent:reject']);
  const canCancel = hasAccessByCodes(['order_intent:cancel']);
  const canSubmit = hasAccessByCodes(['order_intent:submit']);

  /**
   * Fail-closed submit gate: mirrors the backend `ensure_submittable` +
   * `RuntimeModeCheck` + kill-switch / recovery latch against the live system
   * status, so the Submit button is disabled (with an explanatory tooltip)
   * rather than surfacing an action the venue will reject.
   */
  function submitGate(intent: OrderIntentView): SubmitIntentGate {
    const status = systemStore.status;
    return evaluateSubmitIntentGate({
      autoExecutionBlocked:
        status?.execution_recovery.auto_execution_blocked ?? false,
      canSubmit,
      expiresAt: intent.expires_at,
      killSwitchState: status?.kill_switch.state ?? null,
      runtimeMode: status?.quant_runtime_mode ?? null,
      status: intent.status,
    });
  }

  /** Live execution-gate context shown before a manual submission. */
  function submitContext(account: LiveAccountView | null): GovernedDetailRow[] {
    const status = systemStore.status;
    if (!status) {
      return [];
    }
    const recovery = status.execution_recovery;
    const reconciliationPath = reconciliationQueuePath();
    return [
      {
        label: $t('page.quantIntents.submit.killSwitch'),
        value: $t(`enum.killSwitchState.${status.kill_switch.state}`),
      },
      {
        label: $t('page.quantIntents.submit.runtimeMode'),
        value: $t(`enum.quantRuntimeMode.${status.quant_runtime_mode}`),
      },
      {
        label: $t('page.quantIntents.submit.autoBlocked'),
        routeTo: recovery.auto_execution_blocked
          ? reconciliationPath
          : undefined,
        value: recovery.auto_execution_blocked
          ? $t('page.quantIntents.submit.viewReconciliationQueueAction')
          : $t('common.no'),
      },
      {
        label: $t('page.quantIntents.submit.unresolved'),
        routeTo: recovery.has_unresolvable_reconciliation
          ? reconciliationPath
          : undefined,
        value: recovery.has_unresolvable_reconciliation
          ? $t('page.quantIntents.submit.viewReconciliationQueue', {
              count: recovery.unresolvable_count,
            })
          : EMPTY_PLACEHOLDER,
      },
      // Account freshness: `report_only` is not dry-run — submission sizing is
      // checked against the real venue account, so its as-of instant matters.
      {
        label: $t('page.quantIntents.submit.accountFreshness'),
        value: account
          ? formatDateTimeLocal(account.fetched_at)
          : EMPTY_PLACEHOLDER,
      },
    ];
  }

  async function approve(
    intent: OrderIntentView,
  ): Promise<null | OrderIntentView> {
    const id = intent.order_intent_id;
    const result = await governed(
      (ctx) =>
        approveOrderIntent(
          id,
          {
            max_allowed_usd: ctx.fields.max_allowed_usd,
            override_limit_price: ctx.fields.override_limit_price,
            override_note: ctx.fields.override_note,
            override_shares: ctx.fields.override_shares,
            reason: ctx.reason,
          },
          ctx,
        ),
      {
        details: intentPreview(intent),
        fields: approveOverrideFields(),
        summary: $t('page.quantIntents.approve.summary', { id }),
        title: $t('page.quantIntents.approve.title'),
      },
    );
    if (result) {
      orderIntentStore.suppressWsToastForIntent(id);
      message.success($t('page.quantIntents.feedback.approved'));
      onChanged();
    }
    return result;
  }

  async function reject(
    intent: OrderIntentView,
  ): Promise<null | OrderIntentView> {
    const id = intent.order_intent_id;
    const result = await governed(
      (ctx) => rejectOrderIntent(id, { reason: ctx.reason }, ctx),
      {
        danger: true,
        details: intentPreview(intent),
        summary: $t('page.quantIntents.reject.summary', { id }),
        title: $t('page.quantIntents.reject.title'),
      },
    );
    if (result) {
      orderIntentStore.suppressWsToastForIntent(id);
      message.success($t('page.quantIntents.feedback.rejected'));
      onChanged();
    }
    return result;
  }

  async function cancel(
    intent: OrderIntentView,
  ): Promise<null | OrderIntentView> {
    const id = intent.order_intent_id;
    const result = await governed(
      (ctx) => cancelOrderIntent(id, { reason: ctx.reason }, ctx),
      {
        danger: true,
        summary: $t('page.quantIntents.cancel.summary', { id }),
        title: $t('page.quantIntents.cancel.title'),
      },
    );
    if (result) {
      orderIntentStore.suppressWsToastForIntent(id);
      message.success($t('page.quantIntents.feedback.cancelled'));
      onChanged();
    }
    return result;
  }

  async function submit(
    intent: OrderIntentView,
  ): Promise<ExecutionOrderView | null> {
    const id = intent.order_intent_id;
    // Fetch the real venue account so the confirm modal shows its freshness
    // before the operator commits money; a failure degrades to a placeholder.
    const account = await handleRequest(getLiveAccount, { silent: true });
    const result = await governed(
      (ctx) => submitOrderIntent(id, { reason: ctx.reason }, ctx),
      {
        confirmWord: 'SUBMIT',
        danger: true,
        details: submitContext(account),
        summary: $t('page.quantIntents.submit.summary', { id }),
        title: $t('page.quantIntents.submit.title'),
      },
    );
    if (result) {
      orderIntentStore.suppressWsToastForIntent(id);
      message.success(
        $t('page.quantIntents.feedback.submitted', {
          id: result.execution_order_id,
        }),
      );
      onChanged();
      // Deep-link to the freshly created execution order so the operator lands
      // on the venue-submission ledger for the order they just placed.
      void router.push(executionOrderOpenPath(result.execution_order_id));
    }
    return result;
  }

  return {
    approve,
    canApprove,
    canCancel,
    canReject,
    canSubmit,
    cancel,
    reject,
    submit,
    submitGate,
  };
}
