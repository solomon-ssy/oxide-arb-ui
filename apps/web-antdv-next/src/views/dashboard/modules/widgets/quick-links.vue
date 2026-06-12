<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { $t } from '#/locales';
import DashboardPanel from '#/shared/components/dashboard-panel.vue';
import { useOxideAccess } from '#/shared/composables/use-oxide-access';

defineOptions({ name: 'DashboardQuickLinks' });

const router = useRouter();
const { hasAccessByCodes } = useOxideAccess();

interface QuickLink {
  code: string;
  icon: string;
  iconClass: string;
  label: string;
  tileClass: string;
  to: string;
}

const ALL_LINKS: QuickLink[] = [
  {
    code: 'market:read',
    icon: 'lucide:candlestick-chart',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
    label: 'page.menu.markets',
    tileClass:
      'border-indigo-200/70 bg-indigo-500/[0.06] hover:bg-indigo-500/12 dark:border-indigo-900/50 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/18',
    to: '/markets',
  },
  {
    code: 'risk:read',
    icon: 'lucide:shield-alert',
    iconClass: 'text-amber-600 dark:text-amber-400',
    label: 'page.menu.risk',
    tileClass:
      'border-amber-200/70 bg-amber-500/[0.06] hover:bg-amber-500/12 dark:border-amber-900/50 dark:bg-amber-500/10 dark:hover:bg-amber-500/18',
    to: '/risk',
  },
  {
    code: 'runtime_config:read',
    icon: 'lucide:settings-2',
    iconClass: 'text-sky-600 dark:text-sky-400',
    label: 'page.menu.runtimeConfig',
    tileClass:
      'border-sky-200/70 bg-sky-500/[0.06] hover:bg-sky-500/12 dark:border-sky-900/50 dark:bg-sky-500/10 dark:hover:bg-sky-500/18',
    to: '/runtime-config',
  },
  {
    code: 'operation_log:read',
    icon: 'lucide:scroll-text',
    iconClass: 'text-teal-600 dark:text-teal-400',
    label: 'page.menu.operationLog',
    tileClass:
      'border-teal-200/70 bg-teal-500/[0.06] hover:bg-teal-500/12 dark:border-teal-900/50 dark:bg-teal-500/10 dark:hover:bg-teal-500/18',
    to: '/operation-log',
  },
  {
    code: 'user:read',
    icon: 'lucide:users',
    iconClass: 'text-violet-600 dark:text-violet-400',
    label: 'page.menu.users',
    tileClass:
      'border-violet-200/70 bg-violet-500/[0.06] hover:bg-violet-500/12 dark:border-violet-900/50 dark:bg-violet-500/10 dark:hover:bg-violet-500/18',
    to: '/users',
  },
];

const links = computed(() =>
  ALL_LINKS.filter((link) => hasAccessByCodes([link.code])),
);
</script>

<template>
  <DashboardPanel
    fill
    icon="lucide:layout-grid"
    tone="amber"
    :title="$t('page.dashboard.quickLinks.title')"
  >
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="link in links"
        :key="link.to"
        :class="link.tileClass"
        class="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors"
        type="button"
        @click="router.push(link.to)"
      >
        <IconifyIcon :class="link.iconClass" :icon="link.icon" class="size-4" />
        <span class="font-medium">{{ $t(link.label) }}</span>
      </button>
    </div>
  </DashboardPanel>
</template>
