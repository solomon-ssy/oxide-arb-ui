<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, ref, watch } from 'vue';

import {
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
import EntryConditionPanel from '#/shared/components/domain/execution/entry-condition-panel.vue';
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
import { enumOption, enumOptions } from '#/shared/presentation/enum-options';
import { useSystemStore } from '#/store';

import { useCreateIntentAction } from './use-create-intent-action';
import { evaluateCreateIntentGate } from './use-create-intent-gate';
import RecommendationEvidence from './widgets/recommendation-evidence.vue';
import RecommendationFactors from './widgets/recommendation-factors.vue';
import RecommendationPlans from './widgets/recommendation-plans.vue';

defineOptions({ name: 'RecommendationDetailPanel' });

const props = defineProps<{
  /** Preselected detail tab from an entity deep link. */
  initialTab?: string;
  recommendation: QuantRecommendationView;
}>();

const systemStore = useSystemStore();
const { canCreate, createIntent } = useCreateIntentAction();

const sideTagOptions = enumOptions('OutcomeSide');
const statusTagOptions = enumOptions('RecommendationStatus');
const modeTagOptions = enumOptions('QuantRuntimeMode');

const DETAIL_TABS = new Set(['condition', 'evidence']);
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
const entry = computed(() => props.recommendation.trade_plan.entry);
const sizing = computed(() => props.recommendation.trade_plan.sizing);
const exitAuthority = computed(() => props.recommendation.trade_plan.exit);
const executableExit = computed(() =>
  exitAuthority.value.kind === 'executable' ? exitAuthority.value.plan : null,
);
const bootstrapGuidance = computed(() =>
  exitAuthority.value.kind === 'bootstrap_advisory'
    ? exitAuthority.value.guidance
    : null,
);

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
  <div class="flex flex-col gap-4" data-testid="recommendation-detail-panel">
    <div
      class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="min-w-0 flex flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-muted-foreground text-sm">
            #{{ recommendation.rank }}
          </span>
          <Tag
            :color="
              enumOption(sideTagOptions, recommendation.outcome_side)?.color
            "
          >
            {{ enumOption(sideTagOptions, recommendation.outcome_side)?.label }}
          </Tag>
          <Tag data-testid="recommendation-route">
            {{ $t(`page.quantReports.routes.${recommendation.route}`) }}
          </Tag>
          <Tag
            :color="enumOption(statusTagOptions, recommendation.status)?.color"
          >
            {{ enumOption(statusTagOptions, recommendation.status)?.label }}
          </Tag>
        </div>
        <span class="text-base font-medium break-words">
          {{ recommendation.identity.question }}
        </span>
      </div>
      <Tooltip :title="createDisabledReason">
        <Button
          class="w-full sm:w-auto"
          data-testid="create-intent"
          :disabled="!gate.enabled"
          type="primary"
          @click="onCreateIntent"
        >
          {{ $t('page.quantRecommendations.createIntent.button') }}
        </Button>
      </Tooltip>
    </div>

    <Card
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
          <span
            class="text-muted-foreground ml-2 text-xs"
            data-screenshot-volatile="true"
          >
            {{ formatDateTimeLocal(entry.valid_from) }} –
            {{ formatDateTimeLocal(entry.valid_until) }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.quantRecommendations.decisionSummary.notional')"
        >
          <span class="font-mono">{{
            formatUsd(sizing.hard_reserved_cash_usd)
          }}</span>
          <span class="text-muted-foreground ml-2">
            {{ sizing.requested_shares }}
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
          <div v-if="executableExit" class="flex flex-wrap items-center gap-2">
            <Tag v-if="executableExit.take_profit_price" color="green">
              {{ $t('page.quantRecommendations.exitPlan.takeProfitPrice') }}
              {{ formatPrice(executableExit.take_profit_price) }}
            </Tag>
            <Tag v-if="executableExit.stop_loss_price" color="red">
              {{ $t('page.quantRecommendations.exitPlan.stopLossPrice') }}
              {{ formatPrice(executableExit.stop_loss_price) }}
            </Tag>
            <Tag
              v-if="executableExit.scale_out_targets.length > 0"
              color="blue"
            >
              {{
                $t(
                  'page.quantRecommendations.decisionSummary.scaleOutTargets',
                  {
                    count: executableExit.scale_out_targets.length,
                  },
                )
              }}
            </Tag>
            <Tag v-if="executableExit.trailing_stop" color="orange">
              {{ $t('page.quantRecommendations.decisionSummary.trailingStop') }}
              {{ formatBps(executableExit.trailing_stop.trail_bps) }}
            </Tag>
            <span
              v-if="
                !executableExit.take_profit_price &&
                !executableExit.stop_loss_price &&
                executableExit.scale_out_targets.length === 0 &&
                !executableExit.trailing_stop
              "
            >
              {{ EMPTY_PLACEHOLDER }}
            </span>
          </div>
          <div v-else-if="bootstrapGuidance" class="flex flex-col gap-1">
            <Tag color="gold">
              {{ $t('page.quantRecommendations.exitPlan.bootstrapAdvisory') }}
            </Tag>
            <span>{{ bootstrapGuidance.guidance }}</span>
            <span class="text-muted-foreground text-xs">
              {{ formatDateTimeLocal(bootstrapGuidance.manual_review_at) }}
            </span>
          </div>
        </DescriptionsItem>
      </Descriptions>
    </Card>

    <div>
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
            <span class="font-mono text-xs" data-screenshot-volatile="true">
              {{ recommendation.recommendation_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.reportId')"
          >
            <span data-screenshot-volatile="true">
              <EntityRouteLink
                mono
                :label="recommendation.recommendation_report_id"
                :to="`/trading/recommendations?module=queue&entity=report&id=${recommendation.recommendation_report_id}`"
              />
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.route')"
          >
            {{ $t(`page.quantReports.routes.${recommendation.route}`) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.routeRunId')"
          >
            <span class="font-mono text-xs break-all">
              {{ recommendation.report_route_run_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.portfolioPlanId')"
          >
            <span class="font-mono text-xs break-all">
              {{ recommendation.portfolio_plan_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.economicTierId')"
          >
            <span class="font-mono text-xs break-all">
              {{ recommendation.economic_tier_id }}
            </span>
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
              :to="`/trading/market-intelligence?module=live&entity=market&id=${recommendation.market_id}`"
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
            <span data-screenshot-volatile="true">
              {{ formatDateTimeLocal(recommendation.valid_from) }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.validUntil')"
          >
            <span data-screenshot-volatile="true">
              {{ formatDateTimeLocal(recommendation.valid_until) }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.identity.activeIntent')"
          >
            <EntityRouteLink
              v-if="recommendation.active_order_intent_id"
              mono
              :label="recommendation.active_order_intent_id"
              :to="`/execution/orders?module=intents&entity=order-intent&id=${recommendation.active_order_intent_id}`"
            />
            <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        data-testid="recommendation-economics"
        size="small"
        :title="$t('page.quantRecommendations.sections.economics')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.profitProbability')"
          >
            <span class="font-mono">{{
              formatBps(recommendation.economics.profit_probability_bps)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.robustNet')"
          >
            <span class="font-mono">{{
              formatUsd(recommendation.economics.robust_expected_net_usd)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.nominalNet')"
          >
            <span class="font-mono">{{
              formatUsd(recommendation.economics.nominal_expected_net_usd)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.marginalValue')"
          >
            <span class="font-mono">{{
              formatUsd(recommendation.economics.marginal_portfolio_value_usd)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.maxLoss')"
          >
            <span class="font-mono">{{
              formatUsd(recommendation.economics.max_loss_usd)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.cvarContribution')"
          >
            <span class="font-mono">{{
              formatUsd(recommendation.economics.cvar_contribution_usd)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.capitalTime')"
          >
            <span class="font-mono">{{
              formatScore(recommendation.economics.capital_occupancy_usd_hours)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.profitFloor')"
          >
            <span class="font-mono">{{
              formatBps(
                recommendation.economic_tier.profit_probability_lower_bps,
              )
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economics.intervalWidth')"
          >
            <span class="font-mono">{{
              formatBps(
                recommendation.economic_tier.probability_interval_width_bps,
              )
            }}</span>
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
                :color="enumOption(modeTagOptions, mode)?.color"
              >
                {{ enumOption(modeTagOptions, mode)?.label }}
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
      <TabPane key="condition" :tab="$t('page.entryCondition.title')">
        <EntryConditionPanel
          :recommendation-id="recommendation.recommendation_id"
        />
      </TabPane>
      <TabPane
        key="evidence"
        :tab="$t('page.quantRecommendations.sections.evidence')"
      >
        <RecommendationEvidence
          :active="detailTab === 'evidence'"
          :recommendation-id="recommendation.recommendation_id"
        />
      </TabPane>
    </Tabs>
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
