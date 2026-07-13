<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  TabPane,
  Tabs,
  Tag,
  Tooltip,
} from 'antdv-next';

import { $t } from '#/locales';
import BulletList from '#/shared/components/bullet-list.vue';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  EMPTY_PLACEHOLDER,
  formatBps,
  formatDateTimeLocal,
  formatDurationSecs,
  formatPercent,
  formatPrice,
  formatScore,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  useOutcomeSideTagOptions,
  useQuantRuntimeModeTagOptions,
  useRecommendationStatusTagOptions,
} from '#/shared/components/format/tag-options';
import { useSystemStore } from '#/store';

import { useCreateIntentAction } from './use-create-intent-action';
import { evaluateCreateIntentGate } from './use-create-intent-gate';
import RecommendationAttribution from './widgets/recommendation-attribution.vue';
import RecommendationEvidence from './widgets/recommendation-evidence.vue';
import RecommendationFactors from './widgets/recommendation-factors.vue';
import RecommendationPlans from './widgets/recommendation-plans.vue';

defineOptions({ name: 'RecommendationDetailPanel' });

const props = defineProps<{
  /** Preselected detail tab (e.g. `attribution` from a position deep link). */
  initialTab?: string;
  recommendation: QuantRecommendationView;
}>();

const systemStore = useSystemStore();
const { canCreate, createIntent } = useCreateIntentAction();

const sideTagOptions = useOutcomeSideTagOptions();
const statusTagOptions = useRecommendationStatusTagOptions();
const modeTagOptions = useQuantRuntimeModeTagOptions();

const DETAIL_TABS = new Set(['attribution', 'evidence']);
const detailTab = ref(
  props.initialTab && DETAIL_TABS.has(props.initialTab)
    ? props.initialTab
    : 'evidence',
);

// A deep link may change the requested tab without remounting the panel.
watch(
  () => props.initialTab,
  (tab) => {
    if (tab && DETAIL_TABS.has(tab)) {
      detailTab.value = tab;
    }
  },
);

const context = computed(() => props.recommendation.market_context);
const eligibility = computed(() => props.recommendation.execution_eligibility);
type FrozenTradePlan = Extract<
  QuantRecommendationView['trade_plan'],
  { kind: 'frozen' }
>;
function requireFrozenPlan(): FrozenTradePlan {
  const plan = props.recommendation.trade_plan;
  if (plan.kind !== 'frozen') {
    throw new Error('frozen trade plan required');
  }
  return plan;
}
const entry = computed(() => requireFrozenPlan().entry);
const sizing = computed(() => requireFrozenPlan().sizing);
const exit = computed(() => requireFrozenPlan().exit);

const entryPrice = computed(() =>
  entry.value.order_policy.kind === 'passive'
    ? entry.value.order_policy.limit_price
    : entry.value.order_policy.worst_price,
);

const gate = computed(() =>
  evaluateCreateIntentGate({
    canCreate,
    killSwitchState: systemStore.status?.kill_switch.state ?? null,
    recommendation: props.recommendation,
    runtimeMode: systemStore.status?.quant_runtime_mode ?? null,
  }),
);

const createDisabledReason = computed(() =>
  gate.value.reason
    ? $t(`page.quantRecommendations.createIntent.disabled.${gate.value.reason}`)
    : '',
);

