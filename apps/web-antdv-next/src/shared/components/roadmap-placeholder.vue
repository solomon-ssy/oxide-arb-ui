<script lang="ts" setup>
import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';

defineOptions({ name: 'RoadmapPlaceholder' });

defineProps<{
  /** Frontend-refactor sub-phase that delivers this page (e.g. "10.3"). */
  phase: string;
}>();
</script>

<template>
  <Page auto-content-height>
    <div
      class="text-muted-foreground flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-sm"
    >
      <IconifyIcon class="size-8 opacity-60" icon="lucide:construction" />
      <span>{{ $t('page.common.comingInPhase', { phase }) }}</span>
    </div>
  </Page>
</template>
