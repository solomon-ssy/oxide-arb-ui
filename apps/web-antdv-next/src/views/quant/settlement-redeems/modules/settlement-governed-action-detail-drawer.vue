<script lang="ts" setup>
import type {
  SettlementGovernedActionDetailView,
  SettlementGovernedActionView,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Tag,
} from 'antdv-next';

import { getSettlementGovernedAction } from '#/api/settlement-redeems';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import EntityDetailHeader from '#/shared/components/entity-detail-header.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatUsd,
} from '#/shared/components/format';
import { useDrawerSettlementRevisionRefresh } from '#/shared/composables/use-drawer-settlement-revision-refresh';

import { isSettlementGovernedActionRevocable } from './settlement-action-state';
import { useSettlementActions } from './use-settlement-actions';

defineOptions({ name: 'SettlementGovernedActionDetailDrawer' });

interface DrawerData {
  action: SettlementGovernedActionView;
  onChanged?: () => Promise<void> | void;
}

const { handleRequest } = useRequestHandler();
const seed = ref<null | SettlementGovernedActionView>(null);
const detail = ref<null | SettlementGovernedActionDetailView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
const openId = ref<null | string>(null);
const changed = ref<(() => Promise<void> | void) | null>(null);

const { canRevoke: hasRevokePermission, revokeAction } = useSettlementActions(
  async () => {
    if (openId.value) {
      await refresh(openId.value);
    }
    await changed.value?.();
  },
);

const action = computed(() => detail.value ?? seed.value);
const submission = computed(() => detail.value?.submission ?? null);
const receipt = computed(() => submission.value?.receipt_evidence ?? null);
const canRevoke = computed(
  () =>
    hasRevokePermission &&
    !!action.value &&
    isSettlementGovernedActionRevocable(action.value.state),
);
const notFound = computed(
  () => !action.value && !loading.value && !loadError.value,
);

async function refresh(id: string) {
  loading.value = true;
  loadError.value = null;
  try {
    const fresh = await handleRequest(() => getSettlementGovernedAction(id), {
      onError(error) {
        if (error.httpStatus !== 404) {
          loadError.value = error.message;
        }
      },
      silent: true,
    });
    if (openId.value === id) {
      detail.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

async function revokeCurrent() {
  if (action.value) {
    await revokeAction(action.value);
  }
}

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<DrawerData>();
      seed.value = data.action;
      detail.value = null;
      changed.value = data.onChanged ?? null;
      openId.value = data.action.settlement_governed_action_id;
      void refresh(data.action.settlement_governed_action_id);
    } else {
      seed.value = null;
      detail.value = null;
      changed.value = null;
      loadError.value = null;
      openId.value = null;
    }
  },
});

useDrawerSettlementRevisionRefresh(openId, refresh);
</script>

