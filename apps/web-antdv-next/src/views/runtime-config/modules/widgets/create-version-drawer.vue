<script lang="ts" setup>
import type { RuntimeConfigDocument } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Alert } from 'antdv-next';
import { Mode } from 'vanilla-jsoneditor';

import { $t } from '#/locales';
import JsonEditorShell from '#/shared/components/json-editor/json-editor-shell.vue';

defineOptions({ name: 'RuntimeConfigCreateVersionDrawer' });

interface DrawerPayload {
  config: RuntimeConfigDocument;
  onSubmit: (config: RuntimeConfigDocument) => Promise<boolean>;
}

const config = ref<RuntimeConfigDocument>({});
const error = ref('');

const [Drawer, drawerApi] = useVbenDrawer({
  onConfirm: async () => {
    error.value = '';
    const payload = drawerApi.getData<DrawerPayload>();
    drawerApi.lock();
    try {
      const succeeded = await payload.onSubmit(config.value);
      if (succeeded) {
        drawerApi.close();
      }
    } finally {
      drawerApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const payload = drawerApi.getData<DrawerPayload>();
      config.value = structuredClone(payload.config ?? {});
      error.value = '';
    }
  },
});
</script>

<template>
  <Drawer
    :title="$t('page.runtimeConfig.create.title')"
    class="w-full max-w-4xl"
  >
    <Alert
      :message="$t('page.runtimeConfig.create.tip')"
      class="mb-4"
      show-icon
      type="warning"
    />
    <div
      v-if="error"
      class="mb-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600"
    >
      {{ error }}
    </div>
    <JsonEditorShell v-model="config" :mode="Mode.text" />
  </Drawer>
</template>
