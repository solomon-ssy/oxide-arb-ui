<script lang="ts" setup>
import type {
  RuntimeConfigActivationInfo,
  RuntimeConfigDocument,
  RuntimeConfigVersionView,
} from '@vben/types';

import type { RuntimeConfigVersionRow } from './modules/schemas/table-columns';

import type { OnActionClickParams } from '#/adapter/vxe-table';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/qp';

import {
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  message,
  Tag,
} from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  activateRuntimeConfigVersion,
  fetchRuntimeConfigVersions,
  getCurrentRuntimeConfig,
  rollbackRuntimeConfigVersion,
} from '#/api/runtime-config';
import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useRuntimeConfigActivationKindTagOptions,
} from '#/shared/components/format/tag-options';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';
import { useGovernedAction } from '#/shared/composables/use-governed-action';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useSystemStore } from '#/store';

import { useRuntimeConfigVersionColumns } from './modules/schemas';
import VersionDetailDrawer from './modules/widgets/version-detail-drawer.vue';

defineOptions({ name: 'RuntimeConfigPage' });

const route = useRoute();
const { governed } = useGovernedAction();
const { handleRequest } = useRequestHandler();
const { hasAccessByCodes } = useQpAccess();
const systemStore = useSystemStore();

const canActivate = hasAccessByCodes(['runtime_config:activate']);
const canRollback = hasAccessByCodes(['runtime_config:rollback']);

const currentConfig = ref<RuntimeConfigDocument>({});
const activeVersion = ref<null | RuntimeConfigVersionView>(null);
const activeActivation = ref<null | RuntimeConfigActivationInfo>(null);
const activeVersionId = computed(
  () => activeVersion.value?.runtime_config_version_id ?? null,
);
const versionRows = ref<RuntimeConfigVersionRow[]>([]);

const versionColumns = computed(() =>
  useRuntimeConfigVersionColumns(
    onActionClick,
    activeVersionId.value,
    canActivate,
    canRollback,
  ),
);
const activationKindTagOptions = useRuntimeConfigActivationKindTagOptions();
const activationKindTag = computed(() =>
  activeActivation.value
    ? findTagOption(
        activationKindTagOptions,
        activeActivation.value.activation_kind,
      )
    : undefined,
);

const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  connectedComponent: VersionDetailDrawer,
  destroyOnClose: true,
});
const [CurrentConfigDrawer, currentConfigDrawerApi] = useVbenDrawer({
  destroyOnClose: true,
  footer: false,
});

const emptyPage = {
  has_next: false,
  items: [] as RuntimeConfigVersionRow[],
  page: 1,
  size: 0,
  total: 0,
};

const [Grid, gridApi] = useVbenVxeGrid<RuntimeConfigVersionRow>({
  gridOptions: {
    columns: versionColumns.value,
    proxyConfig: {
      ajax: {
        query: async () => {
          const rows = await handleRequest(async () => {
            const [current, versions] = await Promise.all([
              getCurrentRuntimeConfig(),
              fetchRuntimeConfigVersions({ limit: 200 }),
            ]);
            currentConfig.value = current.config;
            activeVersion.value = current.version;
            activeActivation.value = current.activation;
            const activeId = current.version?.runtime_config_version_id ?? null;
            return versions.map((version) => ({
              ...version,
              _activation_state:
                version.runtime_config_version_id === activeId
                  ? ('active' as const)
                  : ('inactive' as const),
            })) satisfies RuntimeConfigVersionRow[];
          });
          if (!rows) {
            return emptyPage;
          }
          versionRows.value = rows;
          return {
            has_next: false,
            items: rows,
            page: 1,
            size: rows.length,
            total: rows.length,
          };
        },
      },
    },
    rowClassName: ({ row }: { row: RuntimeConfigVersionRow }) =>
      row.runtime_config_version_id === activeVersionId.value
        ? 'bg-primary/10'
        : '',
    rowConfig: { keyField: 'runtime_config_version_id' },
    toolbarConfig: { refresh: { code: 'query' } },
  },
});

watch(versionColumns, (columns) => {
  gridApi.setGridOptions({ columns });
});

function openDetail(row: RuntimeConfigVersionView) {
  detailDrawerApi
    .setData({
      activeActivation: activeActivation.value,
      activeVersionId: activeVersionId.value,
      currentConfig: currentConfig.value,
      version: row,
      versionCatalog: versionRows.value,
    })
    .open();
}

