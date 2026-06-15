<script lang="ts" setup>
import type { ControlFactorValueInfo, FactorStatus } from '@vben/types';

import type { PublishModalSubmitPayload } from './modules/widgets/publish-modal.vue';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { watch } from 'vue';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  fetchControlFactors,
  publishEmergency,
  publishLive,
  publishShadow,
  rejectControlFactor,
} from '#/api/control-factors';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useControlStore } from '#/store';

import {
  useControlFactorColumns,
  useControlFactorSearchSchema,
} from './modules/schemas';
import FactorDetailDrawer from './modules/widgets/factor-detail-drawer.vue';
import PublishModal from './modules/widgets/publish-modal.vue';

defineOptions({ name: 'ControlFactorsPage' });

const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useOxideAccess();
const controlStore = useControlStore();

const canReject = hasAccessByCodes(['control_factor:reject']);
const canShadow = hasAccessByCodes(['control_factor:shadow']);
const canPublish = hasAccessByCodes(['control_factor:publish']);
const canEmergency = hasAccessByCodes(['control_factor:emergency']);

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: FactorDetailDrawer,
  destroyOnClose: true,
});
const [PublishModalHost, publishModalApi] = useVbenModal({
  connectedComponent: PublishModal,
  destroyOnClose: true,
});

const emptyPage = {
  has_next: false,
  items: [] as ControlFactorValueInfo[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<ControlFactorValueInfo>({
  formOptions: {
    schema: useControlFactorSearchSchema(),
  },
  gridOptions: {
    checkboxConfig: { highlight: true },
    columns: useControlFactorColumns(onActionClick, canReject),
    proxyConfig: {
      ajax: {
        query: async ({ form }: { form?: Record<string, unknown> }) => {
          const items = await handleRequest(() =>
            fetchControlFactors({
              factor_type: form?.factor_type as any,
              status: form?.status as FactorStatus | undefined,
            }),
          );
          if (!items) {
            return emptyPage;
          }
          return {
            has_next: false,
            items,
            page: 1,
            size: items.length,
            total: items.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'factor_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

function selectedFactors() {
  return gridApi.grid.getCheckboxRecords() as ControlFactorValueInfo[];
}

function openPublish(mode: PublishModalSubmitPayload['mode']) {
  const factors = selectedFactors();
  if (factors.length === 0) {
    message.warning($t('page.controlFactors.publish.error.noFactors'));
    return;
  }
  publishModalApi
    .setData({
      factorIds: factors.map((factor) => factor.factor_id),
      mode,
      onSubmit: onPublishSubmit,
    })
    .open();
}

async function onPublishSubmit(payload: PublishModalSubmitPayload) {
  if (payload.mode !== 'emergency' && !payload.expires_at) {
    return false;
  }
  const result = await governed(
    (ctx) => {
      if (payload.mode === 'emergency') {
        return publishEmergency(
          {
            factor_ids: payload.factor_ids,
            idempotency_key: payload.idempotency_key,
            reason: ctx.reason,
          },
          ctx,
        );
      }
      const expiresAt = payload.expires_at;
      if (!expiresAt) {
        return Promise.reject(new Error('expires_at is required'));
      }
      const body = {
        effective_from: payload.effective_from,
        expires_at: expiresAt,
        factor_ids: payload.factor_ids,
        idempotency_key: payload.idempotency_key,
        manual_risk_expansion_approval: payload.manual_risk_expansion_approval,
        reason: ctx.reason,
      };
      return payload.mode === 'shadow'
        ? publishShadow(body, ctx)
        : publishLive(body, ctx);
    },
    {
      confirmWord: payload.mode === 'emergency' ? 'EMERGENCY' : undefined,
      danger: payload.mode === 'emergency',
      summary: $t(`page.controlFactors.publish.${payload.mode}.summary`),
      title: $t(`page.controlFactors.publish.${payload.mode}.title`),
    },
  );
  if (result) {
    message.success($t('page.controlFactors.feedback.published'));
    void gridApi.query();
  }
  return result !== null;
}

async function reject(row: ControlFactorValueInfo) {
  const result = await governed(
    (ctx) => rejectControlFactor(row.factor_id, { reason: ctx.reason }, ctx),
    {
      danger: true,
      summary: $t('page.controlFactors.actions.rejectSummary', {
        id: row.factor_id,
      }),
      title: $t('page.controlFactors.actions.reject'),
    },
  );
  if (result) {
    message.success($t('page.controlFactors.feedback.rejected'));
    void gridApi.query();
  }
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<ControlFactorValueInfo>) {
  if (code === 'detail') {
    detailDrawerApi.setData({ factorId: row.factor_id }).open();
  } else if (code === 'reject') {
    void reject(row);
  }
}

watch(
  () => controlStore.revision,
  () => {
    void gridApi.query();
  },
);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.controlFactors.title')">
      <template #toolbar-tools>
        <Button
          v-if="canShadow"
          v-access:code="'control_factor:shadow'"
          @click="openPublish('shadow')"
        >
          {{ $t('page.controlFactors.actions.shadow') }}
        </Button>
        <Button
          v-if="canPublish"
          v-access:code="'control_factor:publish'"
          class="ml-2"
          type="primary"
          @click="openPublish('live')"
        >
          {{ $t('page.controlFactors.actions.publish') }}
        </Button>
        <Button
          v-if="canEmergency"
          v-access:code="'control_factor:emergency'"
          class="ml-2"
          danger
          @click="openPublish('emergency')"
        >
          {{ $t('page.controlFactors.actions.emergency') }}
        </Button>
      </template>
    </Grid>
    <DetailDrawer />
    <PublishModalHost />
  </Page>
</template>
