import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { message } from 'antdv-next';

import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';

import { adaptMenuTree } from './menu-adapter';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      const closeLoading = message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 0,
      });

      try {
        const authStore = useAuthStore();
        if (!authStore.cachedMenus) {
          await authStore.fetchUserInfo();
        }
        const menus = authStore.cachedMenus ?? [];
        const { routes, permissionCodes } = adaptMenuTree(menus);
        useAccessStore().setAccessCodes(permissionCodes);
        return routes;
      } finally {
        closeLoading();
      }
    },
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
