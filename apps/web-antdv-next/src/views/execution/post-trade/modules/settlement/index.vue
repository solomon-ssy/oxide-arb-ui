<script lang="ts" setup>
import type {
  SettlementGovernedActionView,
  SettlementReadinessView,
  SettlementRedeemView,
  SettlementRoute,
  SettlementRouteReadinessView,
} from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Space,
  Table,
  Tag,
} from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getSettlementReadiness,
  getSettlementRedeem,
  listSettlementGovernedActions,
  listSettlementRedeems,
} from '#/api/settlement-redeems';
import { $t } from '#/locales';
import AsyncState from '#/shared/components/async-state.vue';
import { formatDateTimeLocal } from '#/shared/components/format';
import RuntimeControlPanel from '#/shared/components/runtime-control-panel.vue';
import { useQueryEntityDrawer } from '#/shared/composables/use-route-query-sync';
import { useSettlementRedeemStore } from '#/store';

import {
  formatSettlementDeploymentAdvisory,
  formatSettlementReadinessReason,
} from './modules/format-settlement-readiness';
import {
  useSettlementRedeemColumns,
  useSettlementRedeemSearchSchema,
} from './modules/schemas';
import SettlementGovernedActionDetailDrawer from './modules/settlement-governed-action-detail-drawer.vue';
import SettlementRedeemDetailDrawer from './modules/settlement-redeem-detail-drawer.vue';
import { useSettlementActions } from './modules/use-settlement-actions';

defineOptions({ name: 'SettlementRedeemsPage' });

const route = useRoute();
const { handleRequest } = useRequestHandler();
const settlementStore = useSettlementRedeemStore();
const actionsOnly = computed(() => route.query.module === 'actions');
const readiness = ref<null | SettlementReadinessView>(null);
const readinessLoading = ref(true);
const readinessError = ref<null | string>(null);
const governedActions = ref<SettlementGovernedActionView[]>([]);
const governedActionsLoading = ref(false);
const governedActionPage = ref(1);
const governedActionTotal = ref(0);
const governedActionPageSize = 20;

const query = route.query;
const initialFilters = {
  market_id: (query.market_id as string) || undefined,
};

const emptyPage = {
  has_next: false,
  items: [] as SettlementRedeemView[],
  page: 1,
  size: 0,
  total: 0,
};

const [Drawer, drawerApi] = useVbenDrawer({
  connectedComponent: SettlementRedeemDetailDrawer,
  destroyOnClose: true,
});

