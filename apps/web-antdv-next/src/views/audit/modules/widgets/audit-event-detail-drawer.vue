<script lang="ts" setup>
import type { ControlFactorAuditEventInfo } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Descriptions, DescriptionsItem } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernanceCrosslink } from '#/shared/composables/use-governance-crosslink';

defineOptions({ name: 'AuditEventDetailDrawer' });

const { openOperationLogByAuditEvent, openOperationLogByRequestId } =
  useGovernanceCrosslink();
const event = ref<ControlFactorAuditEventInfo | null>(null);
const verified = ref(true);
const brokenAt = ref<null | number>(null);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<{
        brokenAt: null | number;
        event: ControlFactorAuditEventInfo;
        verified: boolean;
      }>();
      event.value = data.event;
      verified.value = data.verified;
      brokenAt.value = data.brokenAt;
    } else {
      event.value = null;
      verified.value = true;
      brokenAt.value = null;
    }
  },
});
</script>

<template>
  <Drawer :title="$t('page.audit.detail.title')" class="w-full max-w-4xl">
    <template v-if="event">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.audit.detail.sequence')">
          {{ event.sequence }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.createdAt')">
          {{ formatDateTimeLocal(event.created_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.eventType')">
          {{ $t(`enum.controlAuditEventType.${event.event_type}`) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.actor')">
          {{ event.actor }} / {{ event.actor_role }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.resource')">
          {{ event.resource_type }} · {{ event.resource_id }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.requestId')">
          <span class="font-mono text-xs">{{ event.request_id }}</span>
          <Button
            class="ml-2"
            size="small"
            @click="openOperationLogByRequestId(event.request_id)"
          >
            {{ $t('page.audit.detail.openOperationLog') }}
          </Button>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.hashChain')">
          <div class="space-y-1 font-mono text-xs">
            <div>prev: {{ event.prev_event_hash ?? 'GENESIS' }}</div>
            <div>hash: {{ event.event_hash }}</div>
          </div>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.verified')">
          {{
            verified
              ? $t('page.audit.detail.valid')
              : $t('page.audit.detail.invalid')
          }}
          <span v-if="brokenAt"> @ {{ brokenAt }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.reason')">
          {{ event.reason }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.audit.detail.crosslink')">
          <Button
            size="small"
            @click="
              openOperationLogByAuditEvent(event.event_id, event.sequence)
            "
          >
            {{ $t('page.audit.detail.openOperationLogByEvent') }}
          </Button>
        </DescriptionsItem>
      </Descriptions>
      <div
        class="bg-muted mt-4 max-h-[520px] overflow-auto rounded p-3 text-xs"
      >
        <pre>{{ JSON.stringify(event, null, 2) }}</pre>
      </div>
    </template>
  </Drawer>
</template>
