<script lang="ts" setup>
import type {
  KillSwitchState,
  KillSwitchView,
  QuantRuntimeMode,
  SettlementWritePolicy,
} from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';
import {
  KILL_SWITCH_STATES,
  QUANT_RUNTIME_MODES,
  SETTLEMENT_WRITE_POLICIES,
} from '@vben/types';

import { Alert, Button, Skeleton, Tag } from 'antdv-next';

import { getRuntimeControls, getSystemStatus } from '#/api/system';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useKillSwitchStateTagOptions,
  useQuantRuntimeModeTagOptions,
} from '#/shared/components/format/tag-options';
import {
  useKillSwitchAction,
  useQuantModeAction,
  useSettlementWritePolicyAction,
} from '#/shared/composables/use-system-actions';
import { useSystemStore } from '#/store';

defineOptions({ name: 'RuntimeControlPanel' });

interface KillSwitchActionDefinition {
  danger: boolean;
  icon: string;
  target: KillSwitchState;
}

const QUANT_MODE_ACTIONS: readonly QuantRuntimeMode[] = [
  QUANT_RUNTIME_MODES.reportOnly,
  QUANT_RUNTIME_MODES.semiAuto,
  QUANT_RUNTIME_MODES.autoExecution,
];

const SETTLEMENT_POLICY_ACTIONS: readonly SettlementWritePolicy[] = [
  SETTLEMENT_WRITE_POLICIES.disabled,
  SETTLEMENT_WRITE_POLICIES.governedCanary,
  SETTLEMENT_WRITE_POLICIES.semiAuto,
  SETTLEMENT_WRITE_POLICIES.auto,
];

