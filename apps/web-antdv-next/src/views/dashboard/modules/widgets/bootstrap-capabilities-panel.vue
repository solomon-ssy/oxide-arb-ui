<script lang="ts" setup>
import type {
  CapabilityReason,
  CapabilityView,
  SystemCapabilities,
  SystemControlPlaneStatus,
} from '@vben/types';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Tag } from 'antdv-next';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';

defineOptions({ name: 'BootstrapCapabilitiesPanel' });

const props = defineProps<{
  activating: boolean;
  canActivate: boolean;
  status: SystemControlPlaneStatus;
}>();

const emit = defineEmits<{ activate: [] }>();

type CapabilityKey = Exclude<keyof SystemCapabilities, 'revision'>;

const capabilityGroups: { capabilities: CapabilityKey[]; key: string }[] = [
  {
    capabilities: ['control_plane_ready', 'catalog_baseline_ready'],
    key: 'critical',
  },
  {
    capabilities: ['research_capture_enabled', 'automatic_parity_eligible'],
    key: 'collecting',
  },
  {
    capabilities: [
      'report_generation_eligible',
      'entry_admission_eligible',
      'order_submission_eligible',
    ],
    key: 'trading',
  },
];

const blockedCapabilities = computed(() =>
  capabilityGroups
    .flatMap((group) => group.capabilities)
    .filter((key) => !props.status.capabilities[key].enabled),
);

function reasonLabel(reason: CapabilityReason): string {
  return $t(`page.dashboard.bootstrap.reason.${reason}`);
}

function reasonSummary(capability: CapabilityView): string {
  return capability.reasons.map((reason) => reasonLabel(reason)).join(' · ');
}

const nextAction = computed(() => {
  if (props.status.bootstrap.phase === 'awaiting_activation') {
    return $t('page.dashboard.bootstrap.next.activate');
  }
  const firstBlocked = blockedCapabilities.value[0];
  if (firstBlocked) {
    return reasonSummary(props.status.capabilities[firstBlocked]);
  }
  return $t('page.dashboard.bootstrap.next.operational');
});
</script>

<template>
  <DashboardPanel
    :title="$t('page.dashboard.bootstrap.title')"
    icon="lucide:shield-check"
    tone="cyan"
  >
    <template #extra>
      <Button
        v-if="status.bootstrap.phase === 'awaiting_activation' && canActivate"
        :loading="activating"
        size="small"
        type="primary"
        @click="emit('activate')"
      >
        <IconifyIcon icon="lucide:power" class="mr-1.5 size-4" />
        {{ $t('page.dashboard.bootstrap.activate') }}
      </Button>
    </template>

    <div class="flex flex-col gap-3">
      <div class="grid grid-cols-1 gap-3 border-b pb-3 md:grid-cols-3">
        <div class="flex items-center gap-2 md:border-r">
          <span class="text-muted-foreground text-xs">
            {{ $t('page.dashboard.bootstrap.phase') }}
          </span>
          <Tag
            :color="status.bootstrap.phase === 'active' ? 'success' : 'warning'"
          >
            {{
              $t(
                `page.dashboard.bootstrap.phaseValue.${status.bootstrap.phase}`,
              )
            }}
          </Tag>
        </div>
        <div class="flex items-center gap-2 md:border-r">
          <span class="text-muted-foreground text-xs">
            {{ $t('page.dashboard.bootstrap.blockedCount') }}
          </span>
          <Tag :color="blockedCapabilities.length > 0 ? 'warning' : 'success'">
            {{ blockedCapabilities.length }}
          </Tag>
        </div>
        <div class="min-w-0">
          <div class="text-muted-foreground text-xs">
            {{ $t('page.dashboard.bootstrap.nextAction') }}
          </div>
          <div class="mt-0.5 text-sm font-medium">{{ nextAction }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section v-for="group in capabilityGroups" :key="group.key">
          <div class="text-muted-foreground mb-1 text-xs font-medium">
            {{ $t(`page.dashboard.bootstrap.group.${group.key}`) }}
          </div>
          <div
            v-for="capabilityKey in group.capabilities"
            :key="capabilityKey"
            class="flex min-w-0 items-start justify-between gap-3 border-b py-2.5"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium">
                {{ $t(`page.dashboard.bootstrap.capability.${capabilityKey}`) }}
              </div>
              <div
                v-if="!status.capabilities[capabilityKey].enabled"
                class="text-muted-foreground mt-0.5 text-xs leading-5"
              >
                {{ reasonSummary(status.capabilities[capabilityKey]) }}
              </div>
            </div>
            <Tag
              :color="
                status.capabilities[capabilityKey].enabled
                  ? 'success'
                  : 'default'
              "
            >
              {{
                status.capabilities[capabilityKey].enabled
                  ? $t('page.dashboard.bootstrap.enabled')
                  : $t('page.dashboard.bootstrap.blocked')
              }}
            </Tag>
          </div>
        </section>
      </div>
    </div>
  </DashboardPanel>
</template>
