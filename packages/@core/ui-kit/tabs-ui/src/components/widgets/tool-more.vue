<script lang="ts" setup>
import type { DropdownMenuProps } from '@vben-core/shadcn-ui';

import { LayoutGrid } from '@vben-core/icons';
import { VbenDropdownMenu } from '@vben-core/shadcn-ui';

defineProps<DropdownMenuProps & { ariaLabel?: string }>();
</script>

<template>
  <VbenDropdownMenu
    :menus="menus"
    :modal="false"
    :trigger-aria-label="ariaLabel"
  >
    <div
      class="flex-center h-full cursor-pointer border-l border-border px-2 text-lg font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <LayoutGrid class="size-4" />
    </div>
  </VbenDropdownMenu>
</template>
