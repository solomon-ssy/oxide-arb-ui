<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useContentMaximize, useTabs } from '@vben/hooks';
import { $t } from '@vben/locales';
import { preferences, usePreferences } from '@vben/preferences';
import { useTabbarStore } from '@vben/stores';

import {
  TabsToolMore,
  TabsToolRefresh,
  TabsToolScreen,
  TabsView,
} from '@vben-core/tabs-ui';

import { useTabbar } from './use-tabbar';

defineOptions({
  name: 'LayoutTabbar',
});

defineProps<{ showIcon?: boolean; theme?: string }>();

const route = useRoute();
const tabbarStore = useTabbarStore();
const { isMobile } = usePreferences();
const { contentIsMaximize, toggleMaximize } = useContentMaximize();
const { refreshTab, unpinTab } = useTabs();

const {
  createContextMenus,
  currentActive,
  currentTabs,
  handleClick,
  handleClose,
} = useTabbar();

const menus = computed(() => {
  const tab = tabbarStore.getTabByKey(currentActive.value);
  const menus = createContextMenus(tab);
  return menus.map((item) => {
    return {
      ...item,
      label: item.text,
      value: item.key,
    };
  });
});

// 刷新后如果不保持tab状态，关闭其他tab
if (!preferences.tabbar.persist) {
  tabbarStore.closeOtherTabs(route);
}
</script>

<template>
  <TabsView
    :active="currentActive"
    :class="theme"
    :context-menus="createContextMenus"
    :draggable="preferences.tabbar.draggable"
    :show-icon="showIcon"
    :style-type="preferences.tabbar.styleType"
    :tabs="currentTabs"
    :wheelable="preferences.tabbar.wheelable"
    :middle-click-to-close="preferences.tabbar.middleClickToClose"
    @close="handleClose"
    @sort-tabs="tabbarStore.sortTabs"
    @unpin="unpinTab"
    @update:active="handleClick"
  />
  <div class="flex-center h-full">
    <TabsToolMore
      v-if="preferences.tabbar.showMore"
      :aria-label="$t('ui.widgets.tabActions')"
      :menus="menus"
    />
    <TabsToolRefresh
      v-if="preferences.tabbar.showRefresh && !isMobile"
      :aria-label="$t('ui.widgets.refreshTab')"
      @refresh="refreshTab"
    />
    <TabsToolScreen
      v-if="preferences.tabbar.showMaximize && !isMobile"
      :aria-label="
        $t(
          contentIsMaximize
            ? 'ui.widgets.restoreContent'
            : 'ui.widgets.maximizeContent',
        )
      "
      :screen="contentIsMaximize"
      @change="toggleMaximize"
      @update:screen="toggleMaximize"
    />
  </div>
</template>
