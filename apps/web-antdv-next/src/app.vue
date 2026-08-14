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
      // Antdv transitions every visual property when an async action changes
      // from disabled to enabled. The disabled palette is contrast-exempt, but
      // interpolating from it after the control becomes actionable creates a
      // real low-contrast interval. State colors must therefore switch
      // atomically; focus, loading-icon, and overlay motion remain intact.
      motionDurationMid: '0s',
      primaryColor: buttonTokens.primaryColor,
    },
    Segmented: {
      // Unselected labels are normal-sized interactive text. Antdv's derived
      // tertiary gray misses 4.5:1 on the track in light mode.
      itemColor: tokens.colorTextBase,
      itemHoverColor: tokens.colorTextBase,
      itemSelectedColor: tokens.colorTextBase,
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

watch(
  () => preferences.app.compact,
  (compact) => {
    document.documentElement.dataset.density = compact ? 'compact' : 'default';
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
