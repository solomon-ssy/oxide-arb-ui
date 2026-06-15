import type { MenuTreeNode, RouteRecordStringComponent } from '@vben/types';

export interface MenuAdaptResult {
  permissionCodes: string[];
  routes: RouteRecordStringComponent[];
}

const ENABLED = 'enabled';

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
      const children = adaptNodes(node.children ?? [], permissionCodes);
      if (children.length === 0) {
        continue;
      }
      routes.push({
        children,
        component: 'BasicLayout',
        meta: {
          icon: node.icon ?? undefined,
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

      const childRoutes = adaptNodes(node.children ?? [], permissionCodes);

      routes.push({
        children: childRoutes.length > 0 ? childRoutes : undefined,
        component: node.component ?? '',
        meta: {
          affixTab: node.affix_tab,
          hideInMenu: node.hide_in_menu,
          icon: node.icon ?? undefined,
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
  const routes = adaptNodes(nodes, permissionCodes);
  return {
    permissionCodes: [...permissionCodes],
    routes,
  };
}
