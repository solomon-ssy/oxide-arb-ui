<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

import { $t } from '#/locales';

defineOptions({ name: 'ControlFactorsPage' });
</script>

<template>
  <Fallback
    :description="$t('page.common.underConstruction')"
    :title="$t('page.menu.controlFactors')"
    status="coming-soon"
  />
</template>
