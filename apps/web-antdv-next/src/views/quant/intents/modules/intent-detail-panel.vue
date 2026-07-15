<script lang="ts" setup>
import type { ExecutionOrderView, OrderIntentView } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useRequestHandler } from '@vben/request/qp';
import { intentActions } from '@vben/types';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Tag,
  Timeline,
  TimelineItem,
  Tooltip,
} from 'antdv-next';

import { listExecutionOrders } from '#/api/execution-orders';
import { $t } from '#/locales';
import EntityRouteLink from '#/shared/components/entity-route-link.vue';
import {
  EMPTY_PLACEHOLDER,
  formatBps,
  formatDateTimeLocal,
  formatDurationSecs,
  formatPercent,
  formatPrice,
  formatShares,
  formatUsd,
} from '#/shared/components/format';
import {
  findTagOption,
  useApprovalStatusTagOptions,
  useExecutionOrderStateTagOptions,
  useOrderIntentKindTagOptions,
  useOrderIntentStatusTagOptions,
  useQuantRuntimeModeTagOptions,
  useSideTagOptions,
} from '#/shared/components/format/tag-options';

import EntryConditionPanel from '../../shared/entry-condition-panel.vue';
import ExitMonitorCard from '../../shared/exit-monitor-card.vue';
import { useIntentActions } from './use-intent-actions';

defineOptions({ name: 'IntentDetailPanel' });

const props = defineProps<{
  intent: OrderIntentView;
}>();

const emit = defineEmits<{
  changed: [];
}>();

const { handleRequest } = useRequestHandler();

const statusTagOptions = useOrderIntentStatusTagOptions();
const approvalTagOptions = useApprovalStatusTagOptions();
const modeTagOptions = useQuantRuntimeModeTagOptions();
const kindTagOptions = useOrderIntentKindTagOptions();
const sideTagOptions = useSideTagOptions();
const executionStateTagOptions = useExecutionOrderStateTagOptions();

const { approve, canApprove, canCancel, canReject, cancel, reject } =
  useIntentActions(() => emit('changed'));

const executionOrders = ref<ExecutionOrderView[]>([]);
const loadingOrders = ref(false);

const fsm = computed(() => intentActions(props.intent.status));
const entry = computed(() => props.intent.entry_order);
const exit = computed(() => props.intent.exit_policy);

const showApprove = computed(() => canApprove && fsm.value.canApprove);
const showReject = computed(() => canReject && fsm.value.canReject);
const showCancel = computed(() => canCancel && fsm.value.canCancel);

async function loadExecutionOrders() {
  loadingOrders.value = true;
  try {
    const page = await handleRequest(
      () =>
        listExecutionOrders({
          order_intent_id: props.intent.order_intent_id,
          size: 100,
        }),
      { silent: true },
    );
    executionOrders.value = page?.items ?? [];
  } finally {
    loadingOrders.value = false;
  }
}

