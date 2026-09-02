<script lang="ts" setup>
import type { AccountRecoveryIncidentView } from '@vben/types';

import type { AllocationRequirement } from '#/shared/components/account-recovery-allocation';

import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Input,
  message,
  Skeleton,
  Tag,
} from 'antdv-next';

import {
  getActiveAccountRecoveryIncident,
  pauseAndReconcileAccountRecovery,
  sealAccountRecoveryIncident,
  unpauseAndFinalizeAccountRecovery,
} from '#/api/system';
import { $t } from '#/locales';
import { buildRecoveryAllocations } from '#/shared/components/account-recovery-allocation';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';

import EnumTag from './enum-tag.vue';
import { EMPTY_PLACEHOLDER, formatDateTimeLocal } from './format';

defineOptions({ name: 'AccountRecoveryPanel' });

const { governed } = useGovernedAction();
const { hasAccessByCodes } = useQpAccess();
const loading = ref(false);
const acting = ref<'reconcile' | 'seal' | 'unpause' | null>(null);
const incident = ref<AccountRecoveryIncidentView | null>(null);
const loadFailed = ref(false);
const allocationDraft = ref<Record<string, Record<string, string>>>({});

const canReconcile = hasAccessByCodes(['system:emergency']);
const canSeal = hasAccessByCodes(['system:resolve']);
const canUnpause = hasAccessByCodes(['system:resume']);
const manifest = computed(() => incident.value?.latest_manifest ?? null);
const unpauseConfirmed = computed(() =>
  (incident.value?.pause_operations ?? []).some(
    (operation) =>
      operation.operation_kind === 'unpause' && operation.state === 'confirmed',
  ),
);
const allocationRequirements = computed<AllocationRequirement[]>(() =>
  (manifest.value?.assessment.mismatches ?? []).filter(
    (mismatch): mismatch is AllocationRequirement =>
      mismatch.kind === 'lot_allocation_required',
  ),
);

async function load() {
  loading.value = true;
  loadFailed.value = false;
  try {
    incident.value = await getActiveAccountRecoveryIncident();
  } catch {
    loadFailed.value = true;
    incident.value = null;
  } finally {
    loading.value = false;
  }
}

function allocationValue(executionId: string, lotId: string): string {
  return allocationDraft.value[executionId]?.[lotId] ?? '';
}

function setAllocation(executionId: string, lotId: string, value: string) {
  allocationDraft.value = {
    ...allocationDraft.value,
    [executionId]: {
      ...allocationDraft.value[executionId],
      [lotId]: value,
    },
  };
}

async function reconcile() {
  const current = incident.value;
  if (!current || !canReconcile) return;
  const allocationResult = buildRecoveryAllocations(
    allocationRequirements.value,
    allocationDraft.value,
  );
  if (!allocationResult.ok) {
    void message.error(
      allocationResult.error === 'invalid_decimal'
        ? $t('page.accountRecovery.allocation.invalidDecimal')
        : $t('page.accountRecovery.allocation.totalMismatch', {
            expected: allocationResult.expected,
          }),
    );
    return;
  }
  acting.value = 'reconcile';
  const result = await governed(
    (ctx) =>
      pauseAndReconcileAccountRecovery(
        current.incident.account_recovery_incident_id,
        {
          expected_revision: current.incident.revision,
          reason: ctx.reason,
          sell_allocations: allocationResult.allocations,
        },
        ctx,
      ),
    {
      confirmWord: 'RECOVER',
      danger: true,
      summary: $t('page.accountRecovery.actions.reconcileSummary'),
      title: $t('page.accountRecovery.actions.reconcileTitle'),
    },
  );
  if (result) incident.value = result;
  acting.value = null;
}

async function seal() {
  const current = incident.value;
  const currentManifest = manifest.value;
  if (!current || !currentManifest?.converged || !canSeal) return;
  acting.value = 'seal';
  const result = await governed(
    (ctx) =>
      sealAccountRecoveryIncident(
        current.incident.account_recovery_incident_id,
        {
          account_recovery_manifest_id:
            currentManifest.account_recovery_manifest_id,
          expected_revision: current.incident.revision,
          reason: ctx.reason,
        },
        ctx,
      ),
    {
      confirmWord: 'SEAL',
      danger: true,
      summary: $t('page.accountRecovery.actions.sealSummary'),
      title: $t('page.accountRecovery.actions.sealTitle'),
    },
  );
  if (result) incident.value = result;
  acting.value = null;
}

