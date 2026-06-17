<script lang="ts" setup>
import { computed } from 'vue';

import { Alert, Button } from 'antdv-next';

import { $t } from '#/locales';
import { useIntegrityAlerts } from '#/shared/composables/use-integrity-alerts';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useSystemControl } from '#/shared/composables/use-system-control';
import { useTradesPageTab } from '#/shared/composables/use-trades-page-tab';

defineOptions({ name: 'IntegrityBanner' });

const { openTradesTab } = useTradesPageTab();
const { alerts } = useIntegrityAlerts();
const { hasAccessByCodes } = useOxideAccess();
const { emergencyAck } = useSystemControl();

const canReadSystem = computed(() => hasAccessByCodes(['system:read']));
const canReconcile = computed(() => hasAccessByCodes(['trade:update']));
const canEmergencyAck = computed(() => hasAccessByCodes(['system:resume']));

function alertType(severity: 'critical' | 'warning') {
  return severity === 'critical' ? 'error' : 'warning';
}

function onAction(alert: (typeof alerts.value)[number]) {
  if (alert.openEmergencyAck && canEmergencyAck.value) {
    emergencyAck();
    return;
  }
  if (alert.tradesTab) {
    openTradesTab(alert.tradesTab);
  }
}

function showAction(alert: (typeof alerts.value)[number]) {
  if (alert.openEmergencyAck) {
    return canEmergencyAck.value;
  }
  if (alert.tradesTab) {
    return canReconcile.value;
  }
  return false;
}

function degradeReasonLabel(reason: {
  key: string;
  params?: Record<string, string>;
}): string {
  const params = reason.params;
  return params ? $t(reason.key, params) : $t(reason.key);
}
</script>

<template>
  <div
    v-if="canReadSystem && alerts.length > 0"
    class="border-border/60 bg-background/95 sticky top-0 z-20 flex flex-col gap-2 border-b px-4 py-2 backdrop-blur"
  >
    <Alert
      v-for="alert in alerts"
      :key="alert.code"
      :type="alertType(alert.severity)"
      show-icon
      class="!mb-0"
    >
      <template #message>
        <div
          class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-col gap-1">
            <span>
              {{
                $t(alert.messageKey, {
                  ...(alert.messageParams ?? {}),
                  class: alert.messageParams?.class
                    ? $t(
                        `enum.executionEmergencyClass.${alert.messageParams.class}`,
                      )
                    : undefined,
                })
              }}
            </span>
            <ul
              v-if="alert.degradeReasonKeys?.length"
              class="text-muted-foreground list-inside list-disc text-xs"
            >
              <li
                v-for="(reason, index) in alert.degradeReasonKeys"
                :key="index"
              >
                {{ degradeReasonLabel(reason) }}
              </li>
            </ul>
          </div>
          <Button
            v-if="alert.actionKey && showAction(alert)"
            size="small"
            :danger="alert.severity === 'critical'"
            class="mt-1 shrink-0 sm:mt-0"
            @click="onAction(alert)"
          >
            {{ $t(alert.actionKey) }}
          </Button>
        </div>
      </template>
    </Alert>
  </div>
</template>
