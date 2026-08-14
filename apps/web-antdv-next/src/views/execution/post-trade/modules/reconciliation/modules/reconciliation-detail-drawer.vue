<script lang="ts" setup>
import type { ReconciliationView } from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';
import { isReconciliationOperatorResolvable } from '@vben/types';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Spin,
  Tag,
  Timeline,
  TimelineItem,
} from 'antdv-next';

import { getReconciliation } from '#/api/reconciliations';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import { useDrawerIntentRevisionRefresh } from '#/shared/composables/use-drawer-intent-revision-refresh';
import { enumOption, enumOptions } from '#/shared/presentation/enum-options';

import { useReconciliationActions } from './use-reconciliation-actions';

defineOptions({ name: 'ReconciliationDetailDrawer' });

const emit = defineEmits<{
  resolved: [];
}>();

interface ReconciliationDrawerData {
  reconciliation: ReconciliationView;
}

const { handleRequest } = useRequestHandler();
const resultTagOptions = enumOptions('ReconciliationResult');

const reconciliation = ref<null | ReconciliationView>(null);
const loading = ref(false);
const openId = ref<null | string>(null);

const { canResolve, resolve } = useReconciliationActions(() => {
  const id = openId.value;
  if (id) {
    void refreshReconciliation(id);
  }
  emit('resolved');
});

const showResolve = computed(
  () =>
    canResolve &&
    !!reconciliation.value &&
    isReconciliationOperatorResolvable(reconciliation.value),
);

async function refreshReconciliation(id: string) {
  loading.value = true;
  try {
    const fresh = await handleRequest(() => getReconciliation(id), {
      silent: true,
    });
    if (openId.value === id) {
      reconciliation.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<ReconciliationDrawerData>();
      openId.value = data.reconciliation.reconciliation_id;
      reconciliation.value = data.reconciliation;
      void refreshReconciliation(data.reconciliation.reconciliation_id);
    } else {
      openId.value = null;
      reconciliation.value = null;
    }
  },
});

function onResolve() {
  if (reconciliation.value) {
    void resolve(reconciliation.value);
  }
}

useDrawerIntentRevisionRefresh(openId, refreshReconciliation);
</script>

<template>
  <Drawer
    :title="$t('page.quantReconciliations.detail.title')"
    class="w-full max-w-3xl"
  >
    <Spin :spinning="loading">
      <div v-if="reconciliation" class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <Tag
            :color="enumOption(resultTagOptions, reconciliation.result)?.color"
          >
            {{ enumOption(resultTagOptions, reconciliation.result)?.label }}
          </Tag>
          <Button v-if="showResolve" danger type="primary" @click="onResolve">
            {{ $t('page.quantReconciliations.actions.resolve') }}
          </Button>
        </div>

        <Card
          size="small"
          :title="$t('page.quantReconciliations.detail.sections.summary')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantReconciliations.columns.reconciliationId')"
            >
              <span class="font-mono text-xs break-all">
                {{ reconciliation.reconciliation_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantReconciliations.columns.executionOrderId')"
            >
              <EntityRouteLink
                mono
                :label="reconciliation.execution_order_id"
                :to="`/execution/orders?module=orders&entity=execution-order&id=${reconciliation.execution_order_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantReconciliations.columns.orderIntentId')"
            >
              <EntityRouteLink
                mono
                :label="reconciliation.order_intent_id"
                :to="`/execution/orders?module=intents&entity=order-intent&id=${reconciliation.order_intent_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantReconciliations.detail.venueFilledShares')"
            >
              <span class="font-mono">
                {{
                  reconciliation.venue_filled_shares
                    ? formatShares(reconciliation.venue_filled_shares)
                    : EMPTY_PLACEHOLDER
                }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantReconciliations.detail.venueAvgPrice')"
            >
              <span class="font-mono">
                {{
                  reconciliation.venue_avg_price
                    ? formatPrice(reconciliation.venue_avg_price)
                    : EMPTY_PLACEHOLDER
                }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantReconciliations.columns.discrepancy')"
            >
              <span class="font-mono">
                {{
                  reconciliation.discrepancy_usd
                    ? formatUsd(reconciliation.discrepancy_usd)
                    : EMPTY_PLACEHOLDER
                }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantReconciliations.columns.detectedAt')"
            >
              {{ formatDateTimeLocal(reconciliation.created_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantReconciliations.detail.resolvedBy')"
            >
              {{ reconciliation.resolved_by ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantReconciliations.columns.resolvedAt')"
            >
              {{ formatDateTimeLocal(reconciliation.resolved_at) }}
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="$t('page.quantReconciliations.detail.sections.evidence')"
        >
          <Timeline v-if="reconciliation.evidence_json.length > 0">
            <TimelineItem
              v-for="(evidence, index) in reconciliation.evidence_json"
              :key="index"
            >
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <Tag color="blue">
                    {{ $t(`enum.reconciliationEvidenceKind.${evidence.kind}`) }}
                  </Tag>
                  <span class="text-muted-foreground text-xs">
                    {{ formatDateTimeLocal(evidence.observed_at) }}
                  </span>
                </div>
                <span class="text-sm">{{ evidence.detail }}</span>
                <div class="text-muted-foreground flex flex-wrap gap-3 text-xs">
                  <span v-if="evidence.shares">
                    {{ $t('page.quantReconciliations.detail.evidenceShares') }}:
                    {{ formatShares(evidence.shares) }}
                  </span>
                  <span v-if="evidence.price">
                    {{ $t('page.quantReconciliations.detail.evidencePrice') }}:
                    {{ formatPrice(evidence.price) }}
                  </span>
                  <span v-if="evidence.venue_ref" class="font-mono break-all">
                    {{ evidence.venue_ref }}
                  </span>
                </div>
              </div>
            </TimelineItem>
          </Timeline>
          <Empty
            v-else
            :description="$t('page.quantReconciliations.detail.noEvidence')"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>
      </div>
    </Spin>
  </Drawer>
</template>
