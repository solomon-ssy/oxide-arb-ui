<script lang="ts" setup>
import type { OpportunityAuditView, UuidString } from '@vben/types';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useRequestHandler } from '@vben/request/oxide';

import { getOpportunityAudit } from '#/api/opportunities';
import { $t } from '#/locales';
import AuditTimeline from '#/shared/components/audit-timeline.vue';

defineOptions({ name: 'OpportunityAuditDrawer' });

const { handleRequest } = useRequestHandler();

const items = ref<OpportunityAuditView[]>([]);
const loading = ref(false);

const [Drawer, drawerApi] = useVbenDrawer({
  footer: false,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      items.value = [];
      return;
    }
    const { opportunityId } = drawerApi.getData<{
      opportunityId: UuidString;
    }>();
    loading.value = true;
    try {
      await handleRequest(
        () => getOpportunityAudit(opportunityId),
        (rows) => {
          items.value = rows;
        },
      );
    } finally {
      loading.value = false;
    }
  },
});
</script>

<template>
  <Drawer class="w-[560px]" :title="$t('page.opportunities.audit.title')">
    <AuditTimeline :items="items" :loading="loading" />
  </Drawer>
</template>
