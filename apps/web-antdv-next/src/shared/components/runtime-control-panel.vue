<script lang="ts" setup>
import type {
  EntryAuthorizationPolicy,
  KillSwitchState,
  KillSwitchView,
  SettlementWritePolicy,
} from '@vben/types';

import { computed, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';
import {
  ENTRY_AUTHORIZATION_POLICIES,
  KILL_SWITCH_STATES,
  SETTLEMENT_WRITE_POLICIES,
} from '@vben/types';

import { Alert, Button, Skeleton, Tag } from 'antdv-next';

import { getRuntimeControls, getSystemStatus } from '#/api/system';
import { $t } from '#/locales';
import AccountRecoveryPanel from '#/shared/components/account-recovery-panel.vue';
import EnumTag from '#/shared/components/enum-tag.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  useEntryAuthorizationPolicyAction,
  useKillSwitchAction,
  useSettlementWritePolicyAction,
} from '#/shared/composables/use-system-actions';
import { useSystemStore } from '#/store';

defineOptions({ name: 'RuntimeControlPanel' });

interface KillSwitchActionDefinition {
  danger: boolean;
  icon: string;
  target: KillSwitchState;
}

const ENTRY_AUTHORIZATION_ACTIONS: readonly EntryAuthorizationPolicy[] = [
  ENTRY_AUTHORIZATION_POLICIES.operatorApprovalRequired,
  ENTRY_AUTHORIZATION_POLICIES.policyAutomatic,
];

const SETTLEMENT_POLICY_ACTIONS: readonly SettlementWritePolicy[] = [
  SETTLEMENT_WRITE_POLICIES.disabled,
  SETTLEMENT_WRITE_POLICIES.governedCanary,
  SETTLEMENT_WRITE_POLICIES.operatorApproval,
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
const entryAuthorizationAction = useEntryAuthorizationPolicyAction();
const settlementPolicyAction = useSettlementWritePolicyAction();
const killSwitchAction = useKillSwitchAction();
const loading = ref(false);
const transitioningAuthorization = ref<EntryAuthorizationPolicy | null>(null);
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
const settlementPolicy = computed(
  () => controls.value?.settlement_write_policy ?? null,
);
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

async function transitionEntryAuthorization(target: EntryAuthorizationPolicy) {
  const current = controls.value?.entry_authorization_policy ?? null;
  const expectedRevision = controls.value?.revision;
  if (
    !entryAuthorizationAction.canSwitch ||
    !current ||
    current === target ||
    expectedRevision === undefined
  ) {
    return;
  }
  transitioningAuthorization.value = target;
  await entryAuthorizationAction.switchTo(current, target, expectedRevision);
  transitioningAuthorization.value = null;
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
            {{ $t('page.config.operationalControl.entryAuthorizationPolicy') }}
          </dt>
          <dd class="mt-1">
            <EnumTag
              context="runtime-control"
              name="EntryAuthorizationPolicy"
              :value="controls.entry_authorization_policy"
            />
          </dd>
        </div>
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.settlementWritePolicy') }}
          </dt>
          <dd class="mt-1">
            <EnumTag
              context="runtime-control"
              name="SettlementWritePolicy"
              :value="settlementPolicy"
            />
          </dd>
        </div>
        <div class="bg-card px-4 py-3">
          <dt class="text-muted-foreground text-xs">
            {{ $t('page.config.operationalControl.killSwitch') }}
          </dt>
          <dd class="mt-1">
            <EnumTag
              context="runtime-control"
              name="KillSwitchState"
              :value="controls.kill_switch_state"
            />
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
          <dd
            class="mt-1 w-fit font-mono text-sm font-medium"
            data-screenshot-volatile="true"
          >
            {{ formatDateTimeLocal(controls.changed_at) }}
          </dd>
        </div>
      </dl>

      <div class="mt-5 grid gap-5 xl:grid-cols-3">
        <section>
          <h3 class="text-sm font-semibold">
            {{ $t('page.config.operationalControl.entryAuthorizationActions') }}
          </h3>
          <p class="text-muted-foreground mt-1 text-xs">
            {{
              $t('page.config.operationalControl.entryAuthorizationDescription')
            }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button
              v-for="target in ENTRY_AUTHORIZATION_ACTIONS"
              :key="target"
              :danger="target === ENTRY_AUTHORIZATION_POLICIES.policyAutomatic"
              :disabled="
                !entryAuthorizationAction.canSwitch ||
                controls.entry_authorization_policy === target
              "
              :loading="transitioningAuthorization === target"
              @click="transitionEntryAuthorization(target)"
            >
              {{ $t(`enum.entryAuthorizationPolicy.${target}`) }}
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
              :danger="target === SETTLEMENT_WRITE_POLICIES.operatorApproval"
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
      <AccountRecoveryPanel class="mt-5" />
    </template>
  </section>
</template>
