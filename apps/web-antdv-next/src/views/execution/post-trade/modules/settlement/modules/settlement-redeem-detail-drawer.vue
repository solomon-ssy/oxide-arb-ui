<script lang="ts" setup>
import type {
  SettlementChainSubmissionView,
  SettlementRedeemDetailView,
  SettlementRedeemView,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Input,
  Table,
} from 'antdv-next';

import { getSettlementRedeem } from '#/api/settlement-redeems';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import EnumTag from '#/shared/components/enum-tag.vue';
import {
  EMPTY_PLACEHOLDER,
  formatDateTimeLocal,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import { ObjectInspectorHeader } from '#/shared/components/object-inspector';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { useDrawerSettlementRevisionRefresh } from '#/shared/composables/use-drawer-settlement-revision-refresh';
import { positionOpenPath } from '#/shared/routes/execution-plane';

import {
  formatSettlementDeploymentAdvisory,
  formatSettlementReadinessReason,
} from './format-settlement-readiness';
import {
  canAuthorizeSettlementCanary,
  settlementAuthorizationAction,
} from './settlement-action-state';
import { useSettlementActions } from './use-settlement-actions';

defineOptions({ name: 'SettlementRedeemDetailDrawer' });

interface SettlementRedeemDrawerData {
  onChanged?: () => Promise<void> | void;
  redeem: SettlementRedeemView;
}

const { handleRequest } = useRequestHandler();

const seed = ref<null | SettlementRedeemView>(null);
const detail = ref<null | SettlementRedeemDetailView>(null);
const loading = ref(false);
const loadError = ref<null | string>(null);
const openId = ref<null | string>(null);
const changed = ref<(() => Promise<void> | void) | null>(null);
const canaryPayoutCeiling = ref('');

const {
  authorizeCanary,
  canApprove: hasApprovePermission,
  canCreate,
  canRevoke: hasRevokePermission,
  mutateBatchAuthorization,
} = useSettlementActions(async () => {
  if (openId.value) {
    await refreshDetail(openId.value);
  }
  await changed.value?.();
});

const header = computed<null | SettlementRedeemView>(
  () => detail.value ?? seed.value,
);
const inventoryLots = computed(() => detail.value?.inventory_lots ?? []);
const redeemedLots = computed(() => detail.value?.redeemed_lots ?? []);
const submissions = computed(() => detail.value?.submissions ?? []);
const authorizationAction = computed(() =>
  settlementAuthorizationAction(header.value),
);
const canApprove = computed(
  () => hasApprovePermission && authorizationAction.value === 'approve',
);
const canRevoke = computed(
  () => hasRevokePermission && authorizationAction.value === 'revoke',
);
const canAuthorizeCanary = computed(() =>
  canAuthorizeSettlementCanary(
    canCreate,
    header.value,
    canaryPayoutCeiling.value,
  ),
);

const notFound = computed(
  () => !header.value && !loading.value && !loadError.value,
);

const inventoryLotColumns = [
  {
    dataIndex: 'token_id',
    key: 'token_id',
    title: $t('page.quantSettlementRedeems.inventoryLots.token'),
  },
  {
    dataIndex: 'side',
    key: 'side',
    title: $t('page.quantSettlementRedeems.inventoryLots.side'),
  },
  {
    dataIndex: 'shares',
    key: 'shares',
    title: $t('page.quantSettlementRedeems.inventoryLots.shares'),
  },
  {
    dataIndex: 'cost_basis_usd',
    key: 'cost_basis_usd',
    title: $t('page.quantSettlementRedeems.inventoryLots.costBasis'),
  },
  {
    dataIndex: 'settlement_mode',
    key: 'settlement_mode',
    title: $t('page.quantSettlementRedeems.inventoryLots.settlementMode'),
  },
  {
    dataIndex: 'redeem_policy',
    key: 'redeem_policy',
    title: $t('page.quantSettlementRedeems.inventoryLots.redeemPolicy'),
  },
  {
    dataIndex: 'position_id',
    key: 'position_id',
    title: $t('page.quantSettlementRedeems.inventoryLots.position'),
  },
  {
    dataIndex: 'order_intent_id',
    key: 'order_intent_id',
    title: $t('page.quantSettlementRedeems.inventoryLots.intent'),
  },
];

const redeemedLotColumns = [
  {
    dataIndex: 'token_id',
    key: 'token_id',
    title: $t('page.quantSettlementRedeems.lots.token'),
  },
  {
    dataIndex: 'shares_redeemed',
    key: 'shares_redeemed',
    title: $t('page.quantSettlementRedeems.lots.shares'),
  },
  {
    dataIndex: 'cost_basis_usd',
    key: 'cost_basis_usd',
    title: $t('page.quantSettlementRedeems.lots.costBasis'),
  },
  {
    dataIndex: 'payout_usd',
    key: 'payout_usd',
    title: $t('page.quantSettlementRedeems.lots.payout'),
  },
  {
    dataIndex: 'realized_pnl_usd',
    key: 'realized_pnl_usd',
    title: $t('page.quantSettlementRedeems.lots.realizedPnl'),
  },
  {
    dataIndex: 'position_id',
    key: 'position_id',
    title: $t('page.quantSettlementRedeems.lots.position'),
  },
  {
    dataIndex: 'order_intent_id',
    key: 'order_intent_id',
    title: $t('page.quantSettlementRedeems.lots.intent'),
  },
];

const submissionColumns = [
  {
    dataIndex: 'purpose',
    key: 'purpose',
    title: $t('page.quantSettlementRedeems.submissions.purpose'),
  },
  {
    dataIndex: 'kind',
    key: 'kind',
    title: $t('page.quantSettlementRedeems.submissions.kind'),
  },
  {
    dataIndex: 'state',
    key: 'state',
    title: $t('page.quantSettlementRedeems.submissions.state'),
  },
  {
    dataIndex: 'target_adapter',
    key: 'target_adapter',
    title: $t('page.quantSettlementRedeems.submissions.target'),
  },
  {
    dataIndex: 'relayer_transaction_id',
    key: 'relayer_transaction_id',
    title: $t('page.quantSettlementRedeems.submissions.relayerId'),
  },
  {
    dataIndex: 'transaction_hash',
    key: 'transaction_hash',
    title: $t('page.quantSettlementRedeems.submissions.transactionHash'),
  },
];

function submissionIdentity(
  submission: SettlementChainSubmissionView,
  key: unknown,
) {
  if (key === 'target_adapter') {
    return submission.target_adapter;
  }
  if (key === 'relayer_transaction_id') {
    return submission.relayer_transaction_id;
  }
  if (key === 'transaction_hash') {
    return submission.transaction_hash;
  }
  return null;
}

async function refreshDetail(id: string) {
  loading.value = true;
  loadError.value = null;
  try {
    const fresh = await handleRequest(() => getSettlementRedeem(id), {
      silent: true,
      onError: (err) => {
        if (err.httpStatus !== 404) {
          loadError.value = err.message;
        }
      },
    });
    if (openId.value === id) {
      detail.value = fresh ?? null;
    }
  } finally {
    loading.value = false;
  }
}

async function mutateAuthorization(action: 'approve' | 'revoke') {
  const current = header.value;
  if (!current?.authorization_digest) {
    return;
  }
  await mutateBatchAuthorization(current, action);
}

async function authorizeCurrentCanary() {
  const current = header.value;
  const ceiling = canaryPayoutCeiling.value.trim();
  if (current && ceiling) {
    await authorizeCanary(current, ceiling);
  }
}

const [, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<SettlementRedeemDrawerData>();
      openId.value = data.redeem.settlement_redeem_id;
      changed.value = data.onChanged ?? null;
      loadError.value = null;
      seed.value = data.redeem;
      detail.value = null;
      canaryPayoutCeiling.value = data.redeem.expected_payout_usd ?? '';
      void refreshDetail(data.redeem.settlement_redeem_id);
    } else {
      openId.value = null;
      seed.value = null;
      detail.value = null;
      changed.value = null;
      loadError.value = null;
      canaryPayoutCeiling.value = '';
    }
  },
});

