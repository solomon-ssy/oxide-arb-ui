<script lang="ts" setup>
import type { ControlFactorValueInfo, UuidString } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { Descriptions, DescriptionsItem, TabPane, Tabs } from 'antdv-next';

import {
  fetchFactorGovernanceEvents,
  getControlFactor,
} from '#/api/control-factors';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import AuditEventTimeline from '#/shared/components/governance/audit-event-timeline.vue';

defineOptions({ name: 'ControlFactorDetailDrawer' });

const { handleRequest } = useRequestHandler();
const factor = ref<ControlFactorValueInfo | null>(null);
const governanceEvents = ref<
  Awaited<ReturnType<typeof fetchFactorGovernanceEvents>>
>([]);
const loading = ref(false);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const { factorId } = drawerApi.getData<{ factorId: UuidString }>();
      void load(factorId);
    } else {
      factor.value = null;
      governanceEvents.value = [];
    }
  },
});

async function load(factorId: UuidString) {
  loading.value = true;
  try {
    await handleRequest(
      () => getControlFactor(factorId),
      (view) => {
        factor.value = view;
      },
    );
    await handleRequest(
      () => fetchFactorGovernanceEvents(factorId, { limit: 50 }),
      (events) => {
        governanceEvents.value = events;
      },
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Drawer
    :loading="loading"
    :title="$t('page.controlFactors.detail.title')"
    class="w-full max-w-4xl"
  >
    <template v-if="factor">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.controlFactors.detail.factorId')">
          <span class="font-mono text-xs">{{ factor.factor_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.controlFactors.detail.runId')">
          <span class="font-mono text-xs">{{ factor.run_id }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.controlFactors.detail.status')">
          {{ $t(`enum.factorStatus.${factor.status}`) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.controlFactors.detail.generatedAt')">
          {{ formatDateTimeLocal(factor.generated_at) }}
        </DescriptionsItem>
      </Descriptions>

      <Tabs class="mt-4">
        <TabPane key="payload" :tab="$t('page.controlFactors.detail.payload')">
          <div class="bg-muted max-h-[520px] overflow-auto rounded p-3 text-xs">
            <pre>{{ JSON.stringify(factor.payload, null, 2) }}</pre>
          </div>
        </TabPane>
        <TabPane
          key="dimensions"
          :tab="$t('page.controlFactors.detail.dimensions')"
        >
          <div class="bg-muted max-h-[520px] overflow-auto rounded p-3 text-xs">
            <pre>{{ JSON.stringify(factor.dimensions, null, 2) }}</pre>
          </div>
        </TabPane>
        <TabPane
          key="evidence"
          :tab="$t('page.controlFactors.detail.evidence')"
        >
          <div class="bg-muted max-h-[520px] overflow-auto rounded p-3 text-xs">
            <pre>{{ JSON.stringify(factor.evidence, null, 2) }}</pre>
          </div>
        </TabPane>
        <TabPane
          key="governance"
          :tab="$t('page.controlFactors.detail.governance')"
        >
          <AuditEventTimeline :events="governanceEvents" :loading="loading" />
        </TabPane>
      </Tabs>
    </template>
  </Drawer>
</template>
