<script lang="ts" setup>
import type { SystemIndicator } from '#/shared/composables/ws/ws-indicators';

import { computed } from 'vue';

import { Tag } from 'antdv-next';

import { $t } from '#/locales';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { deriveSystemIndicator } from '#/shared/composables/ws/ws-indicators';
import { useSystemStore, useWsStore } from '#/store';

defineOptions({ name: 'SystemStatusIndicator' });

const systemStore = useSystemStore();
const wsStore = useWsStore();
const { hasAccessByCodes } = useOxideAccess();

/** Without `system:read` the WS never pushes status — hide entirely. */
const visible = computed(() => hasAccessByCodes(['system:read']));

const indicator = computed<SystemIndicator>(() =>
  deriveSystemIndicator(systemStore.status, wsStore.recentAlertLevel),
);

const INDICATOR_COLOR: Record<SystemIndicator, string> = {
  critical: 'error',
  degraded: 'warning',
  running: 'success',
  unknown: 'default',
};

const label = computed(() => $t(`page.system.indicator.${indicator.value}`));
const tagColor = computed(() => INDICATOR_COLOR[indicator.value]);
</script>

<template>
  <div v-if="visible" class="flex h-8 items-center px-2">
    <Tag :color="tagColor">{{ label }}</Tag>
  </div>
</template>
