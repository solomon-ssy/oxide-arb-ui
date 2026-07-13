<script lang="ts" setup>
import type { TradePolicyDetailView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Tag,
  Timeline,
  TimelineItem,
} from 'antdv-next';

import { governTradePolicy } from '#/api/trade-policies';
import { $t } from '#/locales';
import {
  formatBps,
  formatDateTimeLocal,
  formatPercent,
  formatPrice,
  formatUsd,
} from '#/shared/components/format';
import { useGovernedAction } from '#/shared/composables/use-governed-action';

defineOptions({ name: 'TradePolicyDetailDrawer' });

interface DrawerData {
  detail: TradePolicyDetailView;
}

const detail = ref<null | TradePolicyDetailView>(null);
const { governed } = useGovernedAction();
const publicationBlocked = computed(
  () =>
    !detail.value?.payload.validation.passed ||
    !detail.value?.payload.execution_evidence.fees_included ||
    detail.value?.payload.execution_evidence.full_l2_coverage === '0',
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(open) {
    detail.value = open ? drawerApi.getData<DrawerData>().detail : null;
  },
});

async function transition(action: 'publish' | 'retire' | 'validate') {
  const current = detail.value;
  if (!current) {
    return;
  }
  const updated = await governed(
    (context) =>
      governTradePolicy(
        current.artifact_id,
        action,
        { reason: context.reason },
        context,
      ),
    {
      danger: action === 'retire',
      summary: $t(`page.research.tradePolicies.governance.${action}Summary`),
      title: $t(`page.research.tradePolicies.governance.${action}`),
    },
  );
  if (updated) {
    detail.value = updated;
  }
}
</script>

<template>
  <Drawer :title="$t('page.research.tradePolicies.detail.title')">
    <div v-if="detail" class="flex flex-col gap-4">
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="detail.status === 'draft'"
          :disabled="publicationBlocked"
          type="primary"
          @click="transition('validate')"
        >
          {{ $t('page.research.tradePolicies.governance.validate') }}
        </Button>
        <Button
          v-if="detail.status === 'validated'"
          type="primary"
          @click="transition('publish')"
        >
          {{ $t('page.research.tradePolicies.governance.publish') }}
        </Button>
        <Button
          v-if="detail.status === 'published'"
          danger
          @click="transition('retire')"
        >
          {{ $t('page.research.tradePolicies.governance.retire') }}
        </Button>
      </div>

      <Alert
        v-if="publicationBlocked"
        :message="$t('page.research.tradePolicies.detail.publicationBlocked')"
        show-icon
        type="warning"
      />

      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.columns.status')"
        >
          <Tag>{{ detail.status }}</Tag>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.columns.artifactId')"
        >
          <span class="font-mono text-xs break-all">
            {{ detail.artifact_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.hash')"
        >
          <span class="font-mono text-xs break-all">{{
            detail.content_hash
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.columns.dataset')"
        >
          <span class="font-mono text-xs break-all">
            {{ detail.source_dataset_id }}
          </span>
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.fitWindow')"
        >
          {{
            formatDateTimeLocal(detail.payload.fit_contract.fit_window_start)
          }}
          →
          {{ formatDateTimeLocal(detail.payload.fit_contract.fit_window_end) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.fillSimulator')"
        >
          {{ detail.payload.fill_simulator_version }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.entryBasis')"
        >
          {{ detail.payload.execution_evidence.entry_basis }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.exitBasis')"
        >
          {{ detail.payload.execution_evidence.exit_basis }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.fullL2Coverage')"
        >
          {{
            formatPercent(detail.payload.execution_evidence.full_l2_coverage)
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.feesIncluded')"
        >
          {{ detail.payload.execution_evidence.fees_included }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.tradePolicies.detail.dsr')">
          {{ formatPercent(detail.payload.validation.deflated_sharpe_ratio) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.research.tradePolicies.detail.pbo')">
          {{
            formatPercent(
              detail.payload.validation.probability_of_backtest_overfitting,
            )
          }}
        </DescriptionsItem>
      </Descriptions>

      <Alert
        v-for="reason in [
          ...detail.payload.execution_evidence.degradation_reasons,
          ...detail.payload.validation.failure_reasons,
        ]"
        :key="reason"
        :message="reason"
        show-icon
        type="info"
      />

      <Timeline>
        <TimelineItem
          v-for="(cohort, index) in detail.payload.cohorts"
          :key="index"
        >
          <div class="flex flex-col gap-1">
            <strong>
              {{ cohort.key.category }} · {{ cohort.key.horizon_secs }}s ·
              {{ formatUsd(cohort.key.notional_tier) }}
            </strong>
            <span class="text-muted-foreground text-xs">
              {{ formatPrice(cohort.key.entry_price_min) }}–{{
                formatPrice(cohort.key.entry_price_max)
              }}
              ·
              {{ cohort.key.liquidity_tier }} ·
              {{ cohort.key.volatility_regime }}
            </span>
            <span>
              +{{ formatBps(cohort.upper_barrier_bps) }} / -{{
                formatBps(cohort.lower_barrier_bps)
              }}
              · coverage {{ formatPercent(cohort.executable_coverage) }}
            </span>
          </div>
        </TimelineItem>
      </Timeline>
    </div>
  </Drawer>
</template>
