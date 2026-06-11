<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

import { $t } from '#/locales';

defineOptions({ name: 'TradesPage' });
</script>

<template>
  <Fallback
    :description="$t('page.common.underConstruction')"
    :title="$t('page.menu.trades')"
    status="coming-soon"
  />
</template>
