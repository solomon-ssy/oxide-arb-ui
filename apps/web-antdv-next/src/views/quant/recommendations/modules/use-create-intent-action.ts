/**
 * Governed "create order intent from recommendation" flow.
 *
 * Opens the canonical governed-action modal (acting role + reason), calls
 * `POST /quant/intents` with the recommendation id, and on success deep-links to
 * the newly created intent's full-screen detail. 409/403/422 fail-closed details
 * are surfaced by the shared governed modal — never swallowed.
 */
import type { OrderIntentView, QuantRecommendationView } from '@vben/types';

import { useRouter } from 'vue-router';

import { message } from 'antdv-next';

import { createOrderIntent } from '#/api/order-intents';
import { $t } from '#/locales';
import {
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

/**
 * Read-only preview rows shown in the governed modal so the operator confirms
 * exactly which entry / sizing / risk envelope will be frozen from the
 * recommendation before the intent is created.
 */
function createIntentDetails(recommendation: QuantRecommendationView) {
  if (recommendation.trade_plan.kind !== 'frozen') {
    return [];
  }
  const {
    entry: entryPlan,
    risk_envelope: riskEnvelope,
    sizing: sizingPlan,
  } = recommendation.trade_plan;
  return [
    {
      label: $t('page.quantRecommendations.createIntent.details.entryTrigger'),
      value:
        entryPlan.condition.kind === 'immediate'
          ? $t('page.quantRecommendations.entryPlan.immediate')
          : entryPlan.condition.content_hash,
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.limitPrice'),
      value: formatPrice(
        entryPlan.order_policy.kind === 'passive'
          ? entryPlan.order_policy.limit_price
          : entryPlan.order_policy.worst_price,
      ),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.suggestedUsd'),
      value: formatUsd(sizingPlan.suggested_usd),
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.suggestedShares',
      ),
      value: formatShares(sizingPlan.suggested_shares),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.envelopeHash'),
      mono: true,
      value: riskEnvelope.envelope_hash,
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.validUntil'),
      value: formatDateTimeLocal(recommendation.valid_until),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.maxLoss'),
      value: formatUsd(riskEnvelope.max_loss_usd),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.maxPosition'),
      value: formatUsd(riskEnvelope.max_position_usd),
    },
  ];
}

export function useCreateIntentAction() {
  const { governed } = useGovernedAction();
  const { hasAccessByCodes } = useQpAccess();
  const router = useRouter();

  const canCreate = hasAccessByCodes(['order_intent:create']);

  async function createIntent(
    recommendation: QuantRecommendationView,
  ): Promise<null | OrderIntentView> {
    if (recommendation.trade_plan.kind !== 'frozen') {
      return null;
    }
    const recommendationId = recommendation.recommendation_id;
    const intent = await governed(
      (ctx) =>
        createOrderIntent(
          { reason: ctx.reason, recommendation_id: recommendationId },
          ctx,
        ),
      {
        details: createIntentDetails(recommendation),
        summary: $t('page.quantRecommendations.createIntent.summary', {
          id: recommendationId,
        }),
        title: $t('page.quantRecommendations.createIntent.title'),
      },
    );
    if (intent) {
      message.success($t('page.quantRecommendations.createIntent.success'));
      void router.push(`/quant/intents/${intent.order_intent_id}`);
    }
    return intent;
  }

  return { canCreate, createIntent };
}
