<script lang="ts" setup>
import type { KillSwitchState } from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';
import { KILL_SWITCH_STATES } from '@vben/types';

import { Alert, Button, Skeleton, Tag } from 'antdv-next';

import { getSystemStatus } from '#/api/system';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useKillSwitchStateTagOptions,
} from '#/shared/components/format/tag-options';
import { useKillSwitchAction } from '#/shared/composables/use-system-actions';
import { useSystemStore } from '#/store';

defineOptions({ name: 'ConfigOperationalControlPanel' });

interface KillSwitchActionDefinition {
  danger: boolean;
  icon: string;
  target: KillSwitchState;
}

const KILL_SWITCH_ACTIONS: readonly KillSwitchActionDefinition[] = [
  {
    danger: false,
    icon: 'lucide:circle-play',
    target: KILL_SWITCH_STATES.closed,
  },
  {
    danger: false,
    icon: 'lucide:file-lock-2',
    target: KILL_SWITCH_STATES.reportOnlyForced,
  },
  {
    danger: false,
    icon: 'lucide:log-out',
    target: KILL_SWITCH_STATES.exitOnly,
  },
  {
    danger: true,
    icon: 'lucide:pause-octagon',
    target: KILL_SWITCH_STATES.executionHalted,
  },
  {
    danger: true,
    icon: 'lucide:shield-alert',
    target: KILL_SWITCH_STATES.emergencyHalted,
  },
];

const systemStore = useSystemStore();
const { handleRequest } = useRequestHandler();
const killSwitchAction = useKillSwitchAction();
const loading = ref(false);
const transitioningTo = ref<KillSwitchState | null>(null);

const status = computed(
  () => systemStore.controlPlane ?? systemStore.status ?? null,
);
const killSwitch = computed(() => status.value?.kill_switch ?? null);
const stateTag = computed(() =>
  findTagOption(useKillSwitchStateTagOptions(), killSwitch.value?.state),
);
const isRestricted = computed(
  () =>
    Boolean(killSwitch.value) &&
    killSwitch.value?.state !== KILL_SWITCH_STATES.closed,
);

async function loadStatus() {
  if (status.value) return;
  loading.value = true;
  await handleRequest(getSystemStatus, (next) => {
    systemStore.applyControlPlaneStatus(next);
  });
  loading.value = false;
}

async function transition(target: KillSwitchState) {
  const current = killSwitch.value;
  if (!current || !killSwitchAction.canTransition(current.state, target)) {
    return;
  }
  transitioningTo.value = target;
  await killSwitchAction.setTo(current, target);
  transitioningTo.value = null;
}

onMounted(() => void loadStatus());
</script>

<template>
  <section class="bg-card rounded-xl border p-5" aria-live="polite">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <IconifyIcon
            class="text-primary size-5"
            icon="lucide:shield-ellipsis"
          />
          <h2 class="text-base font-semibold">
            {{ $t('page.config.operationalControl.title') }}
          </h2>
        </div>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ $t('page.config.operationalControl.description') }}
        </p>
      </div>
      <Tag v-if="stateTag" :color="stateTag.color">
        {{ stateTag.label }}
      </Tag>
    </div>

    <Skeleton v-if="loading" class="mt-4" :paragraph="{ rows: 3 }" active />
    <Alert
      v-else-if="!killSwitch"
      class="mt-4"
      :message="$t('page.config.operationalControl.unavailable')"
      show-icon
      type="error"
    />
    <template v-else>
      <Alert
        v-if="isRestricted"
        class="mt-4"
        :message="$t('page.config.operationalControl.restricted')"
        :description="killSwitch.last_reason"
        show-icon
        :type="
          killSwitch.state === KILL_SWITCH_STATES.emergencyHalted
            ? 'error'
            : 'warning'
        "
      />

      <dl
        class="mt-4 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3"
      >
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.phase') }}
          </dt>
          <dd class="mt-1 text-sm font-medium">
            {{
              $t(
                `page.config.operationalControl.phaseValue.${status?.operational_phase.phase}`,
              )
            }}
          </dd>
        </div>
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.changedBy') }}
          </dt>
          <dd class="mt-1 text-sm font-medium">
            {{ killSwitch.changed_by }}
          </dd>
        </div>
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.changedAt') }}
          </dt>
          <dd class="mt-1 text-sm font-medium">
            {{ formatDateTimeLocal(killSwitch.changed_at) }}
          </dd>
        </div>
      </dl>

      <div class="mt-5">
        <h3 class="text-sm font-semibold">
          {{ $t('page.config.operationalControl.actions') }}
        </h3>
        <p class="text-muted-foreground mt-1 text-xs">
          {{ $t('page.config.operationalControl.actionsDescription') }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button
            v-for="action in KILL_SWITCH_ACTIONS"
            :key="action.target"
            :danger="action.danger"
            :disabled="
              !killSwitchAction.canTransition(killSwitch.state, action.target)
            "
            :loading="transitioningTo === action.target"
            @click="transition(action.target)"
          >
            <IconifyIcon :icon="action.icon" />
            {{ $t(`page.config.operationalControl.action.${action.target}`) }}
          </Button>
        </div>
      </div>
    </template>
  </section>
</template>
