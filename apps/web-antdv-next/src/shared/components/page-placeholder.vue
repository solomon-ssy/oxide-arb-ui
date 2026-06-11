<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { $t } from '#/locales';

defineOptions({ name: 'PagePlaceholder' });
</script>

<template>
  <Page auto-content-height>
    <div
      class="text-muted-foreground flex h-full min-h-[240px] items-center justify-center text-sm"
    >
      {{ $t('page.common.underConstruction') }}
    </div>
  </Page>
</template>