<template>
  <Drawer
    class="w-full max-w-4xl"
    :title="$t('page.quantSettlementRedeems.governed.detailTitle')"
  >
    <AsyncState
      :error-message="loadError"
      :loading="loading && !action"
      :not-found="notFound"
      :not-found-text="$t('page.quantSettlementRedeems.governed.notFound')"
      @retry="openId && refresh(openId)"
    >
      <div v-if="action" class="flex flex-col gap-4">
        <EntityDetailHeader
          :id="action.settlement_governed_action_id"
          :tags="[{ label: action.state }]"
        />

        <Card
          size="small"
          :title="$t('page.quantSettlementRedeems.governed.actionScope')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.kind')"
            >
              {{ action.kind }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.authorizedBy')"
            >
              <span class="font-mono text-xs break-all">{{
                action.authorized_by
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.reason')"
            >
              {{ action.authorization_reason }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.scopeDigest')"
            >
              <span class="font-mono text-xs break-all">{{
                action.scope_digest
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.routeTarget')"
            >
              <span class="font-mono text-xs break-all">
                {{ action.route ?? EMPTY_PLACEHOLDER }} /
                {{ action.target_adapter ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.deployment')"
            >
              <span class="font-mono text-xs break-all">{{
                action.deployment_digest ?? EMPTY_PLACEHOLDER
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.verifiedBlock')"
            >
              <span class="font-mono text-xs break-all">
                {{ action.verified_block_number ?? EMPTY_PLACEHOLDER }} /
                {{ action.verified_block_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.approvalState')"
            >
              {{ action.desired_approval ?? EMPTY_PLACEHOLDER }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.payoutCeiling')"
            >
              {{ formatUsd(action.payout_ceiling_usd) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.expiresAt')"
            >
              {{ formatDateTimeLocal(action.expires_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.nextAttemptAt')"
            >
              {{ formatDateTimeLocal(action.next_attempt_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.failure')"
            >
              <span :class="{ 'text-destructive': action.failure_code }">
                {{ action.failure_code ?? EMPTY_PLACEHOLDER }} /
                {{ action.last_error ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
          </Descriptions>
          <Button v-if="canRevoke" class="mt-3" danger @click="revokeCurrent">
            {{ $t('page.quantSettlementRedeems.governed.revokeAction') }}
          </Button>
        </Card>

        <Card
          size="small"
          :title="$t('page.quantSettlementRedeems.governed.submissionProof')"
        >
          <Descriptions v-if="submission" :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.submissionId')"
            >
              <span class="font-mono text-xs break-all">{{
                submission.settlement_chain_submission_id
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.quantSettlementRedeems.governed.submissionState')
              "
            >
              <Tag>{{ submission.purpose }} · {{ submission.state }}</Tag>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.callIdentity')"
            >
              <span class="font-mono text-xs break-all">
                {{ submission.call_target }} /
                {{ submission.calldata_hash }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.chainIdentity')"
            >
              <span class="font-mono text-xs break-all">
                {{ submission.relayer_transaction_id ?? EMPTY_PLACEHOLDER }} /
                {{ submission.transaction_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.governed.failureHistory')"
            >
              <div
                v-if="submission.failure_history.entries.length > 0"
                class="flex flex-col gap-1"
              >
                <span
                  v-for="failure in submission.failure_history.entries"
                  :key="`${failure.observed_at}:${failure.code}`"
                >
                  {{ formatDateTimeLocal(failure.observed_at) }} ·
                  {{ failure.code }} · {{ failure.detail }}
                </span>
              </div>
              <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              v-if="receipt"
              :label="$t('page.quantSettlementRedeems.governed.receipt')"
            >
              <div class="flex flex-col gap-1">
                <span>{{ receipt.kind }}</span>
                <span class="font-mono text-xs break-all">
                  {{ receipt.evidence.transaction_hash }} ·
                  {{ receipt.evidence.block_number }} /
                  {{ receipt.evidence.block_hash }}
                </span>
                <span class="font-mono text-xs break-all">
                  outer {{ receipt.evidence.call.outer_target }} /
                  {{ receipt.evidence.call.outer_calldata_hash }}
                </span>
                <span class="font-mono text-xs break-all">
                  inner {{ receipt.evidence.call.inner_target }} /
                  {{ receipt.evidence.call.inner_calldata_hash }}
                </span>
                <span v-if="receipt.kind === 'operator_approval'">
                  desired {{ receipt.evidence.desired_approval }} · observed
                  {{ receipt.evidence.operator_approved }}
                </span>
                <span v-else>
                  mint {{ formatUsd(receipt.evidence.pusd_mint.amount_usd) }} ·
                  wrapped
                  {{ formatUsd(receipt.evidence.wrapped_payout.amount_usd) }}
                </span>
              </div>
            </DescriptionsItem>
          </Descriptions>
          <Empty
            v-else
            :description="
              $t('page.quantSettlementRedeems.governed.noSubmission')
            "
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>
      </div>
    </AsyncState>
  </Drawer>
</template>