async function unpause() {
  const current = incident.value;
  if (!current?.incident.seal_hash || !canUnpause) return;
  acting.value = 'unpause';
  const result = await governed(
    (ctx) =>
      unpauseAndFinalizeAccountRecovery(
        current.incident.account_recovery_incident_id,
        {
          expected_revision: current.incident.revision,
          reason: ctx.reason,
        },
        ctx,
      ),
    {
      confirmWord: 'UNPAUSE',
      danger: true,
      summary: $t('page.accountRecovery.actions.unpauseSummary'),
      title: $t('page.accountRecovery.actions.unpauseTitle'),
    },
  );
  if (result) incident.value = result;
  acting.value = null;
}

onMounted(() => void load());
</script>

<template>
  <Card
    data-testid="account-recovery-panel"
    size="small"
    :title="$t('page.accountRecovery.title')"
  >
    <Skeleton v-if="loading" active :paragraph="{ rows: 4 }" />
    <Alert
      v-else-if="loadFailed"
      :message="$t('page.accountRecovery.loadFailed')"
      show-icon
      type="error"
    />
    <Alert
      v-else-if="!incident"
      :message="$t('page.accountRecovery.noActiveIncident')"
      show-icon
      type="success"
    />
    <div v-else class="space-y-4">
      <Descriptions :column="2" bordered size="small">
        <DescriptionsItem :label="$t('page.accountRecovery.incidentId')">
          <span class="font-mono text-xs break-all">{{
            incident.incident.account_recovery_incident_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.accountRecovery.status')">
          <EnumTag
            context="account-recovery"
            name="AccountRecoveryIncidentStatus"
            :value="incident.incident.status"
          />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.accountRecovery.kind')">
          <EnumTag
            context="account-recovery"
            name="AccountRecoveryIncidentKind"
            :value="incident.incident.kind"
          />
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.accountRecovery.reason')">
          {{ incident.incident.reason }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.accountRecovery.revision')">
          {{ incident.incident.revision }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.accountRecovery.openedAt')">
          {{ formatDateTimeLocal(incident.incident.opened_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.accountRecovery.sealHash')">
          <span class="font-mono text-xs break-all">{{
            incident.incident.seal_hash ?? EMPTY_PLACEHOLDER
          }}</span>
        </DescriptionsItem>
      </Descriptions>

      <Alert
        v-if="manifest && !manifest.converged"
        :message="
          $t('page.accountRecovery.mismatchCount', {
            count: manifest.assessment.mismatches.length,
          })
        "
        show-icon
        type="warning"
      />

      <section
        v-for="requirement in allocationRequirements"
        :key="requirement.account_chain_execution_id"
        class="rounded-lg border p-3"
      >
        <h4 class="text-sm font-semibold">
          {{ $t('page.accountRecovery.allocation.title') }}
        </h4>
        <p class="text-muted-foreground mt-1 text-xs">
          {{ requirement.account_chain_execution_id }} ·
          {{ $t('page.accountRecovery.allocation.soldShares') }}
          {{ requirement.sold_shares }}
        </p>
        <div class="mt-3 grid gap-2">
          <label
            v-for="lotId in requirement.candidate_lot_ids"
            :key="lotId"
            class="grid gap-1 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
          >
            <span class="font-mono text-xs break-all">{{ lotId }}</span>
            <Input
              data-testid="account-recovery-allocation-input"
              :placeholder="$t('page.accountRecovery.allocation.shares')"
              :value="
                allocationValue(requirement.account_chain_execution_id, lotId)
              "
              @update:value="
                setAllocation(
                  requirement.account_chain_execution_id,
                  lotId,
                  String($event),
                )
              "
            />
          </label>
        </div>
      </section>

      <div class="flex flex-wrap gap-2">
        <Button
          data-testid="account-recovery-reconcile"
          danger
          :disabled="!canReconcile"
          :loading="acting === 'reconcile'"
          @click="reconcile"
        >
          {{ $t('page.accountRecovery.actions.reconcile') }}
        </Button>
        <Button
          data-testid="account-recovery-seal"
          danger
          :disabled="
            !canSeal || !manifest?.converged || !!incident.incident.seal_hash
          "
          :loading="acting === 'seal'"
          @click="seal"
        >
          {{ $t('page.accountRecovery.actions.seal') }}
        </Button>
        <Button
          data-testid="account-recovery-unpause"
          danger
          :disabled="
            !canUnpause || !incident.incident.seal_hash || unpauseConfirmed
          "
          :loading="acting === 'unpause'"
          @click="unpause"
        >
          {{ $t('page.accountRecovery.actions.unpause') }}
        </Button>
      </div>

      <section v-if="incident.pause_operations.length > 0">
        <h4 class="mb-2 text-sm font-semibold">
          {{ $t('page.accountRecovery.pauseOperations') }}
        </h4>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="operation in incident.pause_operations"
            :key="operation.account_pause_operation_id"
          >
            {{ operation.operation_kind }} · {{ operation.state }} ·
            {{ operation.exchange_address }}
          </Tag>
        </div>
      </section>
    </div>
  </Card>
</template>
