<script lang="ts" setup>
import type { ControlFactorAuditEventInfo } from '@vben/types';

import { Button } from 'antdv-next';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import { useGovernanceCrosslink } from '#/shared/composables/use-governance-crosslink';

defineProps<{
  events: ControlFactorAuditEventInfo[];
  loading?: boolean;
}>();

const { openAuditAt, openOperationLogByAuditEvent } = useGovernanceCrosslink();
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="event in events"
      :key="event.event_id"
      class="rounded-md border p-3 text-sm"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="font-mono text-primary">#{{ event.sequence }}</div>
          <div class="text-muted-foreground text-xs">
            {{ formatDateTimeLocal(event.created_at) }} ·
            {{ $t(`enum.controlAuditEventType.${event.event_type}`) }}
          </div>
        </div>
        <div class="flex gap-2">
          <Button
            size="small"
            @click="
              openAuditAt({ eventId: event.event_id, sequence: event.sequence })
            "
          >
            {{ $t('page.shared.governance.openAudit') }}
          </Button>
          <Button
            size="small"
            @click="
              openOperationLogByAuditEvent(event.event_id, event.sequence)
            "
          >
            {{ $t('page.shared.governance.openOperationLog') }}
          </Button>
        </div>
      </div>
      <div class="mt-2">{{ event.reason }}</div>
    </div>
    <div v-if="events.length === 0" class="text-muted-foreground text-sm">
      {{ $t('page.shared.governance.noEvents') }}
    </div>
  </div>
</template>
