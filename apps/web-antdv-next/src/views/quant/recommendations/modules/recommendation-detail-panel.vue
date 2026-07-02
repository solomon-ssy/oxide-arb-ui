<script lang="ts" setup>
import type { QuantRecommendationView } from '@vben/types';

import { computed, ref } from 'vue';

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
  recommendation: QuantRecommendationView;
}>();

const systemStore = useSystemStore();
const { canCreate, createIntent } = useCreateIntentAction();

const sideTagOptions = useOutcomeSideTagOptions();
const statusTagOptions = useRecommendationStatusTagOptions();
const modeTagOptions = useQuantRuntimeModeTagOptions();

const detailTab = ref('evidence');

const context = computed(() => props.recommendation.market_context);
const eligibility = computed(() => props.recommendation.execution_eligibility);

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
          :disabled="!gate.enabled"
          type="primary"
          @click="onCreateIntent"
        >
          {{ $t('page.quantRecommendations.createIntent.button') }}
        </Button>
      </Tooltip>
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
              to="/quant/intents"
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
            <ul
              v-if="eligibility.ineligibility_reasons.length > 0"
              class="list-disc pl-4"
            >
              <li
                v-for="reason in eligibility.ineligibility_reasons"
                :key="reason"
              >
                {{ $t(`enum.ineligibilityReason.${reason}`) }}
              </li>
            </ul>
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

    <div>
      <h4 class="mb-2 text-sm font-medium">
        {{ $t('page.quantRecommendations.sections.plans') }}
      </h4>
      <RecommendationPlans :recommendation="recommendation" />
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
