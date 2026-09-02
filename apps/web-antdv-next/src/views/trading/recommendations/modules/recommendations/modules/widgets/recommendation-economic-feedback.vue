<script lang="ts" setup>
import type {
  BuyModelRoute,
  RecommendationEconomicOutcomeView,
  RecommendationExecutionComparisonView,
  RouteEconomicHealthView,
} from '@vben/types';

import { computed, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Card,
  Descriptions,
  DescriptionsItem,
  Skeleton,
} from 'antdv-next';

import {
  getRecommendationEconomicOutcome,
  getRecommendationExecutionComparison,
} from '#/api/quant-recommendations';
import { listRouteEconomicHealth } from '#/api/research';
import { $t } from '#/locales';
import { LatestRequestOwner } from '#/shared/async/latest-request-owner';
import EnumTag from '#/shared/components/enum-tag.vue';
import {
  EMPTY_PLACEHOLDER,
  formatBps,
  formatDateTimeLocal,
  formatScore,
  formatUsd,
} from '#/shared/components/format';

defineOptions({ name: 'RecommendationEconomicFeedback' });

const props = defineProps<{
  recommendationId: string;
  route: BuyModelRoute;
}>();

const loading = ref(false);
const outcome = ref<null | RecommendationEconomicOutcomeView>(null);
const comparison = ref<null | RecommendationExecutionComparisonView>(null);
const health = ref<null | RouteEconomicHealthView>(null);
const unavailable = ref({ comparison: false, health: false, outcome: false });
const requestOwner = new LatestRequestOwner();

const evaluatedComparison = computed(() =>
  comparison.value?.evaluation.status === 'evaluated'
    ? comparison.value.evaluation
    : null,
);

async function load(recommendationId: string, route: BuyModelRoute) {
  const request = requestOwner.begin();
  loading.value = true;
  const [outcomeResult, comparisonResult, healthResult] =
    await Promise.allSettled([
      getRecommendationEconomicOutcome(recommendationId),
      getRecommendationExecutionComparison(recommendationId),
      listRouteEconomicHealth({ page: 1, route, size: 1 }),
    ]);
  request.commit(() => {
    outcome.value =
      outcomeResult.status === 'fulfilled' ? outcomeResult.value : null;
    comparison.value =
      comparisonResult.status === 'fulfilled' ? comparisonResult.value : null;
    health.value =
      healthResult.status === 'fulfilled'
        ? (healthResult.value.items[0] ?? null)
        : null;
    unavailable.value = {
      comparison: comparisonResult.status === 'rejected',
      health: healthResult.status === 'rejected',
      outcome: outcomeResult.status === 'rejected',
    };
    loading.value = false;
  });
}

watch(
  () => [props.recommendationId, props.route] as const,
  ([recommendationId, route]) => void load(recommendationId, route),
  { immediate: true },
);
onScopeDispose(() => requestOwner.invalidate());
</script>

