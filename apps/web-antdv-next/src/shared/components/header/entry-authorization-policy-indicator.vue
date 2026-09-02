<script lang="ts" setup>
import type { EntryAuthorizationPolicy } from '@vben/types';

import { computed } from 'vue';

import { ENTRY_AUTHORIZATION_POLICY_OPTIONS } from '@vben/types';

import { $t } from '#/locales';
import GovernedStatePickerPopover from '#/shared/components/header/governed-state-picker-popover.vue';
import { usePreflightResult } from '#/shared/composables/use-preflight-result';
import { useQpAccess } from '#/shared/composables/use-qp-access';
import { useEntryAuthorizationPolicyAction } from '#/shared/composables/use-system-actions';
import { useSystemStore } from '#/store';

defineOptions({ name: 'EntryAuthorizationPolicyIndicator' });

const systemStore = useSystemStore();
const { hasAccessByCodes } = useQpAccess();
const entryAuthorization = useEntryAuthorizationPolicyAction();
const { show: showPreflight } = usePreflightResult();

const currentPolicy = computed(
  () => systemStore.status?.entry_authorization_policy ?? null,
);

// Hide until the first system.status seed — otherwise the picker flashes the
// "模式" unknown placeholder (问号态) before REST/WS arrive.
const visible = computed(
  () =>
    hasAccessByCodes(['system:update_runtime_control']) &&
    currentPolicy.value !== null,
);

const pickerOptions = computed(() =>
  ENTRY_AUTHORIZATION_POLICY_OPTIONS.map((policy) => ({
    disabled: policy === currentPolicy.value,
    value: policy,
  })),
);

async function onSelect(raw: string) {
  const target = raw as EntryAuthorizationPolicy;
  // Authorization / kill / settlement policy share one revisioned singleton.
  const expectedRevision =
    systemStore.runtimeControls?.revision ??
    systemStore.status?.kill_switch.revision;
  if (expectedRevision === undefined) {
    return;
  }
  const result = await entryAuthorization.switchTo(
    currentPolicy.value,
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
    :current-value="currentPolicy"
    enum-name="EntryAuthorizationPolicy"
    :fallback-label="$t('page.header.authorizationPicker.unknown')"
    :options="pickerOptions"
    :title="$t('page.header.authorizationPicker.title')"
    @select="onSelect"
  />
</template>
