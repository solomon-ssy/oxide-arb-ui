<script lang="ts" setup>
import { computed, watch } from 'vue';

import { useAntdDesignTokens } from '@vben/hooks';
import { preferences, usePreferences } from '@vben/preferences';

import { App, ConfigProvider, theme } from 'antdv-next';

import { antdLocale } from '#/locales';

defineOptions({ name: 'App' });

const { isDark } = usePreferences();
const { tokens } = useAntdDesignTokens();

const tokenTheme = computed(() => {
  const algorithm = isDark.value
    ? [theme.darkAlgorithm]
    : [theme.defaultAlgorithm];

  // antd 紧凑模式算法
  if (preferences.app.compact) {
    algorithm.push(theme.compactAlgorithm);
  }

  const components = isDark.value
    ? {
        Tabs: {
          itemActiveColor: tokens.colorTextBase,
          itemHoverColor: tokens.colorTextBase,
          itemSelectedColor: tokens.colorTextBase,
        },
      }
    : undefined;

  return {
    algorithm,
    components,
    token: tokens,
  };
});

watch(
  tokenTheme,
  (themeConfig) => {
    ConfigProvider.config({ theme: themeConfig });
  },
  { immediate: true },
);
</script>

<template>
  <ConfigProvider :locale="antdLocale" :theme="tokenTheme">
    <App>
      <RouterView />
    </App>
  </ConfigProvider>
</template>

<style>
.dark .ant-btn-link {
  color: hsl(var(--foreground)) !important;
}

.ant-tag-filled:not(.ant-tag-default) {
  color: hsl(var(--foreground)) !important;
}

.vben-link,
.vben-link:hover,
.vben-link:active {
  color: hsl(var(--foreground));
  text-decoration-line: underline;
  text-underline-offset: 2px;
}
</style>
