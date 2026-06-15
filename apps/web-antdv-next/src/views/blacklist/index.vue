<script lang="ts" setup>
import type { BlacklistEntryView } from '@vben/types';

import type { AddBlacklistSubmitPayload } from './modules/widgets/add-blacklist-modal.vue';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { Page, useVbenModal } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { Button, message } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { addBlacklist, fetchBlacklist, removeBlacklist } from '#/api/risk';
import { $t } from '#/locales';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';

import { useBlacklistColumns } from './modules/schemas';
import AddBlacklistModal from './modules/widgets/add-blacklist-modal.vue';

defineOptions({ name: 'BlacklistPage' });

const { handleRequest } = useRequestHandler();
const { governed } = useGovernedAction();
const { hasAccessByCodes } = useOxideAccess();

const canCreate = hasAccessByCodes(['blacklist:create']);
const canDelete = hasAccessByCodes(['blacklist:delete']);

const [AddModal, addModalApi] = useVbenModal({
  connectedComponent: AddBlacklistModal,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid<BlacklistEntryView>({
  gridOptions: {
    columns: useBlacklistColumns(onActionClick, canDelete),
    proxyConfig: {
      ajax: {
        query: async () => {
          const items = await fetchBlacklist();
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
    rowConfig: { keyField: 'market_id' },
  },
});

function openAddModal() {
  addModalApi
    .setData({
      onSubmit: onAddSubmit,
    })
    .setState({ title: $t('page.blacklist.actions.add') })
    .open();
}

async function onAddSubmit(payload: AddBlacklistSubmitPayload) {
  const result = await handleRequest(
    () =>
      addBlacklist(
        {
          blacklist_reason: payload.blacklistReason,
          market_id: payload.marketId,
          reason: payload.reason,
        },
        {
          actingRole: payload.actingRole,
          reason: payload.reason,
        },
      ),
    {
      onSuccess: () => {
        message.success($t('page.blacklist.feedback.added'));
        void gridApi.query();
      },
      silent: true,
    },
  );
  return result !== null;
}

async function onRemove(row: BlacklistEntryView) {
  const result = await governed(
    (ctx) => removeBlacklist(row.market_id, { reason: ctx.reason }, ctx),
    {
      danger: true,
      summary: $t('page.blacklist.actions.removeSummary', {
        market: row.market_id,
      }),
      title: $t('page.blacklist.actions.remove'),
    },
  );
  if (result !== null) {
    message.success($t('page.blacklist.feedback.removed'));
    void gridApi.query();
  }
}

function onActionClick({ code, row }: OnActionClickParams<BlacklistEntryView>) {
  if (code === 'remove') {
    void onRemove(row);
  }
}
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('page.blacklist.title')">
      <template #toolbar-actions>
        <Button
          v-if="canCreate"
          v-access:code="'blacklist:create'"
          class="mr-2"
          type="primary"
          @click="openAddModal"
        >
          <span>{{
            $t('common.createWithName', { name: $t('page.blacklist.title') })
          }}</span>
        </Button>
      </template>
    </Grid>
    <AddModal />
  </Page>
</template>