const [GovernedActionDrawer, governedActionDrawerApi] = useVbenDrawer({
  connectedComponent: SettlementGovernedActionDetailDrawer,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<SettlementRedeemView>({
  formOptions: {
    schema: useSettlementRedeemSearchSchema(initialFilters),
  },
  gridOptions: {
    columns: useSettlementRedeemColumns(onActionClick),
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, unknown> = {},
        ) => {
          const range = Array.isArray(formValues.range) ? formValues.range : [];
          const result = await handleRequest(() =>
            listSettlementRedeems({
              from: (range[0] as string | undefined) || undefined,
              market_id:
                (formValues.market_id as string | undefined) || undefined,
              page: page.currentPage,
              size: page.pageSize,
              state: (formValues.state as any) || undefined,
              to: (range[1] as string | undefined) || undefined,
            }),
          );
          return result ?? emptyPage;
        },
      },
    },
    rowConfig: { keyField: 'settlement_redeem_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function onActionClick({
  code,
  row,
}: OnActionClickParams<SettlementRedeemView>) {
  if (code === 'detail') {
    drawerApi.setData({ onChanged: refreshSettlementPage, redeem: row }).open();
  }
}

useQueryEntityDrawer({
  entity: 'settlement-redeem',
  fetch: (id) => getSettlementRedeem(id),
  open: (redeem) =>
    drawerApi.setData({ onChanged: refreshSettlementPage, redeem }).open(),
});

async function refreshReadiness() {
  readinessLoading.value = true;
  try {
    const result = await handleRequest(() => getSettlementReadiness(), {
      silent: true,
    });
    if (result) {
      readiness.value = result;
      readinessError.value = null;
      return;
    }
    readinessError.value = $t(
      'page.quantSettlementRedeems.readiness.loadFailed',
    );
  } finally {
    readinessLoading.value = false;
  }
}

async function refreshGovernedActions(page = governedActionPage.value) {
  governedActionsLoading.value = true;
  try {
    const result = await handleRequest(
      () =>
        listSettlementGovernedActions({
          page,
          size: governedActionPageSize,
        }),
      { silent: true },
    );
    if (result) {
      governedActions.value = result.items;
      governedActionPage.value = result.page;
      governedActionTotal.value = result.total;
    }
  } finally {
    governedActionsLoading.value = false;
  }
}

async function refreshSettlementPage() {
  await Promise.all([
    refreshReadiness(),
    refreshGovernedActions(),
    Promise.resolve(gridApi.query()),
  ]);
}

const {
  authorizeOperator,
  canCreate,
  canRevoke,
  revokeAction: revokeGovernedAction,
} = useSettlementActions(refreshSettlementPage);

const governedActionPagination = computed(() => ({
  current: governedActionPage.value,
  onChange: (page: number) => void refreshGovernedActions(page),
  pageSize: governedActionPageSize,
  showSizeChanger: false,
  total: governedActionTotal.value,
}));

const governedActionColumns = [
  {
    dataIndex: 'kind',
    key: 'kind',
    title: $t('page.quantSettlementRedeems.governed.kind'),
  },
  {
    dataIndex: 'state',
    key: 'state',
    title: $t('page.quantSettlementRedeems.governed.state'),
  },
  {
    dataIndex: 'route',
    key: 'route',
    title: $t('page.quantSettlementRedeems.governed.route'),
  },
  {
    dataIndex: 'target_adapter',
    key: 'target_adapter',
    title: $t('page.quantSettlementRedeems.governed.target'),
  },
  {
    dataIndex: 'authorized_at',
    key: 'authorized_at',
    title: $t('page.quantSettlementRedeems.governed.authorizedAt'),
  },
  {
    key: 'operation',
    title: $t('page.quantSettlementRedeems.columns.operation'),
  },
];

function openGovernedAction(action: SettlementGovernedActionView) {
  governedActionDrawerApi
    .setData({
      action,
      onChanged: refreshSettlementPage,
    })
    .open();
}

function setOperatorApproval(route: SettlementRoute, desired: boolean) {
  void authorizeOperator(route, desired);
}

function revokeAction(action: SettlementGovernedActionView) {
  void revokeGovernedAction(action);
}

function isMoneyEntryReady(routeReadiness: SettlementRouteReadinessView) {
  return (
    readiness.value?.settlement_write_policy !== 'disabled' &&
    routeReadiness.status === 'ready' &&
    routeReadiness.blocking_reasons.length === 0 &&
    routeReadiness.operator_approved === true
  );
}

onMounted(() => {
  void Promise.all([refreshReadiness(), refreshGovernedActions()]);
});

// `quant.settlement` bumps the settlement store on worker state transitions.
watch(
  () => settlementStore.revision,
  () => {
    void gridApi.query();
    void refreshReadiness();
    void refreshGovernedActions();
  },
);
</script>

<template>
  <Page auto-content-height>
    <div data-testid="settlement-redeems-page">
      <RuntimeControlPanel class="mb-4" />
      <div class="mb-4 flex flex-col gap-3" data-testid="settlement-readiness">
        <AsyncState
          :error-message="readiness ? null : readinessError"
          :loading="readinessLoading && !readiness"
          :not-found="!readinessLoading && !readiness && !readinessError"
          :not-found-text="
            $t('page.quantSettlementRedeems.readiness.unavailable')
          "
          :retry-text="$t('page.quantSettlementRedeems.readiness.retry')"
          @retry="refreshReadiness"
        >
          <template v-if="readiness">
            <Alert
              v-if="readinessError"
              class="mb-3"
              show-icon
              type="warning"
              :message="
                $t('page.quantSettlementRedeems.readiness.refreshFailed')
              "
            >
              <template #action>
                <Button size="small" @click="refreshReadiness">
                  {{ $t('page.quantSettlementRedeems.readiness.retry') }}
                </Button>
              </template>
            </Alert>
            <Alert
              v-if="readiness.settlement_write_policy === 'disabled'"
              show-icon
              type="error"
              :message="
                $t('page.quantSettlementRedeems.readiness.writeBlocked')
              "
              :description="
                $t('page.quantSettlementRedeems.readiness.writeBlockedDetail')
              "
            />
            <Card
              class="mb-1"
              size="small"
              data-testid="settlement-admission"
              :title="
                $t('page.quantSettlementRedeems.readiness.admissionTitle')
              "
            >
              <p class="text-muted-foreground mb-3 text-xs">
                {{
                  $t('page.quantSettlementRedeems.readiness.admissionDetail')
                }}
              </p>
              <Descriptions :column="1" size="small">
                <DescriptionsItem
                  :label="
                    $t(
                      'page.quantSettlementRedeems.readiness.admissionWritePolicy',
                    )
                  "
                >
                  <Tag
                    :color="
                      readiness.settlement_write_policy === 'disabled'
                        ? 'error'
                        : readiness.settlement_write_policy === 'auto'
                          ? 'success'
                          : 'warning'
                    "
                  >
                    {{
                      $t(
                        `enum.settlementWritePolicy.${readiness.settlement_write_policy}`,
                      )
                    }}
                  </Tag>
                </DescriptionsItem>
                <DescriptionsItem
                  v-for="routeReadiness in readiness.routes"
                  :key="`admission-${routeReadiness.route}`"
                  :label="routeReadiness.route"
                >
                  <Tag
                    :color="
                      isMoneyEntryReady(routeReadiness) ? 'success' : 'error'
                    "
                  >
                    {{
                      isMoneyEntryReady(routeReadiness)
                        ? $t(
                            'page.quantSettlementRedeems.readiness.admissionReady',
                          )
                        : $t(
                            'page.quantSettlementRedeems.readiness.admissionBlocked',
                          )
                    }}
                  </Tag>
                  <span class="text-muted-foreground ml-2 text-xs">
                    {{
                      $t(
                        'page.quantSettlementRedeems.readiness.admissionMoneyEntry',
                      )
                    }}
                    · {{ routeReadiness.wallet_kind }}
                    ·
                    {{
                      routeReadiness.operator_approved === true
                        ? $t('page.quantSettlementRedeems.readiness.approved')
                        : $t(
                            'page.quantSettlementRedeems.readiness.notApproved',
                          )
                    }}
                  </span>
                </DescriptionsItem>
              </Descriptions>
            </Card>
            <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <Card
                v-for="routeReadiness in readiness.routes"
                :key="routeReadiness.route"
                :data-testid="`settlement-route-${routeReadiness.route}`"
                size="small"
                :title="routeReadiness.route"
              >
                <Descriptions :column="1" size="small">
                  <DescriptionsItem
                    :label="$t('page.quantSettlementRedeems.readiness.status')"
                  >
                    <Tag
                      :color="
                        routeReadiness.status === 'ready' ? 'success' : 'error'
                      "
                    >
                      {{ routeReadiness.status }}
                    </Tag>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.quantSettlementRedeems.readiness.walletKind')
                    "
                  >
                    {{ routeReadiness.wallet_kind }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.quantSettlementRedeems.readiness.checkedAt')
                    "
                  >
                    {{ formatDateTimeLocal(routeReadiness.checked_at) }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="
                      canCreate && routeReadiness.operator_approved !== null
                    "
                    :label="
                      $t('page.quantSettlementRedeems.governed.operatorAction')
                    "
                  >
                    <Button
                      :danger="routeReadiness.operator_approved === false"
                      :disabled="
                        readiness.settlement_write_policy === 'disabled' ||
                        routeReadiness.status !== 'ready'
                      "
                      size="small"
                      :type="
                        routeReadiness.operator_approved === false
                          ? 'primary'
                          : 'default'
                      "
                      @click="
                        setOperatorApproval(
                          routeReadiness.route,
                          !routeReadiness.operator_approved,
                        )
                      "
                    >
                      {{
                        routeReadiness.operator_approved === false
                          ? $t(
                              'page.quantSettlementRedeems.governed.operatorApprove',
                            )
                          : $t(
                              'page.quantSettlementRedeems.governed.operatorRevoke',
                            )
                      }}
                    </Button>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('page.quantSettlementRedeems.readiness.target')"
                  >
                    <span class="font-mono text-xs break-all">{{
                      routeReadiness.target_adapter
                    }}</span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.quantSettlementRedeems.readiness.codeHash')
                    "
                  >
                    <span class="font-mono text-xs break-all">{{
                      routeReadiness.runtime_code_hash
                    }}</span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.quantSettlementRedeems.readiness.observedBlock')
                    "
                  >
                    <span class="font-mono text-xs break-all">
                      {{ routeReadiness.observed_block_number ?? '—' }} /
                      {{ routeReadiness.observed_block_hash ?? '—' }}
                    </span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t(
                        'page.quantSettlementRedeems.readiness.deploymentDigest',
                      )
                    "
                  >
                    <span class="font-mono text-xs break-all">{{
                      routeReadiness.deployment_digest ?? '—'
                    }}</span>
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t('page.quantSettlementRedeems.readiness.authority')
                    "
                  >
                    <a
                      :href="routeReadiness.authority.source_url"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {{ routeReadiness.authority.source }}
                    </a>
                    ·
                    {{
                      $t(
                        'page.quantSettlementRedeems.readiness.catalogRetrievedAt',
                      )
                    }}
                    {{ routeReadiness.authority.retrieved_at }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="
                      $t(
                        'page.quantSettlementRedeems.readiness.operatorApproval',
                      )
                    "
                  >
                    <Tag
                      :color="
                        routeReadiness.operator_approved === true
                          ? 'success'
                          : routeReadiness.operator_approved === false
                            ? 'error'
                            : 'default'
                      "
                    >
                      {{
                        routeReadiness.operator_approved === true
                          ? $t('page.quantSettlementRedeems.readiness.approved')
                          : routeReadiness.operator_approved === false
                            ? $t(
                                'page.quantSettlementRedeems.readiness.notApproved',
                              )
                            : '—'
                      }}
                    </Tag>
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="routeReadiness.blocking_reasons.length > 0"
                    :label="
                      $t(
                        'page.quantSettlementRedeems.readiness.blockingReasons',
                      )
                    "
                  >
                    <div class="flex flex-col gap-2">
                      <Alert
                        v-for="reason in routeReadiness.blocking_reasons"
                        :key="JSON.stringify(reason)"
                        show-icon
                        type="error"
                        :message="formatSettlementReadinessReason(reason)"
                      />
                    </div>
                  </DescriptionsItem>
                  <DescriptionsItem
                    v-if="routeReadiness.advisories.length > 0"
                    :label="
                      $t('page.quantSettlementRedeems.readiness.advisories')
                    "
                  >
                    <div class="flex flex-col gap-2">
                      <Alert
                        v-for="advisory in routeReadiness.advisories"
                        :key="JSON.stringify(advisory)"
                        show-icon
                        type="warning"
                        :message="formatSettlementDeploymentAdvisory(advisory)"
                      />
                    </div>
                  </DescriptionsItem>
                </Descriptions>
              </Card>
            </div>
          </template>
        </AsyncState>
      </div>
      <Card
        v-if="actionsOnly"
        class="mb-4"
        data-testid="settlement-governed-action-queue"
        size="small"
        :title="$t('page.quantSettlementRedeems.governed.queueTitle')"
      >
        <Table
          :columns="governedActionColumns"
          :data-source="governedActions"
          :loading="governedActionsLoading"
          :pagination="governedActionPagination"
          row-key="settlement_governed_action_id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'state'">
              <Tag>{{ record.state }}</Tag>
            </template>
            <template v-else-if="column.key === 'target_adapter'">
              <span class="font-mono text-xs break-all">
                {{ record.target_adapter ?? '—' }}
              </span>
            </template>
            <template v-else-if="column.key === 'operation'">
              <Space>
                <Button
                  size="small"
                  type="link"
                  @click="openGovernedAction(record)"
                >
                  {{ $t('page.quantSettlementRedeems.actions.detail') }}
                </Button>
                <Button
                  v-if="
                    canRevoke &&
                    ['authorized', 'retry_scheduled'].includes(record.state)
                  "
                  danger
                  size="small"
                  type="link"
                  @click="revokeAction(record)"
                >
                  {{ $t('page.quantSettlementRedeems.governed.revokeAction') }}
                </Button>
              </Space>
            </template>
          </template>
        </Table>
      </Card>
      <div v-else data-testid="settlement-redeem-grid">
        <Grid :table-title="$t('page.quantSettlementRedeems.listTitle')" />
      </div>
      <Drawer />
      <GovernedActionDrawer />
    </div>
  </Page>
</template>
