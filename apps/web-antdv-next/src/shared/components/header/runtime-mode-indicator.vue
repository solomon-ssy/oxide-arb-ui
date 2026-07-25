<script lang="ts" setup>
import type { QuantRuntimeMode } from '@vben/types';

import { computed } from 'vue';

import { QUANT_RUNTIME_MODE_OPTIONS } from '@vben/types';

import { $t } from '#/locales';
import {
  findTagOption,
  useQuantRuntimeModeTagOptions,
} from '#/shared/components/format/tag-options';
import GovernedStatePickerPopover from '#/shared/components/header/governed-state-picker-popover.vue';
import { usePreflightResult } from '#/shared/composables/use-preflight-result';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useQuantModeAction } from '#/shared/composables/use-system-actions';
import { useSystemStore } from '#/store';

defineOptions({ name: 'RuntimeModeIndicator' });

const systemStore = useSystemStore();
const { hasAccessByCodes } = useQpAccess();
const quantMode = useQuantModeAction();
const { show: showPreflight } = usePreflightResult();

const currentMode = computed(
  () => systemStore.status?.quant_runtime_mode ?? null,
);

// Hide until the first system.status seed — otherwise the picker flashes the
// "模式" unknown placeholder (问号态) before REST/WS arrive.
const visible = computed(
  () => hasAccessByCodes(['system:switch_mode']) && currentMode.value !== null,
);

const modeTagOptions = useQuantRuntimeModeTagOptions();
const currentTag = computed(() =>
  findTagOption(modeTagOptions, currentMode.value),
);

const pickerOptions = computed(() =>
  QUANT_RUNTIME_MODE_OPTIONS.map((mode) => {
    const tag = findTagOption(modeTagOptions, mode);
    return {
      disabled: mode === currentMode.value,
      label: tag?.label ?? mode,
      tagColor: tag?.color,
      value: mode,
    };
  }),
);

async function onSelect(raw: string) {
  const target = raw as QuantRuntimeMode;
  // Mode / kill / settlement policy share one revisioned singleton.
  const expectedRevision =
    systemStore.runtimeControls?.revision ??
    systemStore.status?.kill_switch.revision;
  if (expectedRevision === undefined) {
    return;
  }
  const result = await quantMode.switchTo(
    currentMode.value,
    target,
    expectedRevision,
  );
  if (result?.preflight) {
    showPreflight(result.preflight);
  }
}
</script>

<template>
  <GovernedStatePickerPopover
    v-if="visible"
    :current-value="currentMode"
    icon="lucide:gauge"
    :options="pickerOptions"
    :tag-color="currentTag?.color ?? 'default'"
    :tag-label="currentTag?.label ?? $t('page.header.modePicker.unknown')"
    :title="$t('page.header.modePicker.title')"
    @select="onSelect"
  />
</template>
