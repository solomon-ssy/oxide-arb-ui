<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import type { WaterfallChartStep } from '#/shared/components/waterfall-chart.vue';

import { computed } from 'vue';

import {
  Alert,
  Card,
  Descriptions,
  DescriptionsItem,
  Tag,
  Timeline,
  TimelineItem,
  Tooltip,
} from 'antdv-next';

import { $t } from '#/locales';
import BulletList from '#/shared/components/bullet-list.vue';
import {
  EMPTY_PLACEHOLDER,
  formatBps,
  formatDateTimeLocal,
  formatDurationSecs,
  formatPercent,
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import WaterfallChart from '#/shared/components/waterfall-chart.vue';

defineOptions({ name: 'RecommendationPlans' });

const props = defineProps<{ recommendation: QuantRecommendationView }>();

const entry = computed(() => props.recommendation.entry_plan);
const sizing = computed(() => props.recommendation.sizing_plan);
const exit = computed(() => props.recommendation.exit_plan);
const risk = computed(() => props.recommendation.risk_envelope);

/**
 * The full f* → ×kelly_fraction → ×confidence → ×drawdown →
 * ×edge_uncertainty → ×correlation → raw → cap waterfall (Phase 11.3 §10).
 * `null` when the recommendation's return model is uncalibrated / edge-free
 * (no Kelly provenance was recorded for it).
 */
const waterfallSteps = computed<null | WaterfallChartStep[]>(() => {
  const plan = sizing.value;
  const fStar = toNumber(plan.f_star_applied);
  if (fStar === null) {
    return null;
  }
  const kellyFractionConfig = toNumber(plan.kelly_fraction_config_applied) ?? 1;
  const confidenceShrink = toNumber(plan.confidence_shrink_applied) ?? 1;
  const drawdownShrink = toNumber(plan.drawdown_shrink_applied) ?? 1;
  const edgeUncertaintyShrink =
    toNumber(plan.edge_uncertainty_shrink_applied) ?? 1;
  const correlationShrink = toNumber(plan.correlation_shrink_applied) ?? 1;
  const rawFraction = toNumber(plan.raw_fraction_applied);
  const positionCap = toNumber(plan.position_cap_fraction_applied);

  const binding = plan.binding_constraint;
  let running = fStar;
  const steps: WaterfallChartStep[] = [
    {
      key: 'f_star',
      label: $t('page.quantRecommendations.sizingPlan.waterfall.fStar'),
      factor: null,
      value: running,
      isBinding: false,
    },
  ];
  const stage = (
    key: string,
    labelKey: string,
    factor: number,
    bindingConstraint: string,
  ) => {
    running *= factor;
    steps.push({
      key,
      label: $t(`page.quantRecommendations.sizingPlan.waterfall.${labelKey}`),
      factor,
      value: running,
      isBinding: binding === bindingConstraint,
    });
  };
  stage('kelly_fraction', 'kellyFraction', kellyFractionConfig, 'kelly_cap');
  stage('confidence', 'confidence', confidenceShrink, 'confidence_cap');
  stage('drawdown', 'drawdown', drawdownShrink, 'drawdown_cap');
  stage(
    'edge_uncertainty',
    'edgeUncertainty',
    edgeUncertaintyShrink,
    '__none__',
  );
  stage('correlation', 'correlation', correlationShrink, 'correlation_cap');
  if (rawFraction !== null) {
    steps.push({
      key: 'raw_fraction',
      label: $t('page.quantRecommendations.sizingPlan.waterfall.rawFraction'),
      factor: null,
      value: rawFraction,
      isBinding: false,
    });
    running = rawFraction;
  }
  if (positionCap !== null) {
    const capped = Math.min(running, positionCap);
    steps.push({
      key: 'cap',
      label: $t('page.quantRecommendations.sizingPlan.waterfall.cap'),
      factor: null,
      value: capped,
      isBinding: binding === 'kelly_cap' && running > positionCap,
    });
    running = capped;
  }
  if (binding === 'aggregate_exposure_cap') {
    steps.push({
      key: 'aggregate_exposure_cap',
      label: $t(
        'page.quantRecommendations.sizingPlan.waterfall.aggregateExposureCap',
      ),
      factor: null,
      value: running,
      isBinding: true,
    });
  }
  return steps;
});

const bindingConstraintColor = computed(() => {
  const binding = sizing.value.binding_constraint;
  if (binding === 'none') {
    return 'default';
  }
  if (
    binding === 'aggregate_exposure_cap' ||
    binding === 'available_cash' ||
    binding === 'portfolio_budget'
  ) {
    return 'error';
  }
  return 'warning';
});

const bindingConstraintTooltip = computed(() =>
  $t('page.quantRecommendations.sizingPlan.bindingConstraintHelp', {
    constraint: $t(`enum.bindingConstraint.${sizing.value.binding_constraint}`),
  }),
);

function toNumber(value: null | string | undefined): null | number {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const trailingStopLabel = computed(() => {
  const stop = exit.value.trailing_stop;
  if (!stop) {
    return EMPTY_PLACEHOLDER;
  }
  const activation = stop.activation_price
    ? ` @ ${formatPrice(stop.activation_price)}`
    : '';
  return `${formatBps(stop.trail_bps)}${activation}`;
});

function boolTagColor(value: boolean): 'default' | 'success' {
  return value ? 'success' : 'default';
}

function boolLabel(value: boolean): string {
  return value ? $t('common.yes') : $t('common.no');
}

function millis(value: number): string {
  return `${value} ms`;
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
    <Card size="small" :title="$t('page.quantRecommendations.entryPlan.title')">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.trigger')"
        >
          <template v-if="entry.trigger.kind === 'price_condition'">
            {{ $t(`enum.priceComparison.${entry.trigger.comparison}`) }}
            {{ formatPrice(entry.trigger.threshold) }} ·
            {{ formatDurationSecs(entry.trigger.confirmation_secs) }}
          </template>
          <template v-else>
            {{ $t('page.quantRecommendations.entryPlan.immediate') }}
          </template>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.orderPolicy')"
        >
          {{
            $t(
              `page.quantRecommendations.entryPlan.orderPolicyKind.${entry.order_policy.kind}`,
            )
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.limitPrice')"
        >
          {{
            formatPrice(
              entry.order_policy.kind === 'passive'
                ? entry.order_policy.limit_price
                : entry.order_policy.worst_price,
            )
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.maxSlippage')"
        >
          {{ formatBps(entry.max_slippage_bps) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.minDepth')"
        >
          {{ formatUsd(entry.min_depth_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.maxBookAge')"
        >
          {{ millis(entry.max_book_age_ms) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.validFrom')"
        >
          {{ formatDateTimeLocal(entry.valid_from) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.validUntil')"
        >
          {{ formatDateTimeLocal(entry.valid_until) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.entryPlan.cancelIfNotTriggered')
          "
        >
          <Tag :color="boolTagColor(entry.cancel_if_not_triggered)">
            {{ boolLabel(entry.cancel_if_not_triggered) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.reason')"
        >
          {{ entry.entry_reason || EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Card
      size="small"
      :title="$t('page.quantRecommendations.sizingPlan.title')"
    >
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.suggested')"
        >
          {{ formatUsd(sizing.suggested_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.suggestedShares')"
        >
          {{ formatShares(sizing.suggested_shares) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.min')"
        >
          {{ formatUsd(sizing.min_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.max')"
        >
          {{ formatUsd(sizing.max_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.portfolioWeight')"
        >
          {{ formatPercent(sizing.portfolio_weight_pct) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.sizingPlan.marketExposureAfter')
          "
        >
          {{ formatUsd(sizing.market_exposure_after_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.eventExposureAfter')"
        >
          {{ formatUsd(sizing.event_exposure_after_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.sizingPlan.categoryExposureAfter')
          "
        >
          {{ formatUsd(sizing.category_exposure_after_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.bindingConstraint')"
        >
          <Tooltip :title="bindingConstraintTooltip">
            <Tag :color="bindingConstraintColor">
              {{ $t(`enum.bindingConstraint.${sizing.binding_constraint}`) }}
            </Tag>
          </Tooltip>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.sizingModel')"
        >
          {{ $t(`enum.sizingModelKind.${sizing.sizing_model}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.edge')"
        >
          {{ formatBps(sizing.edge_bps) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.kelly')"
        >
          {{ formatPercent(sizing.kelly_fraction_applied) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="sizing.edge_uncertainty_shrink_applied != null"
          :label="
            $t('page.quantRecommendations.sizingPlan.edgeUncertaintyShrink')
          "
        >
          {{ formatPercent(sizing.edge_uncertainty_shrink_applied) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="sizing.correlation_shrink_applied != null"
          :label="$t('page.quantRecommendations.sizingPlan.correlationShrink')"
        >
          {{ formatPercent(sizing.correlation_shrink_applied) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.reason')"
        >
          {{ sizing.sizing_reason || EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
      </Descriptions>

      <div v-if="waterfallSteps" class="mt-3">
        <p class="text-muted-foreground mb-2 text-xs">
          {{ $t('page.quantRecommendations.sizingPlan.waterfall.title') }}
        </p>
        <WaterfallChart :steps="waterfallSteps" />
      </div>
      <Alert
        v-else
        class="mt-3"
        :message="
          $t('page.quantRecommendations.sizingPlan.waterfall.uncalibrated')
        "
        show-icon
        type="error"
      />
    </Card>

    <Card size="small" :title="$t('page.quantRecommendations.exitPlan.title')">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.takeProfitPrice')"
        >
          {{ formatPrice(exit.take_profit_price) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.takeProfitPct')"
        >
          {{ formatPercent(exit.take_profit_pct) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.stopLossPrice')"
        >
          {{ formatPrice(exit.stop_loss_price) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.stopLossPct')"
        >
          {{ formatPercent(exit.stop_loss_pct) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.timeExitAt')"
        >
          {{ formatDateTimeLocal(exit.time_exit_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.maxHold')"
        >
          {{ formatDurationSecs(exit.max_hold_secs) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.settlementMode')"
        >
          {{ $t(`enum.exitSettlementMode.${exit.settlement_mode}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.redeemPolicy')"
        >
          {{ $t(`enum.redeemPolicy.${exit.redeem_policy}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.trailingStop')"
        >
          {{ trailingStopLabel }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.manualReviewAt')"
        >
          {{ formatDateTimeLocal(exit.manual_review_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.reason')"
        >
          {{ exit.exit_reason || EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
      </Descriptions>

      <Timeline v-if="exit.scale_out_targets.length > 0" class="mt-4">
        <TimelineItem
          v-for="target in exit.scale_out_targets"
          :key="target.target_id"
        >
          <div class="flex flex-col gap-1">
            <strong>{{ target.target_id }}</strong>
            <span class="text-muted-foreground text-xs">
              {{ formatPrice(target.trigger_price) }} →
              {{ formatPercent(target.target_cumulative_exit_pct) }} ·
              {{ formatPrice(target.min_price) }}
            </span>
            <span>{{ target.reason }}</span>
          </div>
        </TimelineItem>
      </Timeline>
      <Descriptions class="mt-3" :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.minScoreRetention')"
        >
          {{ formatPercent(exit.thesis_invalidation.min_score_retention) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.minExpectedReturn')"
        >
          {{ formatBps(exit.thesis_invalidation.min_expected_return_bps) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.requireEligibility')"
        >
          {{
            boolLabel(exit.thesis_invalidation.require_execution_eligibility)
          }}
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Card
      size="small"
      :title="$t('page.quantRecommendations.riskEnvelope.title')"
    >
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.maxLoss')"
        >
          {{ formatUsd(risk.max_loss_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.maxPosition')"
        >
          {{ formatUsd(risk.max_position_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.riskEnvelope.maxMarketExposure')
          "
        >
          {{ formatUsd(risk.max_market_exposure_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.maxEventExposure')"
        >
          {{ formatUsd(risk.max_event_exposure_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.riskEnvelope.maxCategoryExposure')
          "
        >
          {{ formatUsd(risk.max_category_exposure_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.maxSlippage')"
        >
          {{ formatBps(risk.max_slippage_bps) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.requiresApproval')"
        >
          <Tag :color="boolTagColor(risk.requires_approval)">
            {{ boolLabel(risk.requires_approval) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.riskEnvelope.autoExecutionAllowed')
          "
        >
          <Tag :color="boolTagColor(risk.auto_execution_allowed)">
            {{ boolLabel(risk.auto_execution_allowed) }}
          </Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.envelopeHash')"
        >
          <span class="font-mono text-xs break-all">{{
            risk.envelope_hash
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          v-if="risk.risk_notes.length > 0"
          :label="$t('page.quantRecommendations.riskEnvelope.notes')"
        >
          <BulletList :items="risk.risk_notes" />
        </DescriptionsItem>
      </Descriptions>
    </Card>
  </div>
</template>
