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

describe('feature-integrity backend menu adaptation', () => {
  it('registers the real page route and governed permission without a button route', () => {
    const govern = node({
      kind: 'button',
      name: 'feature_integrity:govern',
      permission_code: 'materialization:create',
    });
    const page = node({
      children: [govern],
      component: 'research/feature-integrity/index',
      kind: 'menu',
      name: 'research-feature-integrity',
      path: '/research/feature-integrity',
      permission_code: 'materialization:read',
    });

    const result = adaptMenuTree([page]);

    expect(result.permissionCodes.toSorted()).toEqual([
      'materialization:create',
      'materialization:read',
    ]);
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({
      children: undefined,
      component: 'research/feature-integrity/index',
      meta: { fullPathKey: false },
      name: 'research-feature-integrity',
      path: '/research/feature-integrity',
    });
  });
});
