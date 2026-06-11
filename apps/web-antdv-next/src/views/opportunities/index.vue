<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

import { $t } from '#/locales';

defineOptions({ name: 'OpportunitiesPage' });
</script>

<template>
  <Fallback
    :description="$t('page.common.underConstruction')"
    :title="$t('page.menu.opportunities')"
    status="coming-soon"
  />
</template>
