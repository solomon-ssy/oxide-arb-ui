<script lang="ts" setup>
import { Maximize, Minimize } from '@vben-core/icons';

import { useFullscreen } from '@vueuse/core';

import { VbenIconButton } from '../button';

defineOptions({ name: 'FullScreen' });

defineProps<{
  enterLabel: string;
  exitLabel: string;
}>();

const { isFullscreen, toggle } = useFullscreen();

// 重新检查全屏状态
isFullscreen.value = !!(
  document.fullscreenElement ||
  // @ts-expect-error - vendor fullscreen APIs are not included in the standard DOM typings
  document.webkitFullscreenElement ||
  // @ts-expect-error - vendor fullscreen APIs are not included in the standard DOM typings
  document.mozFullScreenElement ||
  // @ts-expect-error - vendor fullscreen APIs are not included in the standard DOM typings
  document.msFullscreenElement
);
</script>
<template>
  <VbenIconButton
    :aria-label="isFullscreen ? exitLabel : enterLabel"
    :tooltip="isFullscreen ? exitLabel : enterLabel"
    class="hover:animate-[shrink_0.3s_ease-in-out]"
    @click="toggle"
  >
    <Minimize v-if="isFullscreen" class="text-foreground size-4" />
    <Maximize v-else class="text-foreground size-4" />
  </VbenIconButton>
</template>
