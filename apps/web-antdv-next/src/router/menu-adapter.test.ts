import type { MenuTreeNode } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { adaptMenuTree } from './menu-adapter';

const createdAt = '2026-07-11T00:00:00.000Z';

function node(
  overrides: Partial<MenuTreeNode> & Pick<MenuTreeNode, 'kind' | 'name'>,
): MenuTreeNode {
  return {
    affix_tab: false,
    children: [],
    component: null,
    created_at: createdAt,
    hide_in_menu: false,
    icon: null,
    id: `01900000-0000-7000-8000-${overrides.name.padEnd(12, '0').slice(0, 12)}`,
    keep_alive: false,
    parent_id: null,
    path: null,
    permission_code: null,
    sort: 1,
    status: 'enabled',
    title: overrides.name,
    updated_at: createdAt,
    ...overrides,
  };
}

describe('workspace backend menu adaptation', () => {
  it('registers one workspace route and collects action permissions', () => {
    const publish = node({
      kind: 'button',
      name: 'publication:publish',
      permission_code: 'publication:publish',
    });
    const page = node({
      children: [publish],
      component: 'research/lab/index',
      kind: 'menu',
      name: 'research-lab',
      path: '/research/lab',
      permission_code: 'materialization:read',
    });

    const result = adaptMenuTree([page]);

    expect(result.permissionCodes.toSorted()).toEqual([
      'materialization:read',
      'publication:publish',
    ]);
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({
      children: undefined,
      component: 'research/lab/index',
      meta: { fullPathKey: false },
      name: 'research-lab',
      path: '/research/lab',
    });
  });

  it('contains an unregistered backend icon without a runtime fetch', () => {
    const page = node({
      component: 'runtime/activity/index',
      icon: 'lucide:server-controlled-unknown',
      kind: 'menu',
      name: 'runtime-activity',
      path: '/runtime/activity',
      permission_code: 'system:read',
    });

    expect(adaptMenuTree([page]).routes[0]).toMatchObject({
      meta: { icon: 'lucide:circle-help' },
    });
  });

  it.each([
    ['market-intelligence', '/trading/market-intelligence'],
    ['recommendations', '/trading/recommendations'],
    ['execution-orders', '/execution/orders'],
    ['execution-portfolio', '/execution/portfolio'],
    ['execution-post-trade', '/execution/post-trade'],
    ['research-lab', '/research/lab'],
    ['research-learning-policy', '/research/learning-policy'],
    ['research-data-reliability', '/research/data-reliability'],
    ['runtime-activity', '/runtime/activity'],
    ['system-audit', '/system/audit'],
    ['system-config', '/system/config'],
  ])('keeps %s state in one path-keyed tab', (name, path) => {
    const page = node({
      component: `${name}/index`,
      kind: 'menu',
      name,
      path,
      permission_code: `${name}:read`,
    });

    expect(adaptMenuTree([page]).routes[0]).toMatchObject({
      meta: { fullPathKey: false },
      name,
      path,
    });
  });

  it('leaves the affixed dashboard on the default full-path tab contract', () => {
    const dashboard = node({
      affix_tab: true,
      component: 'dashboard/index',
      kind: 'menu',
      name: 'dashboard',
      path: '/dashboard',
    });

    expect(adaptMenuTree([dashboard]).routes[0]).toMatchObject({
      meta: { affixTab: true, fullPathKey: undefined },
    });
  });
});
