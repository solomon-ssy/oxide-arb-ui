<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed } from 'vue';

import {
  Card,
  Descriptions,
  DescriptionsItem,
  Table,
  Tag,
  Timeline,
  TimelineItem,
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
import { vAccessibleTableScroll } from '#/shared/directives/accessible-table-scroll';
import { centerTableColumns } from '#/shared/table/center-columns';

defineOptions({ name: 'RecommendationPlans' });

const props = defineProps<{ recommendation: QuantRecommendationView }>();

const entry = computed(() => props.recommendation.trade_plan.entry);
const sizing = computed(() => props.recommendation.trade_plan.sizing);
const exitAuthority = computed(() => props.recommendation.trade_plan.exit);
const exit = computed(() =>
  exitAuthority.value.kind === 'executable' ? exitAuthority.value.plan : null,
);
const bootstrapGuidance = computed(() =>
  exitAuthority.value.kind === 'bootstrap_advisory'
    ? exitAuthority.value.guidance
    : null,
);
const risk = computed(() => props.recommendation.trade_plan.risk_envelope);
const tier = computed(() => props.recommendation.economic_tier);
const tierEntry = computed(() => tier.value.entry_execution);
const rebateApplicable = computed(() => tierEntry.value.kind === 'passive');
const rebateTerms = computed(() => sizing.value.maker_rebate_terms);
const rebateSchedule = computed(() =>
  rebateTerms.value.state === 'passive_program'
    ? rebateTerms.value.schedule
    : null,
);
const rebateAvailableAt = computed(() => {
  if (rebateTerms.value.state === 'passive_program') {
    return rebateTerms.value.schedule.available_at;
  }
  if (rebateTerms.value.state === 'passive_no_program') {
    return rebateTerms.value.available_at;
  }
  return null;
});
const rebateTermsHash = computed(() => {
  if (rebateTerms.value.state === 'passive_program') {
    return rebateTerms.value.schedule.terms_hash;
  }
  if (rebateTerms.value.state === 'passive_no_program') {
    return rebateTerms.value.terms_hash;
  }
  return null;
});
const rebateObjectiveReason = computed(() => {
  const status = sizing.value.maker_rebate_objective_status;
  return status.state === 'zero' ? status.reason : null;
});
const rebateDelayLabel = computed(() => {
  const basis = sizing.value.rebate_delay_basis;
  if (!basis) return EMPTY_PLACEHOLDER;
  const lag = formatDurationSecs(basis.lag_from_program_close_secs);
  return basis.kind === 'observed_p95'
    ? $t('page.quantRecommendations.sizingPlan.rebateDelayObserved', {
        days: basis.complete_program_days,
        lag,
      })
    : $t('page.quantRecommendations.sizingPlan.rebateDelayFallback', { lag });
});

const scenarioColumns = [
  {
    dataIndex: 'scenario_index',
    key: 'scenario_index',
    title: $t('page.quantRecommendations.economicTier.scenario'),
    width: 120,
  },
  {
    dataIndex: 'maker_rebate_program_date',
    key: 'maker_rebate_program_date',
    title: $t('page.quantRecommendations.economicTier.programDate'),
    width: 130,
  },
  {
    dataIndex: 'maker_rebate_program_day_baseline_usd',
    key: 'maker_rebate_program_day_baseline_usd',
    title: $t('page.quantRecommendations.economicTier.rebateBaseline'),
    width: 160,
  },
  {
    dataIndex: 'maker_rebate_program_day_total_usd',
    key: 'maker_rebate_program_day_total_usd',
    title: $t('page.quantRecommendations.economicTier.rebateDayTotal'),
    width: 160,
  },
  {
    dataIndex: 'maker_rebate_accrual_usd',
    key: 'maker_rebate_accrual_usd',
    title: $t('page.quantRecommendations.economicTier.rebateAccrual'),
    width: 150,
  },
  {
    dataIndex: 'maker_rebate_credit_status',
    key: 'maker_rebate_credit_status',
    title: $t('page.quantRecommendations.economicTier.rebateCreditStatus'),
    width: 160,
  },
  {
    dataIndex: 'maker_rebate_expected_by',
    key: 'maker_rebate_expected_by',
    title: $t('page.quantRecommendations.economicTier.rebateExpectedBy'),
    width: 190,
  },
  {
    dataIndex: 'objective_maker_rebate_usd',
    key: 'objective_maker_rebate_usd',
    title: $t('page.quantRecommendations.economicTier.rebateObjective'),
    width: 170,
  },
  {
    dataIndex: 'discounted_net_usd',
    key: 'discounted_net_usd',
    title: $t('page.quantRecommendations.economicTier.discountedNet'),
    width: 150,
  },
  {
    dataIndex: 'risk_net_usd',
    key: 'risk_net_usd',
    title: $t('page.quantRecommendations.economicTier.riskNet'),
    width: 140,
  },
];
const occupancyColumns = [
  {
    dataIndex: 'end_secs',
    key: 'end_secs',
    title: $t('page.quantRecommendations.economicTier.bucketEnd'),
  },
  {
    dataIndex: 'reserved_cash_usd',
    key: 'reserved_cash_usd',
    title: $t('page.quantRecommendations.economicTier.reservedCash'),
  },
];

const trailingStopLabel = computed(() => {
  if (!exit.value) {
    return EMPTY_PLACEHOLDER;
  }
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
  <div
    class="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2"
    data-testid="recommendation-plans"
  >
    <Card size="small" :title="$t('page.quantRecommendations.entryPlan.title')">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.trigger')"
        >
          <template v-if="entry.condition.kind === 'immediate'">
            {{ $t('page.quantRecommendations.entryPlan.immediate') }}
          </template>
          <span
            v-else
            class="font-mono text-xs break-all"
            data-screenshot-volatile="true"
          >
            {{ entry.condition.content_hash }}
          </span>
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
          <span data-screenshot-volatile="true">
            {{ formatDateTimeLocal(entry.valid_from) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.entryPlan.validUntil')"
        >
          <span data-screenshot-volatile="true">
            {{ formatDateTimeLocal(entry.valid_until) }}
          </span>
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
          :label="$t('page.quantRecommendations.sizingPlan.hardReservedCash')"
        >
          {{ formatUsd(sizing.hard_reserved_cash_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.requestedShares')"
        >
          {{ formatShares(sizing.requested_shares) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.sizingPlan.expectedFilledShares')
          "
        >
          {{ formatShares(sizing.expected_filled_shares) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.immediateFee')"
        >
          {{ formatUsd(sizing.immediate_fee_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.rebateProgramState')"
        >
          {{
            $t(
              `page.quantRecommendations.sizingPlan.rebateState.${rebateTerms.state}`,
            )
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.rebateRate')"
        >
          {{
            rebateApplicable && rebateSchedule
              ? formatPercent(rebateSchedule.rebate_rate)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.rebateTermsHash')"
        >
          <span v-if="rebateTermsHash" class="font-mono text-xs break-all">
            {{ rebateTermsHash }}
          </span>
          <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.rebateAvailableAt')"
        >
          {{
            rebateAvailableAt
              ? formatDateTimeLocal(rebateAvailableAt)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.rebateAccrual')"
        >
          {{
            rebateApplicable
              ? formatUsd(sizing.expected_maker_rebate_accrual_usd)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.rebateObjective')"
        >
          {{
            rebateApplicable
              ? formatUsd(sizing.objective_maker_rebate_usd)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.sizingPlan.rebateDailyThreshold')
          "
        >
          {{
            tierEntry.kind === 'passive'
              ? formatUsd(tierEntry.maker_rebate_valuation.payout_threshold_usd)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.rebateCreditWindow')"
        >
          {{ rebateApplicable ? rebateDelayLabel : EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.sizingPlan.rebateObjectiveStatus')
          "
        >
          <div class="flex flex-col gap-1">
            <Tag
              :color="
                sizing.maker_rebate_objective_status.state ===
                'scenario_weighted'
                  ? 'success'
                  : 'default'
              "
            >
              {{
                $t(
                  `page.quantRecommendations.sizingPlan.rebateObjectiveState.${sizing.maker_rebate_objective_status.state}`,
                )
              }}
            </Tag>
            <span
              v-if="
                sizing.maker_rebate_objective_status.state ===
                'scenario_weighted'
              "
              class="text-muted-foreground text-xs"
            >
              {{
                formatBps(
                  sizing.maker_rebate_objective_status.credited_probability_bps,
                )
              }}
            </span>
            <span v-if="rebateObjectiveReason" class="text-warning text-xs">
              {{
                $t(
                  `page.quantRecommendations.sizingPlan.rebateZeroReason.${rebateObjectiveReason}`,
                )
              }}
            </span>
            <span v-if="rebateApplicable" class="text-muted-foreground text-xs">
              {{ $t('page.quantRecommendations.sizingPlan.rebateNotice') }}
            </span>
          </div>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.economicTierId')"
        >
          <span class="font-mono text-xs break-all">{{
            sizing.economic_tier_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="
            $t('page.quantRecommendations.sizingPlan.referenceEntryPrice')
          "
        >
          {{ formatPrice(sizing.reference_entry_price) }}
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
          :label="$t('page.quantRecommendations.sizingPlan.routeExposureAfter')"
        >
          {{ formatUsd(sizing.route_exposure_after_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.capitalTime')"
        >
          {{ sizing.capital_occupancy_usd_hours }} USD·h
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.sizingPlan.reason')"
        >
          {{ sizing.sizing_reason || EMPTY_PLACEHOLDER }}
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <Card
      data-testid="economic-tier-evidence"
      size="small"
      :title="$t('page.quantRecommendations.economicTier.title')"
    >
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.economicTier.route')"
        >
          {{
            $t(
              `page.quantRecommendations.entryPlan.orderPolicyKind.${tierEntry.kind}`,
            )
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.economicTier.requestedShares')"
        >
          {{ formatShares(tierEntry.requested_shares) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.economicTier.limitPrice')"
        >
          {{ formatPrice(tierEntry.limit_price) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.economicTier.postOnly')"
        >
          {{ boolLabel(tierEntry.kind === 'passive') }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.economicTier.ttl')"
        >
          {{
            tierEntry.kind === 'passive'
              ? formatDurationSecs(tierEntry.good_til_secs)
              : EMPTY_PLACEHOLDER
          }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="tierEntry.kind === 'aggressive'"
          :label="$t('page.quantRecommendations.economicTier.slippage')"
        >
          {{ formatUsd(tierEntry.slippage_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.economicTier.visibleLiquidity')"
        >
          {{ formatUsd(tierEntry.visible_liquidity_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.economicTier.lineageHash')"
        >
          <span class="font-mono text-xs break-all">{{
            tier.lineage_hash
          }}</span>
        </DescriptionsItem>
      </Descriptions>
      <div class="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <div class="min-w-0">
          <Table
            v-accessible-table-scroll="
              $t('page.quantRecommendations.economicTier.cashflowScrollLabel')
            "
            :columns="centerTableColumns(scenarioColumns) ?? scenarioColumns"
            :data-source="tier.scenario_cashflows"
            :pagination="false"
            row-key="scenario_index"
            :scroll="{ x: 1580 }"
            size="small"
            :title="
              () => $t('page.quantRecommendations.economicTier.cashflows')
            "
          >
            <template #bodyCell="{ column, record }">
              <span
                v-if="column.key === 'maker_rebate_accrual_usd'"
                class="font-mono"
              >
                {{
                  rebateApplicable
                    ? formatUsd(record.maker_rebate_accrual_usd)
                    : EMPTY_PLACEHOLDER
                }}
              </span>
              <span
                v-else-if="column.key === 'objective_maker_rebate_usd'"
                class="font-mono"
              >
                {{
                  rebateApplicable
                    ? formatUsd(record.objective_maker_rebate_usd)
                    : EMPTY_PLACEHOLDER
                }}
              </span>
              <span
                v-else-if="
                  column.key === 'maker_rebate_program_day_baseline_usd' ||
                  column.key === 'maker_rebate_program_day_total_usd'
                "
                class="font-mono"
              >
                {{
                  rebateApplicable
                    ? formatUsd(
                        column.key === 'maker_rebate_program_day_baseline_usd'
                          ? record.maker_rebate_program_day_baseline_usd
                          : record.maker_rebate_program_day_total_usd,
                      )
                    : EMPTY_PLACEHOLDER
                }}
              </span>
              <span v-else-if="column.key === 'maker_rebate_program_date'">
                {{
                  rebateApplicable
                    ? record.maker_rebate_program_date || EMPTY_PLACEHOLDER
                    : EMPTY_PLACEHOLDER
                }}
              </span>
              <Tag
                v-else-if="column.key === 'maker_rebate_credit_status'"
                :color="
                  record.maker_rebate_credit_status === 'credited'
                    ? 'success'
                    : 'default'
                "
              >
                {{
                  rebateApplicable
                    ? $t(
                        `page.quantRecommendations.economicTier.rebateCreditState.${record.maker_rebate_credit_status}`,
                      )
                    : EMPTY_PLACEHOLDER
                }}
              </Tag>
              <span v-else-if="column.key === 'maker_rebate_expected_by'">
                {{
                  rebateApplicable && record.maker_rebate_expected_by
                    ? formatDateTimeLocal(record.maker_rebate_expected_by)
                    : EMPTY_PLACEHOLDER
                }}
              </span>
              <span
                v-else-if="column.key === 'discounted_net_usd'"
                class="font-mono"
              >
                {{ formatUsd(record.discounted_net_usd) }}
              </span>
              <span v-else-if="column.key === 'risk_net_usd'" class="font-mono">
                {{ formatUsd(record.risk_net_usd) }}
              </span>
            </template>
          </Table>
        </div>
        <Table
          :columns="centerTableColumns(occupancyColumns) ?? occupancyColumns"
          :data-source="tier.hard_reservation_envelope"
          :pagination="false"
          row-key="end_secs"
          size="small"
          :title="() => $t('page.quantRecommendations.economicTier.occupancy')"
        >
          <template #bodyCell="{ column, record }">
            <span v-if="column.key === 'end_secs'">
              {{ formatDurationSecs(record.end_secs) }}
            </span>
            <span
              v-else-if="column.key === 'reserved_cash_usd'"
              class="font-mono"
            >
              {{ formatUsd(record.reserved_cash_usd) }}
            </span>
          </template>
        </Table>
      </div>
    </Card>

    <Card size="small" :title="$t('page.quantRecommendations.exitPlan.title')">
      <Descriptions v-if="exit" :column="1" bordered size="small">
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

      <Timeline v-if="exit && exit.scale_out_targets.length > 0" class="mt-4">
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
      <Descriptions v-if="exit" class="mt-3" :column="1" bordered size="small">
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
            boolLabel(exit.thesis_invalidation.require_route_gate_eligibility)
          }}
        </DescriptionsItem>
      </Descriptions>
      <Descriptions
        v-else-if="bootstrapGuidance"
        :column="1"
        bordered
        size="small"
      >
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.bootstrapAdvisory')"
        >
          {{ bootstrapGuidance.guidance }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.manualReviewAt')"
        >
          {{ formatDateTimeLocal(bootstrapGuidance.manual_review_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.exitPlan.referenceHorizon')"
        >
          {{ formatDurationSecs(bootstrapGuidance.reference_horizon_secs) }}
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
          :label="$t('page.quantRecommendations.riskEnvelope.maxRouteExposure')"
        >
          {{ formatUsd(risk.max_route_exposure_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.cvarContribution')"
        >
          {{ formatUsd(risk.cvar_contribution_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.portfolioCvarCap')"
        >
          {{ formatUsd(risk.portfolio_cvar_cap_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.scenarioLossCap')"
        >
          {{ formatUsd(risk.maximum_scenario_loss_cap_usd) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.riskEnvelope.maxSlippage')"
        >
          {{ formatBps(risk.max_slippage_bps) }}
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

<style scoped>
@media (max-width: 640px) {
  :deep(.ant-descriptions-row) {
    display: flex;
    flex-direction: column;
  }

  :deep(.ant-descriptions-item-label),
  :deep(.ant-descriptions-item-content) {
    box-sizing: border-box;
    display: block;
    width: 100%;
    min-width: 0;
    overflow-wrap: anywhere;
    white-space: normal;
  }
}
</style>