const KILL_SWITCH_ACTIONS: readonly KillSwitchActionDefinition[] = [
  {
    danger: false,
    icon: 'lucide:circle-play',
    target: KILL_SWITCH_STATES.closed,
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
const quantModeAction = useQuantModeAction();
const settlementPolicyAction = useSettlementWritePolicyAction();
const killSwitchAction = useKillSwitchAction();
const loading = ref(false);
const transitioningMode = ref<null | QuantRuntimeMode>(null);
const transitioningPolicy = ref<null | SettlementWritePolicy>(null);
const transitioningKillSwitch = ref<KillSwitchState | null>(null);

const controls = computed(() => systemStore.runtimeControls);
const status = computed(
  () => systemStore.controlPlane ?? systemStore.status ?? null,
);
const killSwitch = computed<KillSwitchView | null>(() => {
  const snapshot = controls.value;
  if (!snapshot) return null;
  return {
    changed_at: snapshot.changed_at,
    changed_by: snapshot.changed_by,
    last_reason: snapshot.reason,
    requires_operator_ack: snapshot.kill_switch_requires_ack,
    revision: snapshot.revision,
    state: snapshot.kill_switch_state,
  };
});
const modeTag = computed(() =>
  findTagOption(
    useQuantRuntimeModeTagOptions(),
    controls.value?.quant_runtime_mode,
  ),
);
const killSwitchTag = computed(() =>
  findTagOption(
    useKillSwitchStateTagOptions(),
    controls.value?.kill_switch_state,
  ),
);
const settlementPolicyColor = computed(() => {
  switch (controls.value?.settlement_write_policy) {
    case SETTLEMENT_WRITE_POLICIES.auto: {
      return 'error';
    }
    case SETTLEMENT_WRITE_POLICIES.disabled: {
      return 'default';
    }
    case SETTLEMENT_WRITE_POLICIES.governedCanary:
    case SETTLEMENT_WRITE_POLICIES.semiAuto: {
      return 'warning';
    }
    default: {
      return 'default';
    }
  }
});
const isRestricted = computed(
  () =>
    Boolean(controls.value) &&
    controls.value?.kill_switch_state !== KILL_SWITCH_STATES.closed,
);

async function loadTruth() {
  loading.value = true;
  await handleRequest(
    () => Promise.all([getSystemStatus(), getRuntimeControls()]),
    ([nextStatus, nextControls]) => {
      systemStore.applyControlPlaneStatus(nextStatus);
      systemStore.applyRuntimeControls(nextControls);
    },
  );
  loading.value = false;
}

async function transitionMode(target: QuantRuntimeMode) {
  const current = controls.value?.quant_runtime_mode ?? null;
  const expectedRevision = controls.value?.revision;
  if (
    !quantModeAction.canSwitch ||
    !current ||
    current === target ||
    expectedRevision === undefined
  ) {
    return;
  }
  transitioningMode.value = target;
  await quantModeAction.switchTo(current, target, expectedRevision);
  transitioningMode.value = null;
}

async function transitionSettlementPolicy(target: SettlementWritePolicy) {
  const current = controls.value?.settlement_write_policy ?? null;
  const expectedRevision = controls.value?.revision;
  if (
    !settlementPolicyAction.canSwitch ||
    !current ||
    current === target ||
    expectedRevision === undefined
  ) {
    return;
  }
  transitioningPolicy.value = target;
  await settlementPolicyAction.switchTo(current, target, expectedRevision);
  transitioningPolicy.value = null;
}

async function transitionKillSwitch(target: KillSwitchState) {
  const current = killSwitch.value;
  const expectedRevision = controls.value?.revision;
  if (
    !current ||
    expectedRevision === undefined ||
    !killSwitchAction.canTransition(current.state, target)
  ) {
    return;
  }
  transitioningKillSwitch.value = target;
  await killSwitchAction.setTo(current, target, expectedRevision);
  transitioningKillSwitch.value = null;
}

onMounted(() => void loadTruth());
</script>

<template>
  <section
    class="bg-card rounded-xl border p-5"
    aria-live="polite"
    data-testid="runtime-control-panel"
  >
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
      <Tag v-if="controls" color="blue">
        {{ $t('page.config.operationalControl.revision') }}
        {{ controls.revision }}
      </Tag>
    </div>

    <Skeleton v-if="loading" class="mt-4" :paragraph="{ rows: 5 }" active />
    <Alert
      v-else-if="!controls"
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
        :description="controls.reason"
        show-icon
        :type="
          controls.kill_switch_state === KILL_SWITCH_STATES.emergencyHalted
            ? 'error'
            : 'warning'
        "
      />

      <dl
        class="mt-4 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-5"
      >
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.quantMode') }}
          </dt>
          <dd class="mt-1">
            <Tag v-if="modeTag" :color="modeTag.color">
              {{ modeTag.label }}
            </Tag>
          </dd>
        </div>
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.settlementWritePolicy') }}
          </dt>
          <dd class="mt-1">
            <Tag :color="settlementPolicyColor">
              {{
                $t(
                  `enum.settlementWritePolicy.${controls.settlement_write_policy}`,
                )
              }}
            </Tag>
          </dd>
        </div>
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.killSwitch') }}
          </dt>
          <dd class="mt-1">
            <Tag v-if="killSwitchTag" :color="killSwitchTag.color">
              {{ killSwitchTag.label }}
            </Tag>
          </dd>
        </div>
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.changedBy') }}
          </dt>
          <dd class="mt-1 text-sm font-medium">
            {{ controls.changed_by }}
          </dd>
        </div>
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.changedAt') }}
          </dt>
          <dd class="mt-1 text-sm font-medium">
            {{ formatDateTimeLocal(controls.changed_at) }}
          </dd>
        </div>
      </dl>

      <div class="mt-5 grid gap-5 xl:grid-cols-3">
        <section>
          <h3 class="text-sm font-semibold">
            {{ $t('page.config.operationalControl.quantModeActions') }}
          </h3>
          <p class="text-muted-foreground mt-1 text-xs">
            {{ $t('page.config.operationalControl.quantModeDescription') }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button
              v-for="target in QUANT_MODE_ACTIONS"
              :key="target"
              :danger="target === QUANT_RUNTIME_MODES.autoExecution"
              :disabled="
                !quantModeAction.canSwitch ||
                controls.quant_runtime_mode === target
              "
              :loading="transitioningMode === target"
              @click="transitionMode(target)"
            >
              {{ $t(`enum.quantRuntimeMode.${target}`) }}
            </Button>
          </div>
        </section>

        <section>
          <h3 class="text-sm font-semibold">
            {{ $t('page.config.operationalControl.settlementPolicyActions') }}
          </h3>
          <p class="text-muted-foreground mt-1 text-xs">
            {{
              $t('page.config.operationalControl.settlementPolicyDescription')
            }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button
              v-for="target in SETTLEMENT_POLICY_ACTIONS"
              :key="target"
              :danger="target === SETTLEMENT_WRITE_POLICIES.auto"
              :disabled="
                !settlementPolicyAction.canSwitch ||
                controls.settlement_write_policy === target
              "
              :loading="transitioningPolicy === target"
              @click="transitionSettlementPolicy(target)"
            >
              {{ $t(`enum.settlementWritePolicy.${target}`) }}
            </Button>
          </div>
        </section>

        <section>
          <h3 class="text-sm font-semibold">
            {{ $t('page.config.operationalControl.killSwitchActions') }}
          </h3>
          <p class="text-muted-foreground mt-1 text-xs">
            {{ $t('page.config.operationalControl.killSwitchDescription') }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button
              v-for="action in KILL_SWITCH_ACTIONS"
              :key="action.target"
              :danger="action.danger"
              :disabled="
                !killSwitchAction.canTransition(
                  controls.kill_switch_state,
                  action.target,
                )
              "
              :loading="transitioningKillSwitch === action.target"
              @click="transitionKillSwitch(action.target)"
            >
              <IconifyIcon :icon="action.icon" />
              {{ $t(`page.config.operationalControl.action.${action.target}`) }}
            </Button>
          </div>
        </section>
      </div>

      <div class="bg-muted/40 mt-5 rounded-lg border px-4 py-3 text-xs">
        <span class="text-muted-foreground">
          {{ $t('page.config.operationalControl.lastReason') }}
        </span>
        <span class="ml-2">{{ controls.reason }}</span>
        <span v-if="status" class="text-muted-foreground ml-4">
          {{ $t('page.config.operationalControl.phase') }}:
          {{
            $t(
              `page.config.operationalControl.phaseValue.${status.operational_phase.phase}`,
            )
          }}
        </span>
      </div>
    </template>
  </section>
</template>
