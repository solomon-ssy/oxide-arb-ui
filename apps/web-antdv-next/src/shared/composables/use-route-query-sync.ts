/**
 * Reactive `?entity=<kind>&id=<id>` deep-link → detail drawer binding.
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
import { queryEntityIdMatches } from '#/shared/routes/execution-plane';

export interface QueryEntityDrawerOptions<T> {
  /** Closed entity discriminator for this drawer. */
  entity: string;
  /** Fetch the authoritative entity for the deep-linked id. */
  fetch: (id: string) => Promise<null | T>;
  /** Open the drawer with the fetched entity (page-specific `setData`). */
  open: (entity: T) => void;
  /** Toast when the entity is missing; defaults to `page.common.deepLinkNotFound`. */
  notFoundMessage?: string;
}

/** Open a detail drawer reactively from a canonical workspace deep link. */
export function useQueryEntityDrawer<T>(
  options: QueryEntityDrawerOptions<T>,
): void {
  const route = useRoute();
  const { handleRequest } = useRequestHandler();

  watch(
    () => [route.query.entity, route.query.id] as const,
    async ([entityRaw, raw]) => {
      const entityKind = Array.isArray(entityRaw) ? entityRaw[0] : entityRaw;
      const openId = Array.isArray(raw) ? raw[0] : raw;
      if (
        entityKind !== options.entity ||
        typeof openId !== 'string' ||
        openId === ''
      ) {
        return;
      }
      const result = await handleRequest(() => options.fetch(openId), {
        silent: true,
      });
      if (
        !queryEntityIdMatches(
          options.entity,
          openId,
          route.query.entity,
          route.query.id,
        )
      ) {
        return;
      }
      if (result) {
        options.open(result);
        return;
      }
      message.warning(
        options.notFoundMessage ?? $t('page.common.deepLinkNotFound'),
      );
    },
    { immediate: true },
  );
}
