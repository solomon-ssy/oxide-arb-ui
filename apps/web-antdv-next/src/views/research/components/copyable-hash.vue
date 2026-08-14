<script lang="ts" setup>
import { ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useClipboard } from '@vueuse/core';
import { Button, Tooltip } from 'antdv-next';

import { $t } from '#/locales';

const props = defineProps<{
  label: string;
  value: string;
}>();

const { copy } = useClipboard();
const copied = ref(false);

async function copyValue() {
  await copy(props.value);
  copied.value = true;
}

watch(
  () => props.value,
  () => {
    copied.value = false;
  },
);
</script>

<template>
  <div class="flex min-w-0 items-start gap-2">
    <span class="min-w-0 flex-1 break-all font-mono text-xs">
      {{ value }}
    </span>
    <Tooltip :title="$t('page.research.copyValue', { label })">
      <Button
        :aria-label="$t('page.research.copyValue', { label })"
        class="min-h-11 min-w-11 shrink-0"
        size="small"
        type="text"
        @click="copyValue"
      >
        <IconifyIcon aria-hidden="true" class="size-4" icon="lucide:copy" />
      </Button>
    </Tooltip>
    <span aria-live="polite" class="sr-only" role="status">
      {{ copied ? $t('page.research.copiedValue', { label }) : '' }}
    </span>
  </div>
</template>
