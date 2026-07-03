/**
 * Reactive `?open=<id>` deep-link → detail drawer binding.
 *
 * Client-side navigation reuses the page component instance, so reading
 * `route.query.open` once in `onMounted` misses a subsequent `?open=` change
 * (e.g. following an in-app entity link into a ledger already on screen). This
 * composable watches the query id (firing immediately on mount) and opens the
 * drawer with the freshly fetched entity, keeping the deep link authoritative.
 */
import { watch } from 'vue';
import { useRoute } from 'vue-router';

import { useRequestHandler } from '@vben/request/qp';

import { message } from 'antdv-next';

import { $t } from '#/locales';
import { queryOpenIdMatches } from '#/shared/routes/execution-plane';

export interface QueryOpenDrawerOptions<T> {
  /** Fetch the authoritative entity for the deep-linked id. */
  fetch: (id: string) => Promise<null | T>;
  /** Open the drawer with the fetched entity (page-specific `setData`). */
  open: (entity: T) => void;
  /** Query key carrying the id (defaults to `open`). */
  key?: string;
  /** Toast when the entity is missing; defaults to `page.common.deepLinkNotFound`. */
  notFoundMessage?: string;
}

/** Open a detail drawer reactively from an `?open=<id>` deep link. */
export function useQueryOpenDrawer<T>(
  options: QueryOpenDrawerOptions<T>,
): void {
  const route = useRoute();
  const { handleRequest } = useRequestHandler();
  const key = options.key ?? 'open';

  watch(
    () => route.query[key],
    async (raw) => {
      const openId = Array.isArray(raw) ? raw[0] : raw;
      if (typeof openId !== 'string' || openId === '') {
        return;
      }
      const entity = await handleRequest(() => options.fetch(openId), {
        silent: true,
      });
      if (!queryOpenIdMatches(openId, route.query[key])) {
        return;
      }
      if (entity) {
        options.open(entity);
        return;
      }
      message.warning(
        options.notFoundMessage ?? $t('page.common.deepLinkNotFound'),
      );
    },
    { immediate: true },
  );
}