watch(
  () => props.intent.order_intent_id,
  () => void loadExecutionOrders(),
);
onMounted(() => void loadExecutionOrders());
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="intent-detail">
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <Tag :color="findTagOption(statusTagOptions, intent.status)?.color">
            {{ findTagOption(statusTagOptions, intent.status)?.label }}
          </Tag>
          <Tag
            :color="
              findTagOption(approvalTagOptions, intent.approval_status)?.color
            "
          >
            {{
              findTagOption(approvalTagOptions, intent.approval_status)?.label
            }}
          </Tag>
          <Tag
            :color="findTagOption(modeTagOptions, intent.runtime_mode)?.color"
          >
            {{ findTagOption(modeTagOptions, intent.runtime_mode)?.label }}
          </Tag>
          <Tag
            :color="findTagOption(kindTagOptions, intent.intent_kind)?.color"
          >
            {{ findTagOption(kindTagOptions, intent.intent_kind)?.label }}
          </Tag>
        </div>
        <span class="font-mono text-xs break-all">
          {{ intent.order_intent_id }}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button
          v-if="showApprove"
          data-testid="approve-intent"
          type="primary"
          @click="approve(intent)"
        >
          <span class="inline-flex items-center gap-1.5">
            <IconifyIcon class="size-4" icon="lucide:check" />
            {{ $t('page.quantIntents.actions.approve') }}
          </span>
        </Button>
        <Button v-if="showReject" danger @click="reject(intent)">
          <span class="inline-flex items-center gap-1.5">
            <IconifyIcon class="size-4" icon="lucide:x" />
            {{ $t('page.quantIntents.actions.reject') }}
          </span>
        </Button>
        <Button
          v-if="showCancel"
          danger
          data-testid="cancel-intent"
          @click="cancel(intent)"
        >
          <span class="inline-flex items-center gap-1.5">
            <IconifyIcon class="size-4" icon="lucide:ban" />
            {{ $t('page.quantIntents.actions.cancel') }}
          </span>
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card
        class="order-3"
        size="small"
        :title="$t('page.quantIntents.detail.sections.identity')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.identity.recommendationId')"
          >
            <EntityRouteLink
              mono
              :label="intent.recommendation_id"
              :to="`/quant/recommendations/${intent.recommendation_id}`"
            />
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.identity.runtimeConfig')"
          >
            <span class="font-mono text-xs break-all">
              {{ intent.runtime_config_version_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.identity.modelVersion')"
          >
            <span class="font-mono text-xs break-all">
              {{ intent.model_version_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.identity.policyId')"
          >
            {{ intent.policy_id ?? EMPTY_PLACEHOLDER }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.identity.policyHash')"
          >
            <span class="font-mono text-xs break-all">
              {{ intent.policy_hash ?? EMPTY_PLACEHOLDER }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.identity.riskEnvelopeHash')"
          >
            <span class="font-mono text-xs break-all">
              {{ intent.risk_envelope_hash }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.identity.createdAt')"
          >
            {{ formatDateTimeLocal(intent.created_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.identity.expiresAt')"
          >
            {{ formatDateTimeLocal(intent.expires_at) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <ExitMonitorCard
        v-if="intent.exit_monitor_observation"
        class="order-5"
        :observation="intent.exit_monitor_observation"
      />

      <Card
        class="order-2"
        size="small"
        :title="$t('page.quantIntents.detail.sections.approval')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.approval.approvedBy')"
          >
            <span class="font-mono text-xs break-all">
              {{ intent.approved_by ?? EMPTY_PLACEHOLDER }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.approval.approvedAt')"
          >
            {{ formatDateTimeLocal(intent.approved_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.approval.approvalReason')"
          >
            {{ intent.approval_reason ?? EMPTY_PLACEHOLDER }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.approval.statusReason')"
          >
            {{ intent.status_reason ?? EMPTY_PLACEHOLDER }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.approval.admissionTrace')"
          >
            <span class="font-mono text-xs break-all">
              {{ intent.admission_trace_ref ?? EMPTY_PLACEHOLDER }}
            </span>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        class="order-1"
        size="small"
        :title="$t('page.quantIntents.detail.sections.entry')"
      >
        <EntryConditionPanel :recommendation-id="intent.recommendation_id" />
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem :label="$t('page.quantIntents.detail.entry.token')">
            <span class="font-mono text-xs break-all">
              {{ entry.token_id }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem :label="$t('page.quantIntents.detail.entry.side')">
            <Tag :color="findTagOption(sideTagOptions, entry.side)?.color">
              {{ findTagOption(sideTagOptions, entry.side)?.label }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.entry.orderType')"
          >
            {{
              typeof entry.order_type === 'string'
                ? $t(`enum.orderTypeKind.${entry.order_type}`)
                : $t('enum.orderTypeKind.gtd')
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.entry.postOnly')"
          >
            {{ entry.post_only }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.entry.limitPrice')"
          >
            <span class="font-mono">{{ formatPrice(entry.limit_price) }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.entry.amount')"
          >
            <span class="font-mono">
              {{
                entry.amount.unit === 'cash_budget'
                  ? formatUsd(entry.amount.value)
                  : formatShares(entry.amount.value)
              }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.entry.maxSlippage')"
          >
            <span class="font-mono">{{
              formatBps(entry.max_slippage_bps)
            }}</span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.entry.validUntil')"
          >
            {{ formatDateTimeLocal(entry.valid_until) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card
        class="order-4"
        size="small"
        :title="$t('page.quantIntents.detail.sections.exit')"
      >
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.settlementMode')"
          >
            {{ $t(`enum.exitSettlementMode.${exit.settlement_mode}`) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.redeemPolicy')"
          >
            {{ $t(`enum.redeemPolicy.${exit.redeem_policy}`) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.takeProfit')"
          >
            <span class="font-mono">
              {{ formatPrice(exit.take_profit_price) }}
              <template v-if="exit.take_profit_pct">
                / {{ formatPercent(exit.take_profit_pct) }}
              </template>
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.stopLoss')"
          >
            <span class="font-mono">
              {{ formatPrice(exit.stop_loss_price) }}
              <template v-if="exit.stop_loss_pct">
                / {{ formatPercent(exit.stop_loss_pct) }}
              </template>
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.timeExit')"
          >
            {{ formatDateTimeLocal(exit.time_exit_at) }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.maxHold')"
          >
            {{
              exit.max_hold_secs === null
                ? EMPTY_PLACEHOLDER
                : formatDurationSecs(exit.max_hold_secs)
            }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.entryReference')"
          >
            <span class="font-mono">
              {{ formatPrice(exit.entry_reference_price) }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.scaleOutTargets')"
          >
            {{ exit.scale_out_targets.length }}
          </DescriptionsItem>
          <DescriptionsItem
            :label="$t('page.quantIntents.detail.exit.cumulativeExited')"
          >
            {{ formatShares(intent.scale_out_state.cumulative_exited_shares) }}
          </DescriptionsItem>
        </Descriptions>
      </Card>
    </div>

    <Card
      size="small"
      :title="$t('page.quantIntents.detail.sections.executionOrders')"
    >
      <template #extra>
        <EntityRouteLink
          :label="$t('page.quantIntents.detail.viewAllOrders')"
          :to="`/quant/execution-orders?order_intent_id=${intent.order_intent_id}`"
        />
      </template>
      <Timeline
        v-if="executionOrders.length > 0"
        :pending="loadingOrders || undefined"
      >
        <TimelineItem
          v-for="record in executionOrders"
          :key="record.execution_order_id"
        >
          <div class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <EntityRouteLink
                mono
                :label="record.execution_order_id"
                :to="`/quant/execution-orders?open=${record.execution_order_id}`"
              />
              <Tooltip
                v-if="record.error_message"
                :title="record.error_message"
              >
                <Tag
                  :color="
                    findTagOption(executionStateTagOptions, record.state)?.color
                  "
                >
                  {{
                    findTagOption(executionStateTagOptions, record.state)?.label
                  }}
                </Tag>
              </Tooltip>
              <Tag
                v-else
                :color="
                  findTagOption(executionStateTagOptions, record.state)?.color
                "
              >
                {{
                  findTagOption(executionStateTagOptions, record.state)?.label
                }}
              </Tag>
            </div>
            <span class="text-muted-foreground text-xs">
              {{ $t(`enum.executionOrderPhase.${record.order_phase}`) }} ·
              {{ formatPrice(record.price) }} ·
              {{ formatShares(record.shares) }} ·
              {{ formatDateTimeLocal(record.submitted_at) }}
            </span>
          </div>
        </TimelineItem>
      </Timeline>
      <Empty
        v-else
        :description="$t('page.quantIntents.detail.noExecutionOrders')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
      />
    </Card>
  </div>
</template>
