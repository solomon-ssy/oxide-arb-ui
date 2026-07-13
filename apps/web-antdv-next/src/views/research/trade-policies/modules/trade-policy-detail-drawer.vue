<script lang="ts" setup>
import type {
  TradePolicyDetailView,
  TradePolicyGovernanceAuditView,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Tag,
  Timeline,
  TimelineItem,
} from 'antdv-next';

import { governTradePolicy, listTradePolicyAudits } from '#/api/trade-policies';
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
const audits = ref<TradePolicyGovernanceAuditView[]>([]);
const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();
const publicationBlocked = computed(
  () => (detail.value?.publication_blockers.length ?? 0) > 0,
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(open) {
    detail.value = open ? drawerApi.getData<DrawerData>().detail : null;
    audits.value = [];
    const current = detail.value;
    if (current) {
      const page = await handleRequest(
        () => listTradePolicyAudits(current.artifact_id, { size: 100 }),
        { silent: true },
      );
      audits.value = page?.items ?? [];
    }
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
    const page = await handleRequest(
      () => listTradePolicyAudits(updated.artifact_id, { size: 100 }),
      { silent: true },
    );
    audits.value = page?.items ?? [];
  }
}
</script>

<template>
  <Drawer :title="$t('page.research.tradePolicies.detail.title')">
    <div
      v-if="detail"
      class="flex flex-col gap-4"
      data-testid="trade-policy-detail"
    >
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="detail.allowed_governance_actions.includes('validate')"
          type="primary"
          @click="transition('validate')"
        >
          {{ $t('page.research.tradePolicies.governance.validate') }}
        </Button>
        <Button
          v-if="detail.allowed_governance_actions.includes('publish')"
          type="primary"
          @click="transition('publish')"
        >
          {{ $t('page.research.tradePolicies.governance.publish') }}
        </Button>
        <Button
          v-if="detail.allowed_governance_actions.includes('retire')"
          danger
          @click="transition('retire')"
        >
          {{ $t('page.research.tradePolicies.governance.retire') }}
        </Button>
      </div>

      <Alert
        v-if="publicationBlocked"
        :description="
          detail.publication_blockers
            .map((blocker) =>
              $t(`page.research.tradePolicies.blocker.${blocker.kind}`),
            )
            .join(' · ')
        "
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
          :label="$t('page.research.tradePolicies.detail.pitCutoff')"
        >
          {{ formatDateTimeLocal(detail.payload.fit_contract.pit_cutoff) }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.fillSimulator')"
        >
          {{ detail.payload.fill_simulator_version }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.entryBasis')"
        >
          {{ detail.payload.execution_evidence.entry_basis ?? '—' }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.exitBasis')"
        >
          {{ detail.payload.execution_evidence.exit_basis ?? '—' }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.fullL2Coverage')"
        >
          {{
            formatPercent(detail.payload.execution_evidence.full_l2_coverage)
          }}
        </DescriptionsItem>
        <DescriptionsItem
          :label="$t('page.research.tradePolicies.detail.feeModel')"
        >
          <span class="font-mono text-xs break-all">
            {{ detail.payload.execution_evidence.fee_model_hash ?? '—' }}
          </span>
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
        v-for="reason in detail.payload.execution_evidence.gaps"
        :key="reason"
        :message="reason"
        show-icon
        type="info"
      />

      <Card
        v-for="(cohort, index) in detail.payload.cohorts"
        :key="index"
        size="small"
      >
        <div class="flex flex-col gap-1 text-sm">
          <strong>
            {{ cohort.key.category }} · {{ cohort.key.horizon_secs }}s ·
            {{ formatUsd(cohort.key.notional_tier) }}
          </strong>
          <span class="text-muted-foreground text-xs">
            {{ formatPrice(cohort.key.entry_price_min) }}–{{
              formatPrice(cohort.key.entry_price_max)
            }}
            ·
            {{ cohort.key.liquidity.bucket_id }} ·
            {{ cohort.key.volatility.bucket_id }}
          </span>
          <span>
            +{{ formatBps(cohort.upper_barrier_bps) }} / -{{
              formatBps(cohort.lower_barrier_bps)
            }}
            · coverage {{ formatPercent(cohort.executable_coverage) }}
          </span>
        </div>
      </Card>

      <h4 class="text-sm font-medium">
        {{ $t('page.research.tradePolicies.detail.audit') }}
      </h4>
      <Timeline v-if="audits.length > 0" data-testid="trade-policy-audit">
        <TimelineItem v-for="audit in audits" :key="audit.audit_id">
          <div class="flex flex-col gap-1">
            <strong>{{ audit.from_status }} → {{ audit.to_status }}</strong>
            <span>{{ audit.reason }}</span>
            <span class="text-muted-foreground text-xs">
              {{ audit.actor_id }} · {{ formatDateTimeLocal(audit.created_at) }}
            </span>
          </div>
        </TimelineItem>
      </Timeline>
    </div>
  </Drawer>
</template>
