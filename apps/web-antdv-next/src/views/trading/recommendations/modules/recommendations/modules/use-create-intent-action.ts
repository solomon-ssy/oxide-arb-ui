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
  formatDurationSecs,
  formatPercent,
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
  const {
    entry: entryPlan,
    risk_envelope: riskEnvelope,
    sizing: sizingPlan,
  } = recommendation.trade_plan;
  const tierEntry = recommendation.economic_tier.entry_execution;
  const rebateApplicable = tierEntry.kind === 'passive';
  const rebateTerms = sizingPlan.maker_rebate_terms;
  const rebateSchedule =
    rebateTerms.state === 'passive_program' ? rebateTerms.schedule : null;
  let rebateTermsHash = '—';
  let rebateAvailableAt: null | string = null;
  if (rebateTerms.state === 'passive_program') {
    rebateTermsHash = rebateTerms.schedule.terms_hash;
    rebateAvailableAt = rebateTerms.schedule.available_at;
  } else if (rebateTerms.state === 'passive_no_program') {
    rebateTermsHash = rebateTerms.terms_hash;
    rebateAvailableAt = rebateTerms.available_at;
  }
  const objectiveStatus = sizingPlan.maker_rebate_objective_status;
  const rebateDelay = sizingPlan.rebate_delay_basis;
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
      label: $t(
        'page.quantRecommendations.createIntent.details.hardReservedCash',
      ),
      value: formatUsd(sizingPlan.hard_reserved_cash_usd),
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.requestedShares',
      ),
      value: formatShares(sizingPlan.requested_shares),
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.expectedFilledShares',
      ),
      value: formatShares(sizingPlan.expected_filled_shares),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.immediateFee'),
      value: formatUsd(sizingPlan.immediate_fee_usd),
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.rebateProgramState',
      ),
      value: $t(
        `page.quantRecommendations.sizingPlan.rebateState.${rebateTerms.state}`,
      ),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.rebateRate'),
      value:
        rebateApplicable && rebateSchedule
          ? formatPercent(rebateSchedule.rebate_rate)
          : '—',
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.rebateTermsHash',
      ),
      mono: true,
      value: rebateTermsHash,
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.rebateAvailableAt',
      ),
      value: rebateAvailableAt ? formatDateTimeLocal(rebateAvailableAt) : '—',
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.rebateAccrual'),
      value: rebateApplicable
        ? `${formatUsd(sizingPlan.expected_maker_rebate_accrual_usd)} · ${$t('page.quantRecommendations.sizingPlan.rebateNotice')}`
        : '—',
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.rebateObjective',
      ),
      value: rebateApplicable
        ? formatUsd(sizingPlan.objective_maker_rebate_usd)
        : '—',
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.rebateDailyThreshold',
      ),
      value:
        tierEntry.kind === 'passive'
          ? formatUsd(tierEntry.maker_rebate_valuation.payout_threshold_usd)
          : '—',
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.rebateCreditWindow',
      ),
      value:
        rebateApplicable && rebateDelay
          ? formatDurationSecs(rebateDelay.lag_from_program_close_secs)
          : '—',
    },
    {
      label: $t(
        'page.quantRecommendations.createIntent.details.rebateObjectiveStatus',
      ),
      value:
        objectiveStatus.state === 'zero'
          ? `${$t(`page.quantRecommendations.sizingPlan.rebateObjectiveState.${objectiveStatus.state}`)} · ${$t(`page.quantRecommendations.sizingPlan.rebateZeroReason.${objectiveStatus.reason}`)}`
          : $t(
              `page.quantRecommendations.sizingPlan.rebateObjectiveState.${objectiveStatus.state}`,
            ),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.route'),
      value: $t(
        `page.quantRecommendations.entryPlan.orderPolicyKind.${entryPlan.order_policy.kind}`,
      ),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.postOnly'),
      value:
        entryPlan.order_policy.kind === 'passive'
          ? $t('common.yes')
          : $t('common.no'),
    },
    {
      label: $t('page.quantRecommendations.createIntent.details.ttl'),
      value:
        tierEntry.kind === 'passive'
          ? formatDurationSecs(tierEntry.good_til_secs)
          : '—',
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
      void router.push(
        `/execution/orders?module=intents&entity=order-intent&id=${intent.order_intent_id}`,
      );
    }
    return intent;
  }

  return { canCreate, createIntent };
}
