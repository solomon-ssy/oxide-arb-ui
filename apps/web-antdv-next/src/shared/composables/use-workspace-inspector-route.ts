import { watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useRequestHandler } from '@vben/request/qp';

import { message } from 'antdv-next';

import { $t } from '#/locales';
import { inspectorModule } from '#/shared/components/workspace/workspace-inspector-registry';

export interface WorkspaceInspectorRouteOptions<T> {
  close: () => void;
  entity: string;
  fetch: (id: string) => Promise<null | T>;
  open: (entity: T) => void;
  notFoundMessage?: string;
}

/**
 * Bind one typed workspace entity to the canonical `module/entity/id` route.
 *
 * Route navigation owns open/close history. The REST fetch remains authoritative,
 * stale responses are discarded, and missing entities are removed with replace so
 * a malformed deep link cannot remain as phantom browser history.
 */
export function useWorkspaceInspectorRoute<T>(
  options: WorkspaceInspectorRouteOptions<T>,
) {
  const route = useRoute();
  const router = useRouter();
  const { handleRequest } = useRequestHandler();
  let generation = 0;

  function isCurrent(id: string) {
    const entity = Array.isArray(route.query.entity)
      ? route.query.entity[0]
      : route.query.entity;
    const routeId = Array.isArray(route.query.id)
      ? route.query.id[0]
      : route.query.id;
    return entity === options.entity && routeId === id;
  }

  function cleanRoute(replace: boolean) {
    if (route.query.entity !== options.entity) return;
    const { entity: _entity, id: _id, ...query } = route.query;
    const navigation = { query };
    if (replace) {
      void router.replace(navigation);
    } else {
      void router.push(navigation);
    }
  }

  function onInspectorOpenChange(open: boolean) {
    if (!open) cleanRoute(false);
  }

  function openInspector(id: string) {
    const module = inspectorModule(route.path, options.entity);
    if (!module || id === '') return;
    void router.push({
      query: { ...route.query, entity: options.entity, id, module },
    });
  }

  watch(
    () => [route.query.entity, route.query.id] as const,
    async ([entityRaw, idRaw]) => {
      const entity = Array.isArray(entityRaw) ? entityRaw[0] : entityRaw;
      const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
      if (entity !== options.entity || typeof id !== 'string' || id === '') {
        generation += 1;
        options.close();
        return;
      }

      const currentGeneration = ++generation;
      const result = await handleRequest(() => options.fetch(id), {
        silent: true,
      });
      if (currentGeneration !== generation || !isCurrent(id)) return;
      if (result) {
        options.open(result);
        return;
      }

      message.warning(
        options.notFoundMessage ?? $t('page.common.deepLinkNotFound'),
      );
      options.close();
      cleanRoute(true);
    },
    { immediate: true },
  );

  return { onInspectorOpenChange, openInspector };
}
