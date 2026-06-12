<script lang="ts" setup>
import type { ExecutionMode } from '@vben/types';

import { computed } from 'vue';

import { EXECUTION_MODE_OPTIONS, EXECUTION_MODES } from '@vben/types';

import { Dropdown, Menu, MenuItem } from 'antdv-next';

import { $t } from '#/locales';
import ExecutionModeTag from '#/shared/components/execution-mode-tag.vue';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';
import { useSystemControl } from '#/shared/composables/use-system-control';
import { useSystemStore } from '#/store';

defineOptions({ name: 'ExecutionModeSwitcher' });

const systemStore = useSystemStore();
const { hasAccessByCodes } = useOxideAccess();
const { switchMode } = useSystemControl();

/** Without `system:read` there is no mode to show — hide entirely. */
const visible = computed(() => hasAccessByCodes(['system:read']));
const canSwitch = computed(() => hasAccessByCodes(['system:switch_mode']));
const currentMode = computed(() => systemStore.status?.execution_mode);

const targets = computed(() =>
  EXECUTION_MODE_OPTIONS.filter((mode) => mode !== currentMode.value),
);

async function onSelect(mode: ExecutionMode) {
  await switchMode(mode);
}
</script>

<template>
  <template v-if="visible">
    <!-- Operators get a governed dropdown; everyone else a read-only tag. -->
    <Dropdown v-if="canSwitch" :trigger="['click']">
      <template #popupRender>
        <Menu>
          <MenuItem v-for="mode in targets" :key="mode" @click="onSelect(mode)">
            <span :class="{ 'text-red-500': mode === EXECUTION_MODES.live }">
              {{ $t(`enum.executionMode.${mode}`) }}
            </span>
          </MenuItem>
        </Menu>
      </template>
      <button
        class="hover:bg-accent flex h-8 cursor-pointer items-center rounded-md px-2"
        type="button"
      >
        <ExecutionModeTag :mode="currentMode" />
      </button>
    </Dropdown>
    <div v-else class="flex h-8 items-center px-2">
      <ExecutionModeTag :mode="currentMode" />
    </div>
  </template>
</template>
