<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import type { WaterfallChartStep } from '#/shared/components/waterfall-chart.vue';

import { computed } from 'vue';

import {
  Alert,
  Card,
  Collapse,
  CollapsePanel,
  Descriptions,
  DescriptionsItem,
  Table,
  Tag,
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
    'aggregate_exposure_cap',
  );
  stage('correlation', 'correlation', correlationShrink, 'correlation_cap');
  if (positionCap !== null) {
    steps.push({
      key: 'cap',
      label: $t('page.quantRecommendations.sizingPlan.waterfall.cap'),
      factor: null,
      value: Math.min(running, positionCap),
      isBinding: running > positionCap,
    });
  }
  return steps;
});

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

const partialExitColumns = [
  {
    dataIndex: 'node_id',
    key: 'node_id',
    title: $t('page.quantRecommendations.exitPlan.partialExit.node'),
  },
  {
    dataIndex: 'trigger_kind',
    key: 'trigger_kind',
    title: $t('page.quantRecommendations.exitPlan.partialExit.trigger'),
    width: 130,
  },
  {
    align: 'right' as const,
    dataIndex: 'trigger_value',
    key: 'trigger_value',
    title: $t('page.quantRecommendations.exitPlan.partialExit.triggerValue'),
    width: 100,
  },
  {
    align: 'right' as const,
    dataIndex: 'sell_pct',
    key: 'sell_pct',
    title: $t('page.quantRecommendations.exitPlan.partialExit.sellPct'),
    width: 90,
  },
  {
    align: 'right' as const,
    dataIndex: 'min_price',
    key: 'min_price',
    title: $t('page.quantRecommendations.exitPlan.partialExit.minPrice'),
    width: 100,
  },
  {
    dataIndex: 'reason',
    key: 'reason',
    title: $t('page.quantRecommendations.exitPlan.partialExit.reason'),
  },
];

const invalidationColumns = [
  {
    dataIndex: 'rule_id',
    key: 'rule_id',
    title: $t('page.quantRecommendations.exitPlan.invalidation.rule'),
    width: 160,
  },
  {
    dataIndex: 'description',
    key: 'description',
    title: $t('page.quantRecommendations.exitPlan.invalidation.description'),
  },
  {
    align: 'right' as const,
    dataIndex: 'threshold',
    key: 'threshold',
    title: $t('page.quantRecommendations.exitPlan.invalidation.threshold'),
    width: 120,
  },
];

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
          {{ $t(`enum.entryTriggerKind.${entry.trigger_kind}`) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.triggerPrice')"
        >
          {{ formatPrice(entry.trigger_price) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.limitPrice')"
        >
          {{ formatPrice(entry.limit_price) }}
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
          <Tag>
            {{ $t(`enum.bindingConstraint.${sizing.binding_constraint}`) }}
          </Tag>
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
        type="info"
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

      <Collapse
        v-if="
          exit.partial_exit_nodes.length > 0 ||
          exit.signal_invalidation_rules.length > 0
        "
        class="mt-3"
        ghost
      >
        <CollapsePanel
          v-if="exit.partial_exit_nodes.length > 0"
          key="partial-exits"
          :header="`${$t('page.quantRecommendations.exitPlan.partialExits')} (${exit.partial_exit_nodes.length})`"
        >
          <Table
            :columns="partialExitColumns"
            :data-source="exit.partial_exit_nodes"
            :pagination="false"
            row-key="node_id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'trigger_kind'">
                {{ $t(`enum.exitTriggerKind.${record.trigger_kind}`) }}
              </template>
              <template v-else-if="column.key === 'trigger_value'">
                <span class="font-mono">{{ record.trigger_value }}</span>
              </template>
              <template v-else-if="column.key === 'sell_pct'">
                <span class="font-mono">{{
                  formatPercent(record.sell_pct)
                }}</span>
              </template>
              <template v-else-if="column.key === 'min_price'">
                <span class="font-mono">{{
                  record.min_price === null
                    ? EMPTY_PLACEHOLDER
                    : formatPrice(record.min_price)
                }}</span>
              </template>
            </template>
          </Table>
        </CollapsePanel>
        <CollapsePanel
          v-if="exit.signal_invalidation_rules.length > 0"
          key="invalidation-rules"
          :header="`${$t('page.quantRecommendations.exitPlan.invalidationRules')} (${exit.signal_invalidation_rules.length})`"
        >
          <Table
            :columns="invalidationColumns"
            :data-source="exit.signal_invalidation_rules"
            :pagination="false"
            row-key="rule_id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'threshold'">
                <span class="font-mono">{{
                  record.threshold ?? EMPTY_PLACEHOLDER
                }}</span>
              </template>
            </template>
          </Table>
        </CollapsePanel>
      </Collapse>
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
