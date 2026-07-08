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
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
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
import { getDeployConfig } from '#/api/system';
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

import RuntimeConfigEditor from './modules/editor/runtime-config-editor.vue';
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
const canEdit = hasAccessByCodes(['runtime_config:create']) && canActivate;
const canViewDeploy = hasAccessByCodes(['system:read']);

const deployConfig = ref<Record<string, unknown>>({});

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
const [EditorDrawer, editorDrawerApi] = useVbenDrawer({
  destroyOnClose: true,
  footer: false,
});
const [DeployDrawer, deployDrawerApi] = useVbenDrawer({
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
    toolbarConfig: { refresh: true, refreshOptions: { code: 'query' } },
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

function openEditorDrawer() {
  editorDrawerApi.open();
}

function openVersionById(versionId: string) {
  const row = versionRows.value.find(
    (item) => item.runtime_config_version_id === versionId,
  );
  if (row) {
    openDetail(row);
  }
}

async function openDeployDrawer() {
  const loaded = await handleRequest(() => getDeployConfig());
  if (loaded) {
    deployConfig.value = loaded as unknown as Record<string, unknown>;
  }
  deployDrawerApi.open();
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
    <Card
      class="runtime-config-current-card mb-4"
      :title="$t('page.runtimeConfig.current.title')"
    >
      <Empty
        v-if="!activeVersion"
        :description="$t('page.runtimeConfig.current.empty')"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        class="py-4"
      />
      <Descriptions v-else :column="3" bordered size="small">
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
      <div v-if="activeVersion" class="mt-4 flex flex-wrap gap-2">
        <Button size="small" @click="openCurrentConfigDrawer">
          {{ $t('page.runtimeConfig.current.viewConfig') }}
        </Button>
        <Button
          v-if="canEdit"
          size="small"
          type="primary"
          @click="openEditorDrawer"
        >
          {{ $t('page.runtimeConfig.editor.open') }}
        </Button>
        <Button v-if="canViewDeploy" size="small" @click="openDeployDrawer">
          {{ $t('page.runtimeConfig.deploy.open') }}
        </Button>
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
    <EditorDrawer
      :title="$t('page.runtimeConfig.editor.title')"
      class="w-full max-w-5xl"
    >
      <RuntimeConfigEditor
        @changed="() => gridApi.query()"
        @open-version="openVersionById"
      />
    </EditorDrawer>
    <DeployDrawer
      :title="$t('page.runtimeConfig.deploy.title')"
      class="w-full max-w-4xl"
    >
      <Alert
        :message="$t('page.runtimeConfig.deploy.restartBound')"
        class="mb-4"
        show-icon
        type="info"
      />
      <JsonEditorShell v-model="deployConfig" :mode="Mode.tree" read-only />
    </DeployDrawer>
  </Page>
</template>

<style scoped>
.runtime-config-current-card :deep(.ant-card-head) {
  background: linear-gradient(
    180deg,
    hsl(var(--muted) / 45%) 0%,
    hsl(var(--card)) 100%
  );
  border-bottom: 1px solid hsl(var(--border) / 60%);
}

.runtime-config-current-card :deep(.ant-card-head-title) {
  font-weight: 600;
}
</style>
