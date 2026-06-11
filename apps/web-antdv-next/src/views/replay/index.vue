<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

import { $t } from '#/locales';

defineOptions({ name: 'ReplayPage' });
</script>

<template>
  <Fallback
    :description="$t('page.common.underConstruction')"
    :title="$t('page.menu.replay')"
    status="coming-soon"
  />
</template>
