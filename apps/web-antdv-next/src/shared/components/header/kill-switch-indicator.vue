<script lang="ts" setup>
import type { KillSwitchState } from '@vben/types';

import { computed } from 'vue';

import { KILL_SWITCH_STATES } from '@vben/types';

import { $t } from '#/locales';
import {
  findTagOption,
  useKillSwitchStateTagOptions,
} from '#/shared/components/format/tag-options';
import GovernedStatePickerPopover from '#/shared/components/header/governed-state-picker-popover.vue';
import { useKillSwitchAction } from '#/shared/composables/use-system-actions';
import { useSystemStore } from '#/store';

defineOptions({ name: 'KillSwitchIndicator' });

const systemStore = useSystemStore();
const killSwitchAction = useKillSwitchAction();

const killSwitch = computed(() => systemStore.status?.kill_switch ?? null);
const currentState = computed(() => killSwitch.value?.state ?? null);

const killSwitchTagOptions = useKillSwitchStateTagOptions();
const currentTag = computed(() =>
  findTagOption(killSwitchTagOptions, currentState.value),
);

const allStates = computed(() => Object.values(KILL_SWITCH_STATES));

const visible = computed(() => {
  const current = currentState.value;
  if (!current) {
    return false;
  }
  return allStates.value.some(
    (target) =>
      target !== current && killSwitchAction.canTransition(current, target),
  );
});

const pickerOptions = computed(() =>
  allStates.value.map((state) => {
    const tag = findTagOption(killSwitchTagOptions, state);
    const current = currentState.value;
    const hidden =
      current !== null &&
      state !== current &&
      !killSwitchAction.canTransition(current, state);
    return {
      danger: state === KILL_SWITCH_STATES.emergencyHalted,
      disabled: state === current,
      hidden,
      label: tag?.label ?? state,
      tagColor: tag?.color,
      value: state,
    };
  }),
);

async function onSelect(raw: string) {
  const current = killSwitch.value;
  const expectedRevision =
    current?.revision ?? systemStore.runtimeControls?.revision;
  if (expectedRevision === undefined) {
    return;
  }
  await killSwitchAction.setTo(
    current,
    raw as KillSwitchState,
    expectedRevision,
  );
}
</script>

<template>
  <GovernedStatePickerPopover
    v-if="visible"
    :current-value="currentState"
    :options="pickerOptions"
    :tag-color="currentTag?.color ?? 'default'"
    :tag-label="currentTag?.label ?? $t('page.header.killSwitchPicker.unknown')"
    :title="$t('page.header.killSwitchPicker.title')"
    @select="onSelect"
  />
</template>
