import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

/**
 * Phase 7.0 development bridge: static routes for all oxide-arb business
 * pages, mirroring the backend menu seed IA (see phase7 docs §3.1).
 *
 * Phase 7.1 switches `accessMode` to `backend` (routes/menus下发 via
 * `GET /api/menus/accessible`) and DELETES this module — it must not survive
 * past 7.1.
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    component: () => import('#/views/dashboard/index.vue'),
    meta: {
      icon: 'lucide:layout-dashboard',
      order: 1,
      title: $t('page.menu.dashboard'),
    },
  },
  {
    name: 'Trading',
    path: '/trading',
    meta: {
      icon: 'lucide:candlestick-chart',
      order: 10,
      title: $t('page.menu.group.trading'),
    },
    children: [
      {
        name: 'Markets',
        path: '/markets',
        component: () => import('#/views/markets/index.vue'),
        meta: { icon: 'lucide:store', title: $t('page.menu.markets') },
      },
      {
        name: 'Opportunities',
        path: '/opportunities',
        component: () => import('#/views/opportunities/index.vue'),
        meta: { icon: 'lucide:radar', title: $t('page.menu.opportunities') },
      },
      {
        name: 'Trades',
        path: '/trades',
        component: () => import('#/views/trades/index.vue'),
        meta: {
          icon: 'lucide:arrow-left-right',
          title: $t('page.menu.trades'),
        },
      },
    ],
  },
  {
    name: 'RiskGroup',
    path: '/risk-group',
    meta: {
      icon: 'lucide:shield-alert',
      order: 20,
      title: $t('page.menu.group.risk'),
    },
    children: [
      {
        name: 'Risk',
        path: '/risk',
        component: () => import('#/views/risk/index.vue'),
        meta: { icon: 'lucide:shield', title: $t('page.menu.risk') },
      },
      {
        name: 'Blacklist',
        path: '/blacklist',
        component: () => import('#/views/blacklist/index.vue'),
        meta: { icon: 'lucide:ban', title: $t('page.menu.blacklist') },
      },
    ],
  },
  {
    name: 'AnalyticsGroup',
    path: '/analytics-group',
    meta: {
      icon: 'lucide:line-chart',
      order: 30,
      title: $t('page.menu.group.analytics'),
    },
    children: [
      {
        name: 'Analytics',
        path: '/analytics',
        component: () => import('#/views/analytics/index.vue'),
        meta: {
          icon: 'lucide:line-chart',
          title: $t('page.menu.analytics'),
        },
      },
    ],
  },
  {
    name: 'Operations',
    path: '/operations',
    meta: {
      icon: 'lucide:wrench',
      order: 40,
      title: $t('page.menu.group.operations'),
    },
    children: [
      {
        name: 'RuntimeConfig',
        path: '/runtime-config',
        component: () => import('#/views/runtime-config/index.vue'),
        meta: {
          icon: 'lucide:settings-2',
          title: $t('page.menu.runtimeConfig'),
        },
      },
      {
        name: 'ControlFactors',
        path: '/control-factors',
        component: () => import('#/views/control-factors/index.vue'),
        meta: {
          icon: 'lucide:sliders-horizontal',
          title: $t('page.menu.controlFactors'),
        },
      },
      {
        name: 'Publications',
        path: '/publications',
        component: () => import('#/views/publications/index.vue'),
        meta: { icon: 'lucide:send', title: $t('page.menu.publications') },
      },
      {
        name: 'Replay',
        path: '/replay',
        component: () => import('#/views/replay/index.vue'),
        meta: { icon: 'lucide:history', title: $t('page.menu.replay') },
      },
      {
        name: 'Audit',
        path: '/audit',
        component: () => import('#/views/audit/index.vue'),
        meta: { icon: 'lucide:link', title: $t('page.menu.audit') },
      },
      {
        name: 'OperationLog',
        path: '/operation-log',
        component: () => import('#/views/operation-log/index.vue'),
        meta: {
          icon: 'lucide:scroll-text',
          title: $t('page.menu.operationLog'),
        },
      },
    ],
  },
  {
    name: 'AccessControl',
    path: '/access-control',
    meta: {
      icon: 'lucide:key-round',
      order: 50,
      title: $t('page.menu.group.accessControl'),
    },
    children: [
      {
        name: 'Users',
        path: '/users',
        component: () => import('#/views/users/index.vue'),
        meta: { icon: 'lucide:users', title: $t('page.menu.users') },
      },
      {
        name: 'Roles',
        path: '/roles',
        component: () => import('#/views/roles/index.vue'),
        meta: { icon: 'lucide:user-cog', title: $t('page.menu.roles') },
      },
      {
        name: 'Menus',
        path: '/menus',
        component: () => import('#/views/menus/index.vue'),
        meta: { icon: 'lucide:list-tree', title: $t('page.menu.menus') },
      },
    ],
  },
];

export default routes;
