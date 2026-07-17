<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

defineOptions({ name: 'FallbackServerError' });
</script>

<template>
  <Fallback status="500" />
</template>
