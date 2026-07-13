/**
 * Order-intent governed lifecycle actions (approve / reject / cancel).
 *
 * Every action routes through the shared governed-action modal so acting role +
 * reason + fail-closed 403/409/422 details are handled uniformly. `approve`
 * additionally exposes optional downscale/limit overrides and makes the
 * approval-as-automatic-arm authorization explicit. The FSM legality is decided by the caller
 * (`intentActions`) — this composable only owns permission + wire orchestration.
 */
import type { OrderIntentView } from '@vben/types';

import type { GovernedField } from '#/shared/composables/governed-field';
import type { GovernedDetailRow } from '#/shared/composables/use-governed-action';

import { message } from 'antdv-next';

import {
  approveOrderIntent,
  cancelOrderIntent,
  rejectOrderIntent,
} from '#/api/order-intents';
import { $t } from '#/locales';
import {
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useOrderIntentStore } from '#/store';

import { buildApproveIntentRequest } from './approval-request';

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
      label: $t('page.quantIntents.detail.entry.amount'),
      value:
        intent.entry_order.amount.unit === 'usd'
          ? formatUsd(intent.entry_order.amount.value)
          : formatShares(intent.entry_order.amount.value),
    },
    {
      label: $t('page.quantIntents.approve.autoArmLabel'),
      value: $t('page.quantIntents.approve.autoArmValue'),
    },
    {
      label: $t('page.quantIntents.detail.identity.riskEnvelopeHash'),
      mono: true,
      value: intent.risk_envelope_hash,
    },
  ];
}

/** Unit-safe optional overrides plus the mandatory automatic-arm acknowledgement. */
function approveOverrideFields(intent: OrderIntentView): GovernedField[] {
  const amount = intent.entry_order.amount;
  return [
    {
      help: $t('page.quantIntents.approve.overrideAmountHelp', {
        amount:
          amount.unit === 'usd'
            ? formatUsd(amount.value)
            : formatShares(amount.value),
      }),
      kind: amount.unit,
      label: $t(`page.quantIntents.approve.overrideAmount.${amount.unit}`),
      name: 'override_amount',
    },
    {
      kind: 'price',
      label: $t('page.quantIntents.approve.overridePrice'),
      name: 'override_price',
    },
    {
      help: $t('page.quantIntents.approve.autoArmAcknowledgement'),
      kind: 'checkbox',
      label: $t('page.quantIntents.approve.autoArmConfirmLabel'),
      name: 'auto_arm_acknowledged',
      required: true,
    },
  ];
}

export function useIntentActions(onChanged: () => void) {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();
  const orderIntentStore = useOrderIntentStore();

  const canApprove = hasAccessByCodes(['order_intent:approve']);
  const canReject = hasAccessByCodes(['order_intent:reject']);
  const canCancel = hasAccessByCodes(['order_intent:cancel']);

  async function approve(
    intent: OrderIntentView,
  ): Promise<null | OrderIntentView> {
    const id = intent.order_intent_id;
    const result = await governed(
      (ctx) =>
        approveOrderIntent(
          id,
          buildApproveIntentRequest(intent, ctx.fields, ctx.reason),
          ctx,
        ),
      {
        details: intentPreview(intent),
        fields: approveOverrideFields(intent),
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

  return {
    approve,
    canApprove,
    canCancel,
    canReject,
    cancel,
    reject,
  };
}