useDrawerSettlementRevisionRefresh(openId, refreshDetail);
</script>

<template>
  <WorkspaceInspectorSurface
    :drawer-api="drawerApi"
    :title="$t('page.quantSettlementRedeems.detail.title')"
  >
    <AsyncState
      :error-message="loadError"
      :loading="loading && !header"
      :not-found="notFound"
      :not-found-text="$t('page.quantSettlementRedeems.detail.notFound')"
      @retry="
        () => {
          const id = openId;
          if (id) {
            void refreshDetail(id);
          }
        }
      "
    >
      <div
        v-if="header"
        class="flex flex-col gap-4"
        data-testid="settlement-redeem-detail"
      >
        <ObjectInspectorHeader
          :entity-id="header.settlement_redeem_id"
          :statuses="[
            { name: 'SettlementCaseState', value: header.state },
            {
              name: 'SettlementEffectivePolicy',
              value: header.effective_policy,
            },
          ]"
        />

        <Card
          size="small"
          :title="$t('page.quantSettlementRedeems.detail.sections.batch')"
        >
          <Alert
            v-if="header.effective_policy === 'manual_only'"
            class="mb-3"
            show-icon
            type="error"
            :message="
              $t('page.quantSettlementRedeems.detail.manualOnlyBlocked')
            "
            :description="
              $t('page.quantSettlementRedeems.detail.manualOnlyBlockedDetail')
            "
          />
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.batchId')"
            >
              <span class="font-mono text-xs break-all">
                {{ header.settlement_redeem_id }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.market')"
            >
              <EntityRouteLink
                mono
                :label="header.market_id"
                :to="`/trading/market-intelligence?module=live&entity=market&id=${header.market_id}`"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.funder')"
            >
              <span class="font-mono text-xs break-all">
                {{ header.funder_address }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.walletKind')"
            >
              {{ header.wallet_kind }} / {{ header.route }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.effectivePolicy')"
            >
              <EnumTag
                context="settlement-redeem-detail"
                name="SettlementEffectivePolicy"
                :value="header.effective_policy"
              />
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.payout')"
            >
              <span class="font-mono">
                {{ formatUsd(header.actual_payout_usd) }} /
                {{ formatUsd(header.expected_payout_usd) }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.gasFee')"
            >
              <span class="font-mono">
                {{ header.gas_fee_pol ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.targetAdapter')"
            >
              <span class="font-mono text-xs break-all">
                {{ header.target_adapter ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.quantSettlementRedeems.detail.deploymentFingerprint')
              "
            >
              <span class="font-mono text-xs break-all">
                {{ header.target_code_hash ?? EMPTY_PLACEHOLDER }} /
                {{ header.deployment_digest ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.verifiedBlock')"
            >
              <span class="font-mono text-xs break-all">
                {{ header.verified_block_number ?? EMPTY_PLACEHOLDER }} /
                {{ header.verified_block_hash ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.readiness')"
            >
              {{ header.readiness_status }} ·
              {{ header.reconciliation_state }}
            </DescriptionsItem>
            <DescriptionsItem
              v-if="header.readiness_reasons.length > 0"
              :label="
                $t('page.quantSettlementRedeems.readiness.blockingReasons')
              "
            >
              <div class="flex flex-col gap-2">
                <Alert
                  v-for="reason in header.readiness_reasons"
                  :key="JSON.stringify(reason)"
                  show-icon
                  type="error"
                  :message="formatSettlementReadinessReason(reason)"
                />
              </div>
            </DescriptionsItem>
            <DescriptionsItem
              v-if="header.readiness_advisories.length > 0"
              :label="$t('page.quantSettlementRedeems.readiness.advisories')"
            >
              <div class="flex flex-col gap-2">
                <Alert
                  v-for="advisory in header.readiness_advisories"
                  :key="JSON.stringify(advisory)"
                  show-icon
                  type="warning"
                  :message="formatSettlementDeploymentAdvisory(advisory)"
                />
              </div>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.attempts')"
            >
              {{ header.attempt_count }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.nextAttemptAt')"
            >
              {{ formatDateTimeLocal(header.next_attempt_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.submittedAt')"
            >
              {{ formatDateTimeLocal(header.submitted_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.columns.confirmedAt')"
            >
              {{ formatDateTimeLocal(header.confirmed_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.failedAt')"
            >
              {{ formatDateTimeLocal(header.failed_at) }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.lastError')"
            >
              <span class="text-destructive">
                {{ header.last_error ?? EMPTY_PLACEHOLDER }}
              </span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          data-testid="settlement-inventory-lots"
          size="small"
          :title="
            $t('page.quantSettlementRedeems.detail.sections.inventoryLots')
          "
        >
          <Table
            v-if="inventoryLots.length > 0"
            :columns="inventoryLotColumns"
            :data-source="inventoryLots"
            :pagination="false"
            :scroll="{ x: 1100 }"
            row-key="settlement_inventory_lot_id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'token_id'">
                <span class="font-mono text-xs break-all">
                  {{ record.token_id }}
                </span>
              </template>
              <template v-else-if="column.key === 'shares'">
                <span class="font-mono">
                  {{ formatShares(record.shares) }}
                </span>
              </template>
              <template v-else-if="column.key === 'cost_basis_usd'">
                <span class="font-mono">
                  {{ formatUsd(record.cost_basis_usd) }}
                </span>
              </template>
              <template v-else-if="column.key === 'position_id'">
                <EntityRouteLink
                  mono
                  :label="record.position_id"
                  :to="positionOpenPath(record.position_id)"
                />
              </template>
              <template v-else-if="column.key === 'order_intent_id'">
                <EntityRouteLink
                  mono
                  :label="record.order_intent_id"
                  :to="`/execution/orders?module=intents&entity=order-intent&id=${record.order_intent_id}`"
                />
              </template>
            </template>
          </Table>
          <Empty
            v-else
            :description="
              $t('page.quantSettlementRedeems.detail.noInventoryLots')
            "
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>

        <Card
          size="small"
          :title="$t('page.quantSettlementRedeems.detail.sections.balances')"
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.balanceBefore')"
            >
              <div v-if="header.balance_before" class="flex flex-col gap-1">
                <span class="font-mono text-xs break-all">
                  {{ $t('page.quantSettlementRedeems.detail.balanceYes') }}:
                  {{ formatShares(header.balance_before.yes.shares) }}
                  ({{ $t('page.quantSettlementRedeems.detail.balanceRaw') }}
                  {{ header.balance_before.yes.raw_balance }}) ·
                  {{ header.balance_before.yes.token_id }}
                </span>
                <span class="font-mono text-xs break-all">
                  {{ $t('page.quantSettlementRedeems.detail.balanceNo') }}:
                  {{ formatShares(header.balance_before.no.shares) }}
                  ({{ $t('page.quantSettlementRedeems.detail.balanceRaw') }}
                  {{ header.balance_before.no.raw_balance }}) ·
                  {{ header.balance_before.no.token_id }}
                </span>
              </div>
              <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="$t('page.quantSettlementRedeems.detail.balanceAfter')"
            >
              <div v-if="header.balance_after" class="flex flex-col gap-1">
                <span class="font-mono text-xs break-all">
                  {{ $t('page.quantSettlementRedeems.detail.balanceYes') }}:
                  {{ formatShares(header.balance_after.yes.shares) }}
                  ({{ $t('page.quantSettlementRedeems.detail.balanceRaw') }}
                  {{ header.balance_after.yes.raw_balance }}) ·
                  {{ header.balance_after.yes.token_id }}
                </span>
                <span class="font-mono text-xs break-all">
                  {{ $t('page.quantSettlementRedeems.detail.balanceNo') }}:
                  {{ formatShares(header.balance_after.no.shares) }}
                  ({{ $t('page.quantSettlementRedeems.detail.balanceRaw') }}
                  {{ header.balance_after.no.raw_balance }}) ·
                  {{ header.balance_after.no.token_id }}
                </span>
              </div>
              <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card
          size="small"
          :title="
            $t('page.quantSettlementRedeems.detail.sections.authorization')
          "
        >
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem
              :label="
                $t('page.quantSettlementRedeems.detail.authorizationState')
              "
            >
              {{ header.authorization_state }}
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.quantSettlementRedeems.detail.authorizationDigest')
              "
            >
              <span class="font-mono text-xs break-all">{{
                header.authorization_digest ?? EMPTY_PLACEHOLDER
              }}</span>
            </DescriptionsItem>
            <DescriptionsItem
              :label="
                $t('page.quantSettlementRedeems.detail.authorizationExpiresAt')
              "
            >
              {{ formatDateTimeLocal(header.authorization_expires_at) }}
            </DescriptionsItem>
          </Descriptions>
          <div v-if="canApprove || canRevoke" class="mt-3 flex flex-col gap-2">
            <Button
              v-if="canApprove"
              danger
              type="primary"
              @click="mutateAuthorization('approve')"
            >
              {{ $t('page.quantSettlementRedeems.actions.approve') }}
            </Button>
            <Button v-if="canRevoke" @click="mutateAuthorization('revoke')">
              {{ $t('page.quantSettlementRedeems.actions.revoke') }}
            </Button>
          </div>
          <div
            v-if="
              canCreate &&
              header.effective_policy === 'automatic_eligible' &&
              header.authorization_state === 'approved' &&
              header.authorization_digest
            "
            class="mt-4 flex flex-col gap-2"
          >
            <Input
              v-model:value="canaryPayoutCeiling"
              :placeholder="
                $t(
                  'page.quantSettlementRedeems.governed.canaryPayoutPlaceholder',
                )
              "
            />
            <Button
              danger
              :disabled="!canAuthorizeCanary"
              type="primary"
              @click="authorizeCurrentCanary"
            >
              {{ $t('page.quantSettlementRedeems.governed.canary') }}
            </Button>
          </div>
        </Card>

        <Card
          size="small"
          :title="$t('page.quantSettlementRedeems.detail.sections.submissions')"
        >
          <Table
            v-if="submissions.length > 0"
            :columns="submissionColumns"
            :data-source="submissions"
            :pagination="false"
            row-key="settlement_chain_submission_id"
            size="small"
          >
            <template #expandedRowRender="{ record }">
              <Descriptions :column="1" bordered size="small">
                <DescriptionsItem
                  :label="$t('page.quantSettlementRedeems.governed.deployment')"
                >
                  <span class="font-mono text-xs break-all">
                    {{ record.deployment_digest }}
                  </span>
                </DescriptionsItem>
                <DescriptionsItem
                  :label="
                    $t('page.quantSettlementRedeems.governed.verifiedBlock')
                  "
                >
                  <span class="font-mono text-xs break-all">
                    {{ record.verified_block_number }} /
                    {{ record.verified_block_hash }}
                  </span>
                </DescriptionsItem>
                <DescriptionsItem
                  :label="
                    $t('page.quantSettlementRedeems.governed.callIdentity')
                  "
                >
                  <span class="font-mono text-xs break-all">
                    {{ record.call_target }} / {{ record.calldata_hash }}
                  </span>
                </DescriptionsItem>
                <DescriptionsItem
                  :label="
                    $t('page.quantSettlementRedeems.governed.failureHistory')
                  "
                >
                  <div
                    v-if="record.failure_history.entries.length > 0"
                    class="flex flex-col gap-1"
                  >
                    <span
                      v-for="failure in record.failure_history.entries"
                      :key="`${failure.observed_at}:${failure.code}`"
                    >
                      {{ formatDateTimeLocal(failure.observed_at) }} ·
                      {{ failure.code }} · {{ failure.detail }}
                    </span>
                  </div>
                  <span v-else>{{ EMPTY_PLACEHOLDER }}</span>
                </DescriptionsItem>
                <DescriptionsItem
                  v-if="record.receipt_evidence"
                  :label="$t('page.quantSettlementRedeems.governed.receipt')"
                >
                  <div class="flex flex-col gap-1">
                    <span>{{ record.receipt_evidence.kind }}</span>
                    <span class="font-mono text-xs break-all">
                      {{ record.receipt_evidence.evidence.transaction_hash }} ·
                      {{ record.receipt_evidence.evidence.block_number }} /
                      {{ record.receipt_evidence.evidence.block_hash }}
                    </span>
                    <span class="font-mono text-xs break-all">
                      outer
                      {{ record.receipt_evidence.evidence.call.outer_target }} /
                      {{
                        record.receipt_evidence.evidence.call
                          .outer_calldata_hash
                      }}
                    </span>
                    <span class="font-mono text-xs break-all">
                      inner
                      {{ record.receipt_evidence.evidence.call.inner_target }} /
                      {{
                        record.receipt_evidence.evidence.call
                          .inner_calldata_hash
                      }}
                    </span>
                    <span
                      v-if="
                        record.receipt_evidence.kind === 'operator_approval'
                      "
                    >
                      desired
                      {{ record.receipt_evidence.evidence.desired_approval }} ·
                      observed
                      {{ record.receipt_evidence.evidence.operator_approved }}
                    </span>
                    <span v-else>
                      mint
                      {{
                        formatUsd(
                          record.receipt_evidence.evidence.pusd_mint.amount_usd,
                        )
                      }}
                      · wrapped
                      {{
                        formatUsd(
                          record.receipt_evidence.evidence.wrapped_payout
                            .amount_usd,
                        )
                      }}
                    </span>
                  </div>
                </DescriptionsItem>
              </Descriptions>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'kind'">
                <EnumTag
                  context="settlement-redeem-detail"
                  name="SettlementSubmissionKind"
                  :value="record.kind"
                />
              </template>
              <template
                v-else-if="
                  [
                    'target_adapter',
                    'relayer_transaction_id',
                    'transaction_hash',
                  ].includes(String(column.key))
                "
              >
                <span class="font-mono text-xs break-all">
                  {{
                    submissionIdentity(record, column.key) ?? EMPTY_PLACEHOLDER
                  }}
                </span>
              </template>
            </template>
          </Table>
          <Empty
            v-else
            :description="
              $t('page.quantSettlementRedeems.detail.noSubmissions')
            "
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>

        <Card
          size="small"
          :title="
            $t('page.quantSettlementRedeems.detail.sections.redeemedLots')
          "
        >
          <Table
            v-if="redeemedLots.length > 0"
            :columns="redeemedLotColumns"
            :data-source="redeemedLots"
            :pagination="false"
            :scroll="{ x: 1000 }"
            row-key="settlement_redeem_lot_id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'token_id'">
                <span class="font-mono text-xs break-all">
                  {{ record.token_id }}
                </span>
              </template>
              <template v-else-if="column.key === 'shares_redeemed'">
                <span class="font-mono">
                  {{ formatShares(record.shares_redeemed) }}
                </span>
              </template>
              <template v-else-if="column.key === 'cost_basis_usd'">
                <span class="font-mono">{{
                  formatUsd(record.cost_basis_usd)
                }}</span>
              </template>
              <template v-else-if="column.key === 'payout_usd'">
                <span class="font-mono">{{
                  formatUsd(record.payout_usd)
                }}</span>
              </template>
              <template v-else-if="column.key === 'realized_pnl_usd'">
                <span class="font-mono">
                  {{ formatUsd(record.realized_pnl_usd) }}
                </span>
              </template>
              <template v-else-if="column.key === 'position_id'">
                <EntityRouteLink
                  mono
                  :label="record.position_id"
                  :to="positionOpenPath(record.position_id)"
                />
              </template>
              <template v-else-if="column.key === 'order_intent_id'">
                <EntityRouteLink
                  mono
                  :label="record.order_intent_id"
                  :to="`/execution/orders?module=intents&entity=order-intent&id=${record.order_intent_id}`"
                />
              </template>
            </template>
          </Table>
          <Empty
            v-else
            :description="
              $t('page.quantSettlementRedeems.detail.noRedeemedLots')
            "
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </Card>
      </div>
    </AsyncState>
  </WorkspaceInspectorSurface>
</template>
