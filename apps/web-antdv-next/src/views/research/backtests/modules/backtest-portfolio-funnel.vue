<script lang="ts" setup>
import type {
  BacktestPortfolioFunnel,
  PortfolioRejectionReason,
} from '@vben/types';

import { Descriptions, DescriptionsItem, Tag } from 'antdv-next';

import { $t } from '#/locales';

defineOptions({ name: 'BacktestPortfolioFunnel' });

defineProps<{
  value: BacktestPortfolioFunnel;
}>();

const REASON_LABELS: Record<PortfolioRejectionReason, string> = {
  existing_structural_conflict:
    'page.research.backtests.detail.funnel.reasons.existingStructuralConflict',
  liquidity_buffer:
    'page.research.backtests.detail.funnel.reasons.liquidityBuffer',
  nominal_expected_net_floor:
    'page.research.backtests.detail.funnel.reasons.nominalExpectedNetFloor',
  not_selected_by_global_optimum:
    'page.research.backtests.detail.funnel.reasons.notSelectedByGlobalOptimum',
  probability_interval_width:
    'page.research.backtests.detail.funnel.reasons.probabilityIntervalWidth',
  profit_probability_floor:
    'page.research.backtests.detail.funnel.reasons.profitProbabilityFloor',
  robust_expected_net_floor:
    'page.research.backtests.detail.funnel.reasons.robustExpectedNetFloor',
  scenario_exit_capacity:
    'page.research.backtests.detail.funnel.reasons.scenarioExitCapacity',
  single_recommendation_exposure:
    'page.research.backtests.detail.funnel.reasons.singleRecommendationExposure',
};

function reasonLabel(reason: PortfolioRejectionReason) {
  return $t(REASON_LABELS[reason]);
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-4">
    <Descriptions :column="2" bordered size="small">
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.funnel.decisionTicks')"
      >
        {{ value.decision_tick_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.funnel.emittedCandidates')"
      >
        {{ value.emitted_candidate_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="
          $t('page.research.backtests.detail.funnel.candidatesWithoutTier')
        "
      >
        {{ value.candidate_without_executable_tier_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.funnel.executableTiers')"
      >
        {{ value.executable_tier_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.funnel.rejectedTiers')"
      >
        {{ value.admission_rejected_tier_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.funnel.admittedTiers')"
      >
        {{ value.admitted_tier_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.funnel.selectedTiers')"
      >
        {{ value.selected_tier_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.funnel.executedEntries')"
      >
        {{ value.executed_entry_count }}
      </DescriptionsItem>
      <DescriptionsItem
        :label="$t('page.research.backtests.detail.funnel.resolvedAllocations')"
        :span="2"
      >
        {{ value.resolved_allocation_count }}
      </DescriptionsItem>
    </Descriptions>

    <div class="min-w-0">
      <div class="mb-2 text-sm font-medium">
        {{ $t('page.research.backtests.detail.funnel.tickOutcomes') }}
      </div>
      <div class="flex flex-wrap gap-2">
        <Tag>
          {{ $t('page.research.backtests.detail.funnel.noCandidateTicks') }} ·
          {{ value.no_candidate_tick_count }}
        </Tag>
        <Tag>
          {{ $t('page.research.backtests.detail.funnel.noTierTicks') }} ·
          {{ value.no_executable_tier_tick_count }}
        </Tag>
        <Tag>
          {{ $t('page.research.backtests.detail.funnel.noSelectionTicks') }} ·
          {{ value.no_selection_tick_count }}
        </Tag>
        <Tag color="green">
          {{ $t('page.research.backtests.detail.funnel.selectedTicks') }} ·
          {{ value.selected_tick_count }}
        </Tag>
      </div>
    </div>

    <div class="min-w-0">
      <div class="mb-2 text-sm font-medium">
        {{ $t('page.research.backtests.detail.funnel.exclusionReasons') }}
      </div>
      <div
        v-if="value.tier_exclusion_reasons.length > 0"
        class="flex flex-wrap gap-2"
      >
        <Tag
          v-for="reason in value.tier_exclusion_reasons"
          :key="reason.reason"
          color="orange"
        >
          {{ reasonLabel(reason.reason) }} · {{ reason.count }}
        </Tag>
      </div>
      <div v-else class="text-sm text-muted-foreground">
        {{ $t('page.research.backtests.detail.funnel.noExclusions') }}
      </div>
    </div>
  </div>
</template>
