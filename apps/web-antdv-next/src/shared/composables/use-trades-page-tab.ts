/**
 * In-page tab state for `/trades`.
 *
 * Page-internal tabs are UI state — they must not sync to the router on every
 * switch (vben tabbar keys routes by `fullPath`, so `?tab=` would spawn new
 * layout tabs and remount the page).
 *
 * Cross-page deep links set a one-shot `pendingTab` before navigating to
 * `/trades` with a clean path. Legacy `?tab=` bookmarks are consumed once on
 * entry and stripped from the URL.
 */

import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export type TradesPageTab = 'decisions' | 'reconciliation' | 'trades';

const VALID_TABS = new Set<TradesPageTab>([
  'decisions',
  'reconciliation',
  'trades',
]);

/** Active in-page tab while the trades view is mounted or keep-alive cached. */
const activeTab = ref<TradesPageTab>('trades');

/** One-shot intent consumed on trades page entry (`onMounted` / `onActivated`). */
const pendingTab = ref<null | TradesPageTab>(null);

function parseTab(value: unknown): null | TradesPageTab {
  if (typeof value === 'string' && VALID_TABS.has(value as TradesPageTab)) {
    return value as TradesPageTab;
  }
  return null;
}

export function useTradesPageTab() {
  const route = useRoute();
  const router = useRouter();

  /**
   * Open trades on a specific in-page tab from anywhere in the app.
   * Uses router path only — never `?tab=` query params.
   */
  function openTradesTab(tab: TradesPageTab) {
    if (route.path === '/trades') {
      activeTab.value = tab;
      pendingTab.value = null;
      return;
    }
    pendingTab.value = tab;
    void router.push({ path: '/trades' });
  }

  /**
   * Apply navigation intent when the trades page is entered or re-activated.
   * Call from `onMounted` and `onActivated` (keep-alive).
   */
  function syncTabOnEnter() {
    const fromIntent = pendingTab.value;
    if (fromIntent) {
      pendingTab.value = null;
      activeTab.value = fromIntent;
      return;
    }

    const fromQuery = parseTab(route.query.tab);
    if (!fromQuery) {
      return;
    }

    activeTab.value = fromQuery;
    const nextQuery = { ...route.query };
    delete nextQuery.tab;
    void router.replace({ path: route.path, query: nextQuery });
  }

  return {
    activeTab,
    openTradesTab,
    syncTabOnEnter,
  };
}