function onCreateIntent() {
  if (gate.value.enabled) {
    void createIntent(props.recommendation);
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground text-sm">
            #{{ recommendation.rank }}
          </span>
          <Tag
            :color="
              findTagOption(sideTagOptions, recommendation.outcome_side)?.color
            "
          >
            {{
              findTagOption(sideTagOptions, recommendation.outcome_side)?.label
            }}
          </Tag>
          <Tag
            :color="
              findTagOption(statusTagOptions, recommendation.status)?.color
            "
          >
            {{ findTagOption(statusTagOptions, recommendation.status)?.label }}
          </Tag>
        </div>
        <span class="text-base font-medium">
          {{ recommendation.identity.question }}
        </span>
      </div>
      <Tooltip :title="createDisabledReason">
        <Button
          data-testid="create-intent"
          :disabled="!gate.enabled"
          type="primary"
          @click="onCreateIntent"
        >
          {{ $t('page.quantRecommendations.createIntent.button') }}
        </Button>
      </Tooltip>
    </div>

    <Alert
      v-if="recommendation.trade_plan.kind === 'unavailable'"
      data-testid="trade-plan-unavailable"
      :description="
        recommendation.trade_plan.blockers
          .map((blocker) =>
            $t(`page.quantRecommendations.tradePlan.blocker.${blocker}`),
          )
          .join(' · ')
      "
      :message="$t('page.quantRecommendations.tradePlan.unavailable')"
      show-icon
      type="warning"
    />

    <Card
      v-else
      class="border-primary/30"
      size="small"
      :title="$t('page.quantRecommendations.decisionSummary.title')"
    >
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.quantRecommendations.decisionSummary.instrument')"
        >
          <div class="flex flex-col gap-1">
            <span class="font-medium">
              {{ recommendation.identity.outcome_name }} ·
              {{ recommendation.identity.question }}
            </span>
            <span class="text-muted-foreground font-mono text-xs break-all">
              {{ recommendation.token_id }}
            </span>
          </div>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.decisionSummary.trigger')"
        >
          <template v-if="entry.trigger.kind === 'price_condition'">
            {{ $t(`enum.priceComparison.${entry.trigger.comparison}`) }}
            {{ formatPrice(entry.trigger.threshold) }} ·
            {{ formatDurationSecs(entry.trigger.confirmation_secs) }}
          </template>
          <template v-else>
            {{ $t('page.quantRecommendations.entryPlan.immediate') }}
          </template>
          <span class="text-muted-foreground ml-2 text-xs">
            {{ formatDateTimeLocal(entry.valid_from) }} –
            {{ formatDateTimeLocal(entry.valid_until) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.decisionSummary.notional')"
        >
          <span class="font-mono">{{ formatUsd(sizing.suggested_usd) }}</span>
          <span class="text-muted-foreground ml-2">
            {{ sizing.suggested_shares }}
            {{ $t('page.quantRecommendations.decisionSummary.shares') }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.decisionSummary.worstPrice')"
        >
          <span class="font-mono">{{ formatPrice(entryPrice) }}</span>
          <span class="text-muted-foreground ml-2">
            {{
              $t(
                `page.quantRecommendations.entryPlan.orderPolicyKind.${entry.order_policy.kind}`,
              )
            }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.decisionSummary.exit')"
        >
          <div class="flex flex-wrap items-center gap-2">
            <Tag v-if="exit.take_profit_price" color="green">
              {{ $t('page.quantRecommendations.exitPlan.takeProfitPrice') }}
              {{ formatPrice(exit.take_profit_price) }}
            </Tag>
            <Tag v-if="exit.stop_loss_price" color="red">
              {{ $t('page.quantRecommendations.exitPlan.stopLossPrice') }}
              {{ formatPrice(exit.stop_loss_price) }}
            </Tag>
            <Tag v-if="exit.scale_out_targets.length > 0" color="blue">
              {{
                $t(
                  'page.quantRecommendations.decisionSummary.scaleOutTargets',
                  {
                    count: exit.scale_out_targets.length,
                  },
                )
              }}
            </Tag>
            <Tag v-if="exit.trailing_stop" color="orange">
              {{ $t('page.quantRecommendations.decisionSummary.trailingStop') }}
              {{ formatBps(exit.trailing_stop.trail_bps) }}
            </Tag>
            <span
              v-if="
                !exit.take_profit_price &&
                !exit.stop_loss_price &&
                exit.scale_out_targets.length === 0 &&
                !exit.trailing_stop
              "
            >
              {{ EMPTY_PLACEHOLDER }}
            </span>
          </div>
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <div v-if="recommendation.trade_plan.kind === 'frozen'">
      <h4 class="mb-2 text-sm font-medium">
        {{ $t('page.quantRecommendations.sections.plans') }}
      </h4>
      <RecommendationPlans :recommendation="recommendation" />
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card
        size="small"
        :title="$t('page.quantRecommendations.sections.identity')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.recommendationId')"
          >
            <span class="font-mono text-xs">{{
              recommendation.recommendation_id
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.reportId')"
          >
            <EntityRouteLink
              mono
              :label="recommendation.recommendation_report_id"
              :to="`/quant/reports/${recommendation.recommendation_report_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.category')"
          >
            {{ $t(`enum.marketCategory.${recommendation.identity.category}`) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.outcome')"
          >
            {{ recommendation.identity.outcome_name }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.market')"
          >
            <EntityRouteLink
              mono
              :label="recommendation.market_id"
              :to="`/markets/${recommendation.market_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.event')"
          >
            <span class="font-mono text-xs break-all">{{
              recommendation.event_id
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.token')"
          >
            <span class="font-mono text-xs break-all">{{
              recommendation.token_id
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.validFrom')"
          >
            {{ formatDateTimeLocal(recommendation.valid_from) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.validUntil')"
          >
            {{ formatDateTimeLocal(recommendation.valid_until) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.activeIntent')"
          >
            <EntityRouteLink
              v-if="recommendation.active_order_intent_id"
              mono
              :label="recommendation.active_order_intent_id"
              :to="`/quant/intents/${recommendation.active_order_intent_id}`"
            />
            <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.sections.score')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.composite')"
          >
            <span class="font-mono">{{
              formatScore(recommendation.composite_score)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.riskAdjusted')"
          >
            <span class="font-mono">{{
              formatScore(recommendation.risk_adjusted_score)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.confidence')"
          >
            <span class="font-mono">{{
              formatPercent(recommendation.confidence)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.expectedReturn')"
          >
            <span class="font-mono">{{
              formatBps(recommendation.expected_return_bps)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.downside')"
          >
            <span class="font-mono">{{
              formatBps(recommendation.downside_bps)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.liquidity')"
          >
            <span class="font-mono">{{
              formatPercent(recommendation.liquidity_score)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.dataQuality')"
          >
            <span class="font-mono">{{
              formatPercent(recommendation.data_quality_score)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.percentile')"
          >
            <span class="font-mono">{{
              formatPercent(recommendation.model_score_percentile)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.score.rankBeforePortfolio')"
          >
            {{ recommendation.rank_before_portfolio }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.sections.context')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.bestBid')"
          >
            <span class="font-mono">{{ formatPrice(context.best_bid) }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.bestAsk')"
          >
            <span class="font-mono">{{ formatPrice(context.best_ask) }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.mid')"
          >
            <span class="font-mono">{{ formatPrice(context.mid_price) }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.spread')"
          >
            <span class="font-mono">{{ formatBps(context.spread_bps) }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.depth')"
          >
            <span class="font-mono">{{ formatUsd(context.depth_usd) }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.volume24h')"
          >
            <span class="font-mono">{{
              formatUsd(context.volume_24h_usd)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.bookAge')"
          >
            {{ context.book_age_ms }} ms
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.timeToResolution')"
          >
            {{
              context.time_to_resolution_secs === null
                ? EMPTY_PLACEHOLDER
                : formatDurationSecs(context.time_to_resolution_secs)
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.marketStatus')"
          >
            {{ $t(`enum.marketStatus.${context.market_status}`) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.negRisk')"
          >
            {{ context.neg_risk ? $t('common.yes') : $t('common.no') }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.context.feeRate')"
          >
            <span class="font-mono">{{ formatPercent(context.fee_rate) }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        size="small"
        :title="$t('page.quantRecommendations.sections.eligibility')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.eligibility.eligibleModes')"
          >
            <template v-if="eligibility.eligible_modes.length > 0">
              <Tag
                v-for="mode in eligibility.eligible_modes"
                :key="mode"
                :color="findTagOption(modeTagOptions, mode)?.color"
              >
                {{ findTagOption(modeTagOptions, mode)?.label }}
              </Tag>
            </template>
            <span v-else>{{
              $t('page.quantRecommendations.eligibility.none')
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.eligibility.ineligibilityReasons')
            "
          >
            <BulletList
              v-if="eligibility.ineligibility_reasons.length > 0"
              :items="
                eligibility.ineligibility_reasons.map((reason) =>
                  $t(`enum.ineligibilityReason.${reason}`),
                )
              "
            />
            <span v-else>{{
              $t('page.quantRecommendations.eligibility.none')
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.eligibility.approvalRequired')
            "
          >
            {{
              eligibility.approval_required ? $t('common.yes') : $t('common.no')
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.eligibility.autoPolicy')"
          >
            <span class="font-mono text-xs">
              {{ eligibility.auto_policy_id ?? EMPTY_PLACEHOLDER }}
            </span>
          </DescriptionsItem>
        </Descriptions>
      </Card>
    </div>

    <Card
      size="small"
      :title="$t('page.quantRecommendations.sections.factors')"
    >
      <RecommendationFactors :factors="recommendation.factor_breakdown" />
    </Card>

    <Tabs v-model:active-key="detailTab">
      <TabPane
        key="evidence"
        :tab="$t('page.quantRecommendations.sections.evidence')"
      >
        <RecommendationEvidence
          :active="detailTab === 'evidence'"
          :recommendation-id="recommendation.recommendation_id"
        />
      </TabPane>
      <TabPane
        key="attribution"
        :tab="$t('page.quantRecommendations.sections.attribution')"
      >
        <RecommendationAttribution
          :active="detailTab === 'attribution'"
          :recommendation-id="recommendation.recommendation_id"
        />
      </TabPane>
    </Tabs>
  </div>
</template>
