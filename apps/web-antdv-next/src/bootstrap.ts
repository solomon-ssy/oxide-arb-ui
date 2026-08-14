import { createApp, watchEffect } from 'vue';

import { registerLoadingDirective } from '@vben/common-ui/es/loading';
import { preferences } from '@vben/preferences';
import { initStores } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antdv-next';

import { useTitle } from '@vueuse/core';

import { $t, setupI18n } from '#/locales';
import { registerQpAccessDirective } from '#/shared/access/register-qp-access-directive';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import App from './app.vue';
import { router } from './router';

import '#/styles/index.css';

function syncPageVisibility() {
  document.documentElement.dataset.pageVisibility = document.visibilityState;
}

async function bootstrap(namespace: string) {
  // 初始化组件适配器
  await initComponentAdapter();

  // 初始化表单组件
  await initSetupVbenForm();

  // 初始化表格适配器(注册全局 grid 配置与 Cell* 渲染器)
  await import('./adapter/vxe-table');

  const app = createApp(App);

  syncPageVisibility();
  document.addEventListener('visibilitychange', syncPageVisibility);

  // 注册v-loading指令
  registerLoadingDirective(app, {
    loading: 'loading',
    spinning: 'spinning',
  });

  // 国际化 i18n 配置
  await setupI18n(app);

  // 配置 pinia-tore
  await initStores(app, { namespace });

  // 安装权限指令（quant-pivot super_admin bypass）
  registerQpAccessDirective(app);

  // 初始化 tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // 配置路由及路由守卫
  app.use(router);

  // 动态更新标题
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const pageTitle =
        (routeTitle ? `${$t(routeTitle)} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');
}

export { bootstrap };