function openCurrentConfigDrawer() {
  currentConfigDrawerApi.open();
}

async function activate(row: RuntimeConfigVersionView) {
  if (!canActivate) {
    return;
  }
  const result = await governed(
    (ctx) =>
      activateRuntimeConfigVersion(
        row.runtime_config_version_id,
        { reason: ctx.reason },
        ctx,
      ),
    {
      summary: $t('page.runtimeConfig.actions.activateSummary', {
        id: row.runtime_config_version_id,
      }),
      title: $t('page.runtimeConfig.actions.activate'),
    },
  );
  if (result) {
    message.success($t('page.runtimeConfig.feedback.activated'));
    void gridApi.query();
  }
}

async function rollback(row: RuntimeConfigVersionView) {
  if (!canRollback) {
    return;
  }
  const result = await governed(
    (ctx) =>
      rollbackRuntimeConfigVersion(
        row.runtime_config_version_id,
        { reason: ctx.reason },
        ctx,
      ),
    {
      confirmWord: 'ROLLBACK',
      danger: true,
      summary: $t('page.runtimeConfig.actions.rollbackSummary', {
        id: row.runtime_config_version_id,
      }),
      title: $t('page.runtimeConfig.actions.rollback'),
    },
  );
  if (result) {
    message.success($t('page.runtimeConfig.feedback.rolledBack'));
    void gridApi.query();
  }
}

function onActionClick({
  code,
  row,
}: OnActionClickParams<RuntimeConfigVersionView>) {
  switch (code) {
    case 'activate': {
      void activate(row);
      break;
    }
    case 'detail': {
      openDetail(row);
      break;
    }
    case 'rollback': {
      void rollback(row);
      break;
    }
    // No default
  }
}

function openVersionFromQuery() {
  const versionId = route.query.version_id;
  if (typeof versionId !== 'string' || !versionId) {
    return;
  }
  void gridApi.query().then(() => {
    const row = versionRows.value.find(
      (item) => item.runtime_config_version_id === versionId,
    );
    if (row) {
      openDetail(row);
    }
  });
}

watch(
  () => systemStore.activeConfigVersion,
  () => {
    void gridApi.query();
  },
);

onMounted(() => {
  openVersionFromQuery();
});
</script>

<template>
  <Page auto-content-height>
    <Card class="mb-4" :title="$t('page.runtimeConfig.current.title')">
      <Descriptions v-if="activeVersion" :column="3" bordered size="small">
        <DescriptionsItem :label="$t('page.runtimeConfig.current.version')">
          <span class="font-mono text-xs">{{
            activeVersion.runtime_config_version_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.runtimeConfig.current.createdBy')">
          {{ activeVersion.created_by }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.runtimeConfig.current.createdAt')">
          {{ formatDateTimeLocal(activeVersion.created_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="activeActivation"
          :label="$t('page.runtimeConfig.current.activatedAt')"
        >
          {{ formatDateTimeLocal(activeActivation.activated_at) }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="activeActivation"
          :label="$t('page.runtimeConfig.current.activatedBy')"
        >
          {{ activeActivation.activated_by }}
        </DescriptionsItem>
        <DescriptionsItem
          v-if="activeActivation && activationKindTag"
          :label="$t('page.runtimeConfig.current.activationKind')"
        >
          <Tag :color="activationKindTag.color">
            {{ activationKindTag.label }}
          </Tag>
        </DescriptionsItem>
      </Descriptions>
      <div class="mt-3">
        <Button size="small" @click="openCurrentConfigDrawer">
          {{ $t('page.runtimeConfig.current.viewConfig') }}
        </Button>
      </div>
      <div v-if="!activeVersion" class="text-muted-foreground text-sm">
        {{ $t('page.runtimeConfig.current.empty') }}
      </div>
    </Card>

    <Grid :table-title="$t('page.runtimeConfig.title')" />
    <DetailDrawer />
    <CurrentConfigDrawer
      :title="$t('page.runtimeConfig.current.viewConfig')"
      class="w-full max-w-4xl"
    >
      <JsonEditorShell v-model="currentConfig" :mode="Mode.tree" read-only />
    </CurrentConfigDrawer>
  </Page>
</template>
