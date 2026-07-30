<script lang="ts" setup>
import { computed, watch } from 'vue';

import { useAntdDesignTokens } from '@vben/hooks';
import { preferences, usePreferences } from '@vben/preferences';

import { App, ConfigProvider, theme } from 'antdv-next';

import { antdLocale } from '#/locales';

defineOptions({ name: 'App' });

const { isDark } = usePreferences();
const { buttonTokens, tokens } = useAntdDesignTokens();

const tokenTheme = computed(() => {
  const algorithm = isDark.value
    ? [theme.darkAlgorithm]
    : [theme.defaultAlgorithm];

  // antd 紧凑模式算法
  if (preferences.app.compact) {
    algorithm.push(theme.compactAlgorithm);
  }

  const components = {
    Button: {
      // Outlined controls retain semantic border/background changes while
      // their labels stay readable in default, hover, and active states.
      colorPrimaryActive: buttonTokens.colorPrimaryActive,
      colorPrimaryHover: buttonTokens.colorPrimaryHover,
      dangerColor: isDark.value
        ? tokens.colorBgLayout
        : tokens.colorTextLightSolid,
      defaultActiveColor: tokens.colorTextBase,
      defaultColor: tokens.colorTextBase,
      defaultHoverColor: tokens.colorTextBase,
    },
    Tabs: {
      // The ink bar already communicates selection. Using body text for tab
      // labels avoids low-contrast brand-color text, including hover states.
      itemActiveColor: tokens.colorTextBase,
      itemHoverColor: tokens.colorTextBase,
      itemSelectedColor: tokens.colorTextBase,
    },
  };

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
