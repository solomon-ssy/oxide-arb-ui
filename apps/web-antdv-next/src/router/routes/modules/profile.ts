import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

/** User profile page — reachable from the user dropdown, hidden from the menu. */
const routes: RouteRecordRaw[] = [
  {
    name: 'Profile',
    path: '/profile',
    component: () => import('#/views/_core/profile/index.vue'),
    meta: {
      icon: 'lucide:user',
      hideInMenu: true,
      title: $t('page.auth.profile'),
    },
  },
];

export default routes;
