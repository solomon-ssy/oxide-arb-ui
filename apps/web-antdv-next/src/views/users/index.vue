<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

import { $t } from '#/locales';

defineOptions({ name: 'UsersPage' });
</script>

<template>
  <Fallback
    :description="$t('page.common.underConstruction')"
    :title="$t('page.menu.users')"
    status="coming-soon"
  />
</template>
