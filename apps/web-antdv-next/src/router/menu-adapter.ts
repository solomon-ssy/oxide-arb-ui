import type { MenuTreeNode, RouteRecordStringComponent } from '@vben/types';

import { listIcons } from '@vben/icons';

export interface MenuAdaptResult {
  permissionCodes: string[];
  routes: RouteRecordStringComponent[];
}

const ENABLED = 'enabled';
const FALLBACK_MENU_ICON = 'lucide:circle-help';

/**
 * Catalog pages deep-link via ephemeral query params (`?open=`, `?train=`). Use
 * path-only tab/component keys so stripping those params after handoff does not
 * remount the page (which would tear down connected modals mid-open).
 */
const PATH_KEY_ROUTE_NAMES = new Set([
  'execution-orders',
  'positions',
  'reconciliations',
  'research-backtests',
  'research-calibration-artifacts',
  'research-datasets',
  'research-domain-sources',
  'research-factors',
  'research-feature-integrity',
  'research-feedback',
  'research-jobs',
  'research-market-linkages',
  'research-model-specs',
  'research-models',
  'research-trade-policies',
  'settlement-redeems',
]);

function collectPermissionCode(
  code: null | string | undefined,
  bucket: Set<string>,
) {
  if (code) {
    bucket.add(code);
  }
}

function adaptNodes(
  nodes: MenuTreeNode[],
  permissionCodes: Set<string>,
  registeredIcons: Set<string>,
): RouteRecordStringComponent[] {
  const routes: RouteRecordStringComponent[] = [];

  for (const node of nodes) {
    if (node.status !== ENABLED) {
      continue;
    }

    if (node.kind === 'button') {
      collectPermissionCode(node.permission_code, permissionCodes);
      continue;
    }

    if (node.kind === 'directory') {
      const children = adaptNodes(
        node.children ?? [],
        permissionCodes,
        registeredIcons,
      );
      if (children.length === 0) {
        continue;
      }
      routes.push({
        children,
        component: 'BasicLayout',
        meta: {
          icon: resolveMenuIcon(node.icon, registeredIcons),
          order: node.sort,
          title: node.title,
        },
        name: node.name,
        path: `/${node.name}`,
      });
      continue;
    }

    if (node.kind === 'menu') {
      collectPermissionCode(node.permission_code, permissionCodes);

      const childRoutes = adaptNodes(
        node.children ?? [],
        permissionCodes,
        registeredIcons,
      );

      routes.push({
        children: childRoutes.length > 0 ? childRoutes : undefined,
        component: node.component ?? '',
        meta: {
          affixTab: node.affix_tab,
          fullPathKey: PATH_KEY_ROUTE_NAMES.has(node.name) ? false : undefined,
          hideInMenu: node.hide_in_menu,
          icon: resolveMenuIcon(node.icon, registeredIcons),
          keepAlive: node.keep_alive,
          order: node.sort,
          title: node.title,
        },
        name: node.name,
        path: node.path ?? `/${node.name}`,
      });
    }
  }

  return routes;
}

/** Convert backend menu tree into vben backend routes and permission codes. */
export function adaptMenuTree(nodes: MenuTreeNode[]): MenuAdaptResult {
  const permissionCodes = new Set<string>();
  const routes = adaptNodes(nodes, permissionCodes, new Set(listIcons()));
  return {
    permissionCodes: [...permissionCodes],
    routes,
  };
}

function resolveMenuIcon(
  icon: null | string | undefined,
  registeredIcons: Set<string>,
) {
  if (!icon) {
    return undefined;
  }
  return registeredIcons.has(icon) ? icon : FALLBACK_MENU_ICON;
}
