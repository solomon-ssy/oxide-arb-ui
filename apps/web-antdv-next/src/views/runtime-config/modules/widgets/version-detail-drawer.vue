<script lang="ts" setup>
import type {
  RuntimeConfigActivationInfo,
  RuntimeConfigDocument,
  RuntimeConfigVersionView,
} from '@vben/types';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Descriptions, DescriptionsItem, TabPane, Tabs } from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { $t } from '#/locales';
import { formatDateTimeLocal } from '#/shared/components/format';
import {
  findTagOption,
  useRuntimeConfigDiffTypeTagOptions,
} from '#/shared/components/format/tag-options';
import JsonDiffList from '#/shared/components/json-diff-list.vue';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

import { diffJson } from './json-diff';
import { resolveRuntimeConfigDiffBaseline } from './resolve-diff-baseline';

defineOptions({ name: 'RuntimeConfigVersionDetailDrawer' });

interface VersionDetailDrawerData {
  activeActivation: null | RuntimeConfigActivationInfo;
  activeVersionId: null | string;
  currentConfig: RuntimeConfigDocument;
  version: RuntimeConfigVersionView;
  versionCatalog: RuntimeConfigVersionView[];
}

const diffTypeTagOptions = useRuntimeConfigDiffTypeTagOptions();

const version = ref<null | RuntimeConfigVersionView>(null);
const currentConfig = ref<RuntimeConfigDocument>({});
const activeVersionId = ref<null | string>(null);
const activeActivation = ref<null | RuntimeConfigActivationInfo>(null);
const versionCatalog = ref<RuntimeConfigVersionView[]>([]);

const diffs = computed(() => {
  if (!version.value) {
    return [];
  }
  const baseline = resolveRuntimeConfigDiffBaseline(version.value, {
    activeActivation: activeActivation.value,
    activeVersionId: activeVersionId.value,
    currentConfig: currentConfig.value,
    versionCatalog: versionCatalog.value,
  });
  return diffJson(baseline, version.value.config_json);
});

const diffItems = computed(() =>
  diffs.value.map((row) => ({
    badge: findTagOption(diffTypeTagOptions, row.type),
    key: row.path,
    next: row.next,
    previous: row.previous,
    subtitle: row.path,
  })),
);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = drawerApi.getData<VersionDetailDrawerData>();
      version.value = data.version;
      currentConfig.value = data.currentConfig;
      activeVersionId.value = data.activeVersionId;
      activeActivation.value = data.activeActivation;
      versionCatalog.value = data.versionCatalog;
    } else {
      version.value = null;
      currentConfig.value = {};
      activeVersionId.value = null;
      activeActivation.value = null;
      versionCatalog.value = [];
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.runtimeConfig.detail.title')"
    class="w-full max-w-4xl"
  >
    <template v-if="version">
      <Descriptions :column="1" bordered size="small">
        <DescriptionsItem :label="$t('page.runtimeConfig.detail.versionId')">
          <span class="font-mono text-xs">{{
            version.runtime_config_version_id
          }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.runtimeConfig.detail.hash')">
          <span class="font-mono text-xs">{{ version.config_hash }}</span>
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.runtimeConfig.detail.createdBy')">
          {{ version.created_by }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.runtimeConfig.detail.createdAt')">
          {{ formatDateTimeLocal(version.created_at) }}
        </DescriptionsItem>
        <DescriptionsItem :label="$t('page.runtimeConfig.detail.reason')">
          {{ version.reason }}
        </DescriptionsItem>
      </Descriptions>

      <Tabs class="mt-4">
        <TabPane key="config" :tab="$t('page.runtimeConfig.detail.configTab')">
          <JsonEditorShell
            :model-value="version.config_json"
            :mode="Mode.tree"
            read-only
          />
        </TabPane>
        <TabPane key="diff" :tab="$t('page.runtimeConfig.detail.diffTab')">
          <JsonDiffList
            :empty-text="$t('page.runtimeConfig.detail.noDiff')"
            :items="diffItems"
          />
        </TabPane>
      </Tabs>
    </template>
  </Drawer>
</template>
