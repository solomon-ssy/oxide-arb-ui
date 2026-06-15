<script lang="ts" setup>
import type { OperationLogView } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Descriptions, DescriptionsItem } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernanceCrosslink } from '#/shared/composables/use-governance-crosslink';

defineOptions({ name: 'OperationLogDetailDrawer' });

const { openAuditAt, openOperationLogByRequestId } = useGovernanceCrosslink();
const row = ref<null | OperationLogView>(null);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    row.value = isOpen
      ? drawerApi.getData<{ row: OperationLogView }>().row
      : null;
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.operationLog.detail.title')"
    class="w-full max-w-4xl"
  >
    <template v-if="row">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.operationLog.detail.occurredAt')">
          {{ formatDateTimeLocal(row.occurred_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.operationLog.detail.requestId')">
          <span class="font-mono text-xs">{{ row.request_id }}</span>
          <Button
            class="ml-2"
            size="small"
            @click="openOperationLogByRequestId(row.request_id)"
          >
            {{ $t('page.operationLog.detail.filterByRequestId') }}
          </Button>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.operationLog.detail.actor')">
          {{ row.actor_username ?? row.actor_user_id ?? '-' }} /
          {{ row.acting_role ?? '-' }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.operationLog.detail.http')">
          {{ row.http_method }} {{ row.http_path }} → {{ row.http_status }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.operationLog.detail.resource')">
          {{ row.resource_type ?? '-' }} · {{ row.resource_id ?? '-' }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.operationLog.detail.auditEvent')">
          <span class="font-mono text-xs">{{
            row.governance_audit_event_id ?? '-'
          }}</span>
          <Button
            v-if="row.governance_audit_event_id"
            class="ml-2"
            size="small"
            @click="
              openAuditAt({
                eventId: row.governance_audit_event_id ?? undefined,
                sequence: row.governance_audit_sequence ?? undefined,
              })
            "
          >
            {{ $t('page.operationLog.detail.openAudit') }}
          </Button>
        </DescriptionsItem>
      </Descriptions>
      <div
        class="bg-muted mt-4 max-h-[520px] overflow-auto rounded p-3 text-xs"
      >
        <pre>{{ JSON.stringify(row.detail, null, 2) }}</pre>
      </div>
    </template>
  </Drawer>
</template>