<template>
  <Card
    data-testid="recommendation-economic-feedback"
    size="small"
    :title="$t('page.quantRecommendations.economicFeedback.title')"
  >
    <Skeleton v-if="loading" active :paragraph="{ rows: 4 }" />
    <div v-else class="grid gap-4 xl:grid-cols-3">
      <section>
        <h4 class="mb-2 text-sm font-semibold">
          {{ $t('page.quantRecommendations.economicFeedback.outcome') }}
        </h4>
        <Alert
          v-if="!outcome"
          :message="
            $t('page.quantRecommendations.economicFeedback.outcomeUnavailable')
          "
          show-icon
          :type="unavailable.outcome ? 'warning' : 'info'"
        />
        <Descriptions v-else :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economicFeedback.state')"
          >
            <EnumTag
              context="recommendation-economic"
              name="RecommendationEconomicOutcomeState"
              :value="outcome.state"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economicFeedback.netPnl')"
          >
            {{
              outcome.payload.amounts.net_pnl_usd === null ||
              outcome.payload.amounts.net_pnl_usd === undefined
                ? EMPTY_PLACEHOLDER
                : formatUsd(outcome.payload.amounts.net_pnl_usd)
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economicFeedback.netReturn')"
          >
            {{
              outcome.payload.amounts.net_return_bps === null ||
              outcome.payload.amounts.net_return_bps === undefined
                ? EMPTY_PLACEHOLDER
                : formatBps(outcome.payload.amounts.net_return_bps)
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.economicFeedback.availableAt')
            "
          >
            {{ formatDateTimeLocal(outcome.available_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.economicFeedback.evidenceHash')
            "
          >
            <span class="font-mono text-xs break-all">{{
              outcome.evidence_hash
            }}</span>
          </DescriptionsItem>
        </Descriptions>
      </section>

      <section>
        <h4 class="mb-2 text-sm font-semibold">
          {{ $t('page.quantRecommendations.economicFeedback.comparison') }}
        </h4>
        <Alert
          v-if="!comparison"
          :message="
            $t(
              'page.quantRecommendations.economicFeedback.comparisonUnavailable',
            )
          "
          show-icon
          :type="unavailable.comparison ? 'warning' : 'info'"
        />
        <Descriptions v-else :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economicFeedback.evaluation')"
          >
            <span v-if="comparison.evaluation.status === 'not_evaluable'">
              {{
                $t(
                  `enum.executionComparisonNotEvaluableReasonView.${comparison.evaluation.reason}`,
                )
              }}
            </span>
            <span v-else>{{
              $t('page.quantRecommendations.economicFeedback.evaluated')
            }}</span>
          </DescriptionsItem>
          <template v-if="evaluatedComparison">
            <DescriptionsItem
              :label="
                $t('page.quantRecommendations.economicFeedback.latencyDelta')
              "
            >
              {{ evaluatedComparison.latency_delta_ms }} ms
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.quantRecommendations.economicFeedback.priceDelta')
              "
            >
              {{ formatBps(evaluatedComparison.actual_vs_planned_price_bps) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.quantRecommendations.economicFeedback.fillDelta')
              "
            >
              {{ formatScore(evaluatedComparison.fill_ratio_delta) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.quantRecommendations.economicFeedback.returnDelta')
              "
            >
              {{ formatBps(evaluatedComparison.return_delta_bps) }}
            </DescriptionsItem>
          </template>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.economicFeedback.comparisonHash')
            "
          >
            <span class="font-mono text-xs break-all">{{
              comparison.comparison_hash
            }}</span>
          </DescriptionsItem>
        </Descriptions>
      </section>

      <section>
        <h4 class="mb-2 text-sm font-semibold">
          {{ $t('page.quantRecommendations.economicFeedback.routeHealth') }}
        </h4>
        <Alert
          v-if="!health"
          :message="
            $t('page.quantRecommendations.economicFeedback.healthUnavailable')
          "
          show-icon
          :type="unavailable.health ? 'warning' : 'info'"
        />
        <Descriptions v-else :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economicFeedback.state')"
          >
            <EnumTag
              context="route-economic-health"
              name="RouteEconomicHealthState"
              :value="health.state"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economicFeedback.coverage')"
          >
            {{ formatScore(health.coverage) }} ·
            {{ health.usable_observation_count }}/{{
              health.due_observation_count
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantRecommendations.economicFeedback.lowerBound')"
          >
            {{
              health.lower_confidence_return_bps === null ||
              health.lower_confidence_return_bps === undefined
                ? EMPTY_PLACEHOLDER
                : formatBps(health.lower_confidence_return_bps)
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.economicFeedback.assessedThrough')
            "
          >
            {{ formatDateTimeLocal(health.assessed_through) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="
              $t('page.quantRecommendations.economicFeedback.evidenceHash')
            "
          >
            <span class="font-mono text-xs break-all">{{
              health.evidence_hash
            }}</span>
          </DescriptionsItem>
        </Descriptions>
      </section>
    </div>
  </Card>
</template>
