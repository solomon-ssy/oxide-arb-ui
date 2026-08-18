<script lang="ts" setup>
import { watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { $t } from '#/locales';
import PreflightReportBlock from '#/shared/components/preflight-report-block.vue';
import WorkspaceInspectorSurface from '#/shared/components/workspace/workspace-inspector-surface.vue';
import { usePreflightResult } from '#/shared/composables/use-preflight-result';

defineOptions({ name: 'PreflightResultDrawer' });

const { close, preflightOpen, preflightReport } = usePreflightResult();

const [, drawerApi] = useVbenDrawer({
  destroyOnClose: true,
  footer: false,
  onOpenChange(isOpen) {
    if (!isOpen) {
      close();
    }
  },
});

watch(preflightOpen, (open) => {
  if (open && preflightReport.value) {
    drawerApi.open();
  } else if (!open) {
    drawerApi.close();
  }
});

watch(preflightReport, (report) => {
  if (report && preflightOpen.value) {
    drawerApi.open();
  }
});
</script>

<template>
  <WorkspaceInspectorSurface
    :drawer-api="drawerApi"
    :title="$t('page.header.modePicker.preflightTitle')"
  >
    <PreflightReportBlock v-if="preflightReport" :report="preflightReport" />
  </WorkspaceInspectorSurface>
</template>
