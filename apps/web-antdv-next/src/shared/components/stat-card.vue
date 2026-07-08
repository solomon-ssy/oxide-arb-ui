<script lang="ts" setup>
import type { DecimalSign } from '#/shared/components/format';

import { IconifyIcon } from '@vben/icons';

import { Skeleton, Tooltip } from 'antdv-next';

import SignedValue from '#/shared/components/signed-value.vue';

defineOptions({ name: 'StatCard' });

withDefaults(
  defineProps<{
    loading?: boolean;
    /** Sign drives value coloring: positive green, negative red. */
    sign?: DecimalSign | null;
    title: string;
    tooltip?: string;
    /** Pre-formatted display value (formatting stays in the caller). */
    value: string;
  }>(),
  { loading: false, sign: null, tooltip: undefined },
);
</script>

<template>
  <div class="bg-card flex flex-col gap-2 rounded-lg border p-4">
    <div class="text-muted-foreground flex items-center gap-1 text-sm">
      <span>{{ title }}</span>
      <Tooltip v-if="tooltip" :title="tooltip">
        <IconifyIcon class="size-3.5 cursor-help" icon="lucide:info" />
      </Tooltip>
    </div>
    <Skeleton
      v-if="loading"
      :paragraph="false"
      :title="{ width: '60%' }"
      active
    />
    <SignedValue
      v-else
      :sign="sign"
      class="text-2xl font-semibold"
      :value="value"
    />
    <div v-if="$slots.footer" class="text-muted-foreground text-xs">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
